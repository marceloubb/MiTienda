# Archive Report: security-hardening

**Status**: archived — change complete (18/18 tasks, verify PASS, 0 remediation required)
**Date**: 2026-09-17
**Archiver**: sdd-archive (final-state authority: this report describes the change AT CLOSE, not at earlier snapshot times)
**Archived to**: `openspec/changes/archive/2026-09-17-security-hardening/`
**Artifact store**: hybrid (openspec filesystem + Engram mirror)

## Change Summary

Security hardening of the MiTienda storefront: H1–H12 backend findings + F1–F3 frontend findings from the 2026-09-17 security audit (Engram obs #64). Delivered: DEBUG default `False` + fail-fast guard, env-gated secure block, `CORS_ALLOW_CREDENTIALS=False`, password validators on register/staff-create, scoped throttles (register 5/h, login + token_refresh 10/min), token lifecycle (24h TTL, rotation on login/register, refresh endpoint, scoped logout), TOTP 2FA (enroll/confirm + per-request `X-TOTP` gate, default off), email uniqueness (exclude-self serializer + conditional DB constraint), env-driven admin URL + IP allowlist, role-based admin-only product/category writes (`role == ROLE_ADMIN`), cumulative cart stock checks + string `product_id` no bypass, PostgreSQL data store, nonce CSP + standard security headers + `poweredByHeader` off, frontend 401-retry-once + clear-token-only-on-auth-failure, deployment checklist. New deps only: `django-otp==1.7.2`, `psycopg[binary]`.

## Final Verification State (at close)

- **Verdict**: PASS — validator admitted `valid: true` (per orchestrator final-state fact; verify-report envelope `gentle-ai.verify-result/v1` verdict `pass`, 0 blockers, 0 critical findings)
- **Evidence revision**: `sha256:3b543ec0362e37e09d6ce54e48fb56feedb49632bffd0c7a9e584dade52fe50e`
- **Branch / HEAD**: `security-hardening/foundation` @ `52ad06b`
- **Requirements**: 33/33 (11 delta specs) | **Scenarios**: 68/68
- **Backend**: `manage.py test` → 148 tests OK in 195.3s (1 expected PG-gated skip without `DATABASE_URL`); `manage.py check` clean; `makemigrations --check --dry-run` clean
- **Frontend**: `npx next build` compiled successfully (Turbopack, TypeScript OK, Proxy confirmed, all-dynamic); ESLint 0 errors (4 pre-existing `no-img-element` warnings in untouched files)
- **Blockers / CRITICAL findings**: 0

## Coverage Counts (at close)

| Metric | Value |
|--------|-------|
| Tasks | 18/18 complete (`[x]` in archived tasks.md; 0 unchecked) |
| Requirements | 33/33 (11 specs) |
| Scenarios | 68/68 (56 backend runtime-passed + 10 frontend harness-verified + 2 postgres documented/gated by design with expected skip) |
| Backend tests | 148 OK (1 expected PG-gated skip) |
| Blockers / CRITICAL findings | 0 |

## Delivered Commit List

| PR | Content | Commits |
|----|---------|---------|
| PR 1 | Foundation (settings/admin/Postgres config) | `1c7e60d`, `97ae1be`, `3b0a775`, `2198047` |
| PR 2 | Auth (delivered as chained slices 2a–2d, see below) | `517a0e6`, `747573b`, `bfd55ab`, `80a1a67` |
| PR 3 | Orders/Products (role admin writes, cumulative stock) | `1f7b984`, `a1bce6f`, `f0f6e18` |
| PR 4 | Frontend + Deployment (401 retry, CSP/headers, docs) | `7c4218c`, `ca1941c`, `53fa132`, `852f9a0`, `52ad06b` |

16 commits total on branch `security-hardening/foundation`, HEAD `52ad06b`.

## PR 2 Maintainer Split Decision (ledger record)

During apply, the auth objective exceeded the 400-line review budget. The ledger was reset with actor `maintainer` and reason `maintainer split`, and PR 2 was delivered as four chained PR slices: **2a** password+throttle, **2b** token lifecycle, **2c** 2FA, **2d** email. This matches the tasks.md forecast ("Suggested split: PR 2 … maintainer-split into PR 2a password+throttle, PR 2b token lifecycle, PR 2c 2FA, PR 2d email") under delivery strategy `auto-chain`. PR 1, PR 3, and PR 4 each settled within budget.

## Spec Sync (delta → main specs)

| Domain | Action | Details |
|--------|--------|---------|
| env-settings | Composed (main spec existed) | +2 ADDED ("Env-Gated Secure Settings Block", "CORS Credentials Disabled"); 1 MODIFIED ("ImproperlyConfigured Guard" — DEBUG default `False`, guard on unset); pre-existing requirement preserved |
| order-integrity | Composed (main spec existed) | +1 ADDED ("Cumulative Stock Check on Add Item"); 1 MODIFIED ("Cart Item Update Validation" — string `product_id` no stock bypass); 3 pre-existing requirements preserved |
| staff-or-read-only | Composed (main spec existed) | 2 RENAMED ("Staff-Only Product/Category Writes" → "Admin-Only Product/Category Writes") + 2 MODIFIED (`role == ROLE_ADMIN` is source of truth); requirement count unchanged at 2 |
| admin-access-control | Created (new main spec) | 2 requirements, byte-identical copy |
| api-throttling | Created (new main spec) | 2 requirements, byte-identical copy |
| email-uniqueness | Created (new main spec) | 2 requirements, byte-identical copy |
| password-policy | Created (new main spec) | 2 requirements, byte-identical copy |
| postgres-data-store | Created (new main spec) | 3 requirements, byte-identical copy |
| security-headers | Created (new main spec) | 5 requirements, byte-identical copy |
| token-lifecycle | Created (new main spec) | 6 requirements, byte-identical copy |
| two-factor-auth | Created (new main spec) | 2 requirements, byte-identical copy |

### Compose invocations (native composition, exit 0 = evidence)

```bash
gentle-ai sdd-archive-compose --canonical "openspec/specs/env-settings/spec.md" --delta "openspec/changes/security-hardening/specs/env-settings/spec.md" --output "openspec/specs/env-settings/spec.md.compose-tmp"   # exit 0
gentle-ai sdd-archive-compose --canonical "openspec/specs/order-integrity/spec.md" --delta "openspec/changes/security-hardening/specs/order-integrity/spec.md" --output "openspec/specs/order-integrity/spec.md.compose-tmp"   # exit 0
gentle-ai sdd-archive-compose --canonical "openspec/specs/staff-or-read-only/spec.md" --delta "openspec/changes/security-hardening/specs/staff-or-read-only/spec.md" --output "openspec/specs/staff-or-read-only/spec.md.compose-tmp"   # exit 0
```

Merged main specs verified: `env-settings` 1→3 requirements; `order-integrity` 4→5 (prior "Atomic Cancel with Stock Restore" and lock-down/checkout requirements intact); `staff-or-read-only` rename applied before MODIFIED (compose ordering), 2 requirements with admin naming.

### Mechanical copy readbacks (new domains, `diff -r` verbatim — only empty output passes)

```
DIFF[admin-access-control] exit=0 output=
DIFF[api-throttling] exit=0 output=
DIFF[email-uniqueness] exit=0 output=
DIFF[password-policy] exit=0 output=
DIFF[postgres-data-store] exit=0 output=
DIFF[security-headers] exit=0 output=
DIFF[token-lifecycle] exit=0 output=
DIFF[two-factor-auth] exit=0 output=
```

Each copy used temp-file + `cp` + `diff -r` + `mv`; no leftover `.compose-tmp` or `.spec.md.*` files remain.

## Archive Move Readback (verbatim)

`git mv` refused (change folder untracked — openspec artifacts are never committed in this repo; `fatal: source directory is empty`), fallback verified source unchanged vs pre-move snapshot, then plain `mv`:

```
FALLBACK_SOURCE_DIFF exit=0 output=          (snapshot vs source before plain mv — unchanged)
READBACK_DIFF exit=0                         (snapshot vs archived destination)
READBACK_OUTPUT_BEGIN
READBACK_OUTPUT_END                          (empty — byte-identical archive)
```

- [x] Main specs updated correctly (3 composed, 8 created)
- [x] Change folder moved to `openspec/changes/archive/2026-09-17-security-hardening/`
- [x] Archive contains all artifacts (proposal.md, specs/ ×11, design.md, tasks.md, verify-report.md, exploration.md, research.md)
- [x] Archived `tasks.md`: 18/18 `[x]`, 0 unchecked implementation tasks
- [x] Active `openspec/changes/` no longer contains this change (only `archive/`)
- [x] Verbatim `diff -r` readbacks above, all empty / exit 0

## Task Completion Gate

Passed before any sync/move: native SDD status reported `taskProgress` 18/18 `allComplete: true` and `dependencies.archive: ready`; persisted `tasks.md` showed 18/18 checked, 0 unchecked. No stale-checkbox reconciliation was needed.

## Remediation Status

0 remediation required (`remediationState.required: false`). Ledger history (recorded, non-blocking): the PR 2 auth objective exceeded the 400-line review budget during apply; the ledger was reset by actor `maintainer` with reason `maintainer split` and delivered as chained slices PR 2a–2d, each settling within budget. PR 1, PR 3, and PR 4 settled passed within budget. The whole-change verification passed on the final evidence revision (`sha256:3b543ec0…`, settle at HEAD `52ad06b`). No attempt evidence remains unremediated in the final chain.

## Residual Risks (recorded, do not block archive)

1. **Postgres concurrency test not executed against live PG**: `test_concurrent_checkout_does_not_oversell` is correctly gated `@skipUnless(DATABASE_URL postgres://)` and SKIPPED in the verification run (expected without a live `DATABASE_URL`); `select_for_update`-in-`atomic()` is source-verified at all four lock sites. Prove the race against Postgres before production cutover (per `docs/DEPLOYMENT.md`).
2. **`DJANGO_2FA_ENFORCED=True` breaks SPA sessions**: browser sessions from confirmed-device admins receive 401s without a fresh `X-TOTP` code (no frontend TOTP prompt — out of F-scope by design, documented in `docs/DEPLOYMENT.md`). Keep the gate off for SPA-only deployments until a TOTP prompt exists; default is off.
3. **`DATABASE_URL` scheme fallback**: a non-`postgres://` scheme (e.g. `postgresql://`) silently falls back to SQLite instead of erroring — operator must use the exact `postgres://` scheme (documented in `docs/DEPLOYMENT.md`).
4. **4 pre-existing `no-img-element` lint warnings**: in `app/cart/page.tsx`, `app/checkout/page.tsx`, `app/products/[id]/page.tsx`, `components/ProductCard.tsx` — all untouched by this change (frontend diff limited to `app/layout.tsx`, `lib/api.ts`, `lib/auth-context.tsx`, `next.config.ts`, `proxy.ts`).

## Traceability

Artifacts read (filesystem, openspec locators): `proposal.md`, `specs/{admin-access-control,api-throttling,email-uniqueness,env-settings,order-integrity,password-policy,postgres-data-store,security-headers,staff-or-read-only,token-lifecycle,two-factor-auth}/spec.md`, `design.md`, `tasks.md`, `verify-report.md`, plus prior archive example `openspec/changes/archive/2026-09-17-admin-inventory-roles/archive-report.md` and shared conventions (`sdd-phase-common.md`, `openspec-convention.md`, `sdd-status-contract.md`).

Engram mirror: archive report persisted as `sdd/security-hardening/archive-report` (observation #79, hybrid traceability).

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived. Ready for the next change.