# Starts the MiTienda dev servers (backend + frontend) in separate console windows.
# Usage: .\dev.ps1
# Backend  -> http://127.0.0.1:8000
# Frontend -> http://127.0.0.1:3000
# Each server runs in its own window; close that window (or press Ctrl+C inside it) to stop it.

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPython = Join-Path $Root 'backend\.venv\Scripts\python.exe'
$BackendDir    = Join-Path $Root 'backend'
$FrontendDir   = Join-Path $Root 'frontend'

# -- Preflight checks ---------------------------------------------------------
if (-not (Test-Path -LiteralPath $BackendPython)) {
    Write-Host "ERROR: Backend virtualenv not found at '$BackendPython'." -ForegroundColor Red
    Write-Host 'Create it first:  python -m venv backend/.venv  then  backend/.venv/Scripts/pip install -r backend/requirements.txt'
    exit 1
}
if (-not (Test-Path -LiteralPath (Join-Path $FrontendDir 'node_modules'))) {
    Write-Host "ERROR: Frontend dependencies not found under '$FrontendDir'." -ForegroundColor Red
    Write-Host 'Install them first:  npm install  (run inside the frontend/ folder)'
    exit 1
}

# -- Launch -------------------------------------------------------------------
Write-Host 'Starting MiTienda dev servers...' -ForegroundColor Cyan
Start-Process -FilePath $BackendPython -ArgumentList 'manage.py', 'runserver' -WorkingDirectory $BackendDir
Start-Process -FilePath 'npm.cmd' -ArgumentList 'run', 'dev' -WorkingDirectory $FrontendDir

Write-Host 'Backend  -> http://127.0.0.1:8000' -ForegroundColor Green
Write-Host 'Frontend -> http://127.0.0.1:3000' -ForegroundColor Green
Write-Host 'Each server runs in its own console window. Close a window to stop that server.'