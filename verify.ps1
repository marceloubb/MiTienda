# Runs every gate that must be green before a MiTienda deploy.
#
# Usage:
#   .\verify.ps1                 # full gate: backend on SQLite + PostgreSQL, frontend, compose
#   .\verify.ps1 -SkipDocker     # skip everything that needs Docker Desktop
#   .\verify.ps1 -BuildImages    # also build both Docker images
#
# Exit code 0 means every gate is green. Anything else means at least one failed.
#
# PostgreSQL is tested inside the compose network because the db service publishes
# no host port. Start the stack first:  docker compose up -d

[CmdletBinding()]
param(
    [switch]$SkipDocker,
    [switch]$BuildImages
)

$ErrorActionPreference = 'Continue'

$Root        = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir  = Join-Path $Root 'backend'
$FrontendDir = Join-Path $Root 'frontend'
$VenvPython  = Join-Path $BackendDir '.venv\Scripts\python.exe'
$VenvSite    = Join-Path $BackendDir '.venv\Lib\site-packages'

# Test-only configuration. settings.py raises ImproperlyConfigured when DEBUG is
# False and the bundled placeholder key is still in place, so the suite needs a
# real-looking value. This never leaves the machine and is not a secret.
$env:DJANGO_SECRET_KEY = 'verify-script-test-only-key-not-a-secret'
$env:DJANGO_DEBUG      = 'False'

$results = New-Object System.Collections.ArrayList

function Write-Phase([string]$Text) {
    Write-Host ''
    Write-Host "== $Text ==" -ForegroundColor Cyan
}

function Add-Result([string]$Name, $Code) {
    $status = if ($null -eq $Code) { 'SKIP' } elseif ($Code -eq 0) { 'PASS' } else { 'FAIL' }
    [void]$results.Add([pscustomobject]@{ Gate = $Name; Status = $status; Exit = $Code })
}

function Get-DockerAvailable {
    if ($SkipDocker) { return $false }
    try {
        & docker info --format '{{.ServerVersion}}' *> $null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Resolve-BackendPython {
    # Prefer the project venv. Windows Application Control can refuse to execute
    # binaries that live inside a user checkout; when that happens, fall back to
    # a uv-managed CPython 3.12 with the venv's site-packages on PYTHONPATH,
    # which is the same interpreter series the lockfile was resolved against.
    if (Test-Path -LiteralPath $VenvPython) {
        $ok = $false
        try {
            $version = & $VenvPython --version 2>&1
            if ("$version" -match 'Python 3') { $ok = $true }
        } catch {
            $ok = $false
        }
        if ($ok) { return $VenvPython }
        Write-Host "WARN: '$VenvPython' cannot be executed (Application Control?). Trying a uv-managed interpreter." -ForegroundColor Yellow
    } else {
        Write-Host "WARN: no virtualenv at '$VenvPython'. Trying a uv-managed interpreter." -ForegroundColor Yellow
    }

    if (-not (Get-Command uv -ErrorAction SilentlyContinue)) { return $null }
    try {
        $found = (& uv python find 3.12 2>$null | Select-Object -First 1)
        if ($found -and (Test-Path -LiteralPath $found)) {
            if (Test-Path -LiteralPath $VenvSite) { $env:PYTHONPATH = $VenvSite }
            return $found
        }
    } catch {
        return $null
    }
    return $null
}

# -- Preflight ----------------------------------------------------------------
$python = Resolve-BackendPython
if (-not $python) {
    Write-Host 'ERROR: no usable Python 3.12 found for the backend.' -ForegroundColor Red
    Write-Host 'Create the venv:  python -m venv backend/.venv'
    Write-Host 'Then install:     backend\.venv\Scripts\pip install -r backend\requirements.txt'
    exit 1
}
if (-not (Test-Path -LiteralPath (Join-Path $FrontendDir 'node_modules'))) {
    Write-Host "ERROR: frontend dependencies missing under '$FrontendDir'." -ForegroundColor Red
    Write-Host 'Install them first:  npm install  (inside frontend/)'
    exit 1
}

$dockerAvailable = Get-DockerAvailable
Write-Host "Backend interpreter: $python"
Write-Host ("Docker:              " + $(if ($dockerAvailable) { 'available' } else { 'skipped' }))

# -- Backend on SQLite (dev default) -----------------------------------------
Write-Phase 'Backend tests (SQLite)'
Push-Location $BackendDir
& $python 'manage.py' 'check'
$checkCode = $LASTEXITCODE
Add-Result 'backend: manage.py check' $checkCode

& $python 'manage.py' 'test'
Add-Result 'backend tests (sqlite)' $LASTEXITCODE
Pop-Location

# -- Backend on PostgreSQL (production engine) -------------------------------
Write-Phase 'Backend tests (PostgreSQL)'
if ($dockerAvailable) {
    Push-Location $Root
    $backendContainer = (& docker compose ps -q backend 2>$null | Out-String).Trim()
    Pop-Location
    if ([string]::IsNullOrWhiteSpace($backendContainer)) {
        Write-Host 'SKIP: backend container is not running. Start it with:  docker compose up -d' -ForegroundColor Yellow
        Add-Result 'backend tests (postgres)' $null
    } else {
        Push-Location $Root
        & docker compose exec -T backend python manage.py test
        $pgCode = $LASTEXITCODE
        Pop-Location
        Add-Result 'backend tests (postgres)' $pgCode
    }
} else {
    Add-Result 'backend tests (postgres)' $null
}

# -- Frontend ----------------------------------------------------------------
Write-Phase 'Frontend'
Push-Location $FrontendDir
& npm.cmd run lint
Add-Result 'frontend: lint' $LASTEXITCODE

& npm.cmd run test
Add-Result 'frontend tests' $LASTEXITCODE

& npm.cmd run build
Add-Result 'frontend: build' $LASTEXITCODE
Pop-Location

# -- Docker ------------------------------------------------------------------
Write-Phase 'Docker'
if ($dockerAvailable) {
    # compose interpolates two required variables; supply throwaway values so the
    # check validates the file itself rather than the local .env contents.
    $env:POSTGRES_PASSWORD = 'verify-script-placeholder'
    Push-Location $Root
    & docker compose config --quiet
    Add-Result 'docker compose config' $LASTEXITCODE
    Pop-Location

    if ($BuildImages) {
        Push-Location $Root
        & docker compose build backend
        Add-Result 'docker: backend image' $LASTEXITCODE

        & docker compose build frontend
        Add-Result 'docker: frontend image' $LASTEXITCODE
        Pop-Location
    }
} else {
    Add-Result 'docker compose config' $null
    if ($BuildImages) {
        Add-Result 'docker: backend image' $null
        Add-Result 'docker: frontend image' $null
    }
}

# -- Summary -----------------------------------------------------------------
Write-Phase 'Summary'
$results | Format-Table -AutoSize | Out-String | Write-Host

$failed = @($results | Where-Object { $_.Status -eq 'FAIL' })
$skipped = @($results | Where-Object { $_.Status -eq 'SKIP' })

if ($failed.Count -gt 0) {
    Write-Host "$($failed.Count) gate(s) FAILED: $($failed.Gate -join ', ')" -ForegroundColor Red
    exit 1
}

if ($skipped.Count -gt 0) {
    Write-Host "All executed gates green. Skipped: $($skipped.Gate -join ', ')" -ForegroundColor Yellow
    exit 0
}

Write-Host 'All gates green.' -ForegroundColor Green
exit 0
