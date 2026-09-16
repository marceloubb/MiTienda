```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:585c293c7f43c2846beb15eb7a66f9e8b0bbeeba0584acf638debce8fc3dd0a7
verdict: pass
blockers: 0
critical_findings: 0
requirements: 8/8
scenarios: 25/25
test_command: .venv\Scripts\python.exe manage.py test -v2
test_exit_code: 0
test_output_hash: sha256:7ba5b9d4630b2fa012f03de3270ad43a686e0941e77af8cc91439b3865e1bbd2
build_command: .venv\Scripts\python.exe manage.py check
build_exit_code: 0
build_output_hash: sha256:f87ceb15410bde28ff826ce26228e0576558258fa64d145847921a593a61ee63
```

# Verify Report: backend-hardening

**Status**: pass — fully verified.
**Date**: 2026-09-16
**Verifier**: sdd-verify (read-only; no source files modified) + orchestrator re-run (independent evidence)

## Summary

backend-hardening is fully verified. Full backend suite green: 24 tests, exit 0 (`Ran 24 tests in 11.463s; OK`). All 8 requirements / 25 scenarios across the four specs (order-integrity, staff-or-read-only, profile-update, env-settings) have a corresponding passing test. Design conformance holds: 9/9 files modified across 3 conventional commits (f5b4499, dfb2f48, a0c6bec), no AI attribution.

## Spec Conformance

| Spec | Verdict | Reqs | Scenarios |
|------|---------|------|-----------|
| order-integrity | pass | 3 | 11 |
| staff-or-read-only | pass | 2 | 6 |
| profile-update | pass | 2 | 5 |
| env-settings | pass | 1 | 3 |
| **Totals** | **pass** | **8** | **25** |

### Evidence highlights

- **Order and Cart Write Lockdown**: PUT/PATCH/DELETE on /api/orders/{id}/ and /api/cart/ -> 405 (ReadOnlyModelViewSet, orders/views.py:17,93); bare POST /api/orders/ -> 405. Tests orders/tests.py:62,70,74.
- **Atomic Checkout with Stock Re-validation**: transaction.atomic + select_for_update + stock re-check (orders/views.py:107); insufficient stock -> 400 with full rollback (tests.py:103-125); total recomputed via F/Sum aggregate (views.py:131-133, test 10x2+5x3=35.00).
- **Cart Item Update Validation**: UpdateCartItemSerializer min_value=1 + shared _check_stock (orders/serializers.py:38-51); valid update 200, qty 0 -> 400, non-numeric -> 400, above-stock -> 400.
- **Staff-Only Product/Category Writes**: local IsStaffOrReadOnly (products/views.py:12-16) + StaffWriteDeniedViewMixin pins 403 (views.py:19-23); non-staff write 403, unauth write 403, staff write 201, anon read 200.
- **Validated Profile Update**: UpdateProfileSerializer flat allow_blank (users/serializers.py:49-71); valid update 200, blank clears field, invalid email 400.
- **Idempotent Logout**: Token.objects.filter(user=...).delete() (users/views.py:64-65); with token 200 + deleted, without token 200.
- **ImproperlyConfigured Guard**: settings.py:173-176; DEBUG=False + placeholder SECRET_KEY -> ImproperlyConfigured; DEBUG=False + real key proceeds; DEBUG=True + placeholder proceeds. Tests mitienda/tests.py via importlib.reload + mock env.

## Test Results

Command: `.venv\Scripts\python.exe manage.py test -v2` (from backend/).

Output: `Ran 24 tests in 11.463s`, `OK`, `System check identified no issues (0 silenced)`, `Destroying test database...`. EXIT_CODE=0. Test output hash: sha256:7ba5b9d4630b2fa012f03de3270ad43a686e0941e77af8cc91439b3865e1bbd2.

## Build/Check Results

Command: `.venv\Scripts\python.exe manage.py check` (from backend/).

Output: `System check identified no issues (0 silenced).` EXIT_CODE=0. Build output hash: sha256:f87ceb15410bde28ff826ce26228e0576558258fa64d145847921a593a61ee63.

## Design Conformance

9/9 files listed in design.md modified:

| Commit | Files |
|--------|-------|
| f5b4499 | backend/orders/views.py (132), backend/orders/serializers.py (23) |
| dfb2f48 | backend/products/views.py (23), backend/users/views.py (26), backend/users/serializers.py (25), backend/mitienda/settings.py (8) |
| a0c6bec | backend/orders/tests.py (198), backend/products/tests.py (76), backend/users/tests.py (70) |

Notes: settings.py diff is exactly design-specified; load_dotenv was pre-existing (commits 5cc6ba2/1d7e2bb). 623 total changed lines matches apply-progress workload note; single PR with size:exception is user-approved.

## Drift Findings (non-blocking)

1. **suggestion**: New file backend/mitienda/tests.py added while design.md:109 states "No new files created" — sanctioned by tasks.md task 3.5 explicitly; tasks win. Informational.
2. **suggestion**: UpdateCartItemSerializer.validate_quantity guards _check_stock with isinstance(product_id, int) and not isinstance(product_id, bool) (orders/serializers.py:47-51) vs design snippet unconditional call — robustness enhancement, clean 400 instead of 500. Not documented in apply-progress; noted for archive.

No critical drift found.

## Expected Deviations Verified

1. IsStaffOrReadOnly implemented locally (DRF ships no such built-in — verified against installed DRF core).
2. permission_denied override pins 403 for unauthenticated writes (DRF defaults to 401 when authenticators exist).

Additional apply-documented deviations verified in code: _check_stock DoesNotExist -> ValidationError (orders/serializers.py:36-37); update_item quantity<=0 -> 400 via min_value=1 (orders/serializers.py:45); save() uses `if field in data` (users/serializers.py:62,68).

## Commits

- `f5b4499de440f8de2024e4563b91127ff821493f` feat(orders): read-only order/cart surfaces and atomic checkout (155)
- `dfb2f48d26f45251b08a0819cfdee5ff7640bf56` feat(backend): staff-only product writes, validated profile update, env guard (82)
- `a0c6bec3b9b27f9147ca49a2c37488639fcd8a5c` test(backend): cover hardening changes with regression tests (386)

3/3 conventional, no Co-Authored-By or AI attribution. SDD process artifacts (openspec/) intentionally uncommitted.

## Risks (residual)

- select_for_update() is a no-op on SQLite (documented proposal risk; atomic() single-writer protection covers; Postgres migration recorded as follow-up).
- profile/logout spec shorthand (/api/profile/, /api/logout/) vs registered routes (/api/users/profile/, /api/users/logout/, urls.py:33) — same views, tests exercise real routes; naming note only.

## Verdict

**PASS** — next_recommended: archive. No remediation work required.