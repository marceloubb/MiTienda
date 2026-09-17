# Archive Report: backend-hardening

**Status**: archived — change complete (13/13 tasks, verify PASS, no remediation required).
**Date**: 2026-09-16
**Archiver**: sdd-archive (final-state authority: the archive report describes the change AT CLOSE)
**Archived to**: `openspec/changes/archive/2026-09-16-backend-hardening/`

## Native Status at Archive Time

Native `gentle-ai.sdd-status` v2 (2026-09-16):

- `dependencies.archive`: ready; `nextRecommended`: archive; `applyState`: all_done
- `taskProgress`: 13/13 completed, `allComplete: true`
- `blockedReasons`: []
- `notes`: []
- `artifacts`: proposal/specs/design/tasks/applyProgress/verifyReport all `done`
- `actionContext`: repo-local, allowedEditRoots = MiTienda (archive operations stayed inside)

**Task Completion Gate passed**: persisted `tasks.md` shows all 13 implementation tasks `[x]` (verified both before the move and in the archived copy — no stale unchecked tasks). No archive-time reconciliation was needed.

**Verification gate passed**: `verify-report.md` carries the native `gentle-ai.verify-result/v1` envelope — validated `valid: true`, `verdict: pass`, 0 blockers, 0 critical findings, 8/8 requirements, 25/25 scenarios (rewritten 2026-09-16). No CRITICAL issues exist; nothing blocks archive.

## Final-State Facts vs. Snapshots

Per the final-state authority hierarchy, facts at close outrank intermediate artifacts. Snapshot-derived claims are attributed below; nothing in `apply-progress.md` or `verify-report.md` conflicts with the final state — both describe the same completed work, and the later native-envelope rewrite of `verify-report.md` is the authoritative verification record.

- `verify-report.md` was rewritten with the native envelope and validated `valid: true, verdict: pass` on 2026-09-16. Its 2 non-blocking drift suggestions are carried into this report (see Drift Findings) per instructions.
- Test/build numbers quoted in this report are the verification-time numbers from the validated `verify-report.md` envelope (test output hash `sha256:7ba5b9d4...`, build output hash `sha256:f87ceb15...`); no later work changed them.

## Summary

`backend-hardening` hardened the DRF backend at `backend/` (Django 6.1.1 / DRF / SQLite; frontend untouched — verified zero impact). Before: any authenticated user could write orders/cart/products/categories via full ModelViewSets; checkout was non-atomic; `PUT /profile` bypassed serializers; logout swallowed all exceptions; settings were hardcoded. After: order/cart generic writes return 405 with atomic transactional checkout and stock re-validation; product/category writes are staff-only (403 otherwise); profile updates run through a validated flat serializer; logout is idempotent; production startup fails fast with `ImproperlyConfigured` on the placeholder SECRET_KEY. 24 regression tests cover all 8 requirements / 25 scenarios; full suite green.

## What Was Delivered

### Capabilities (4 specs → main specs, 8 requirements, 25 scenarios)

| Capability | Spec (domain) | Reqs | Scenarios | Effect |
|---|---|---|---|---|
| order-integrity | `openspec/specs/order-integrity/spec.md` | 3 | 11 | Read-only order/cart surfaces (405 on generic CRUD, bare POST rejected; `create_from_cart` only); atomic checkout with `transaction.atomic()` + `select_for_update()` + stock re-validation + total recomputed; `UpdateCartItemSerializer` (min_value=1, stock check) |
| staff-or-read-only | `openspec/specs/staff-or-read-only/spec.md` | 2 | 6 | Products/categories writes restricted to staff; unauthenticated reads allowed; 403 pinned for denied writes |
| profile-update | `openspec/specs/profile-update/spec.md` | 2 | 5 | Flat `UpdateProfileSerializer` for `PUT /api/profile/` (empty string clears fields, invalid email → 400); idempotent logout (`Token.objects.filter(user=...).delete()`) |
| env-settings | `openspec/specs/env-settings/spec.md` | 1 | 3 | `ImproperlyConfigured` raised on startup when `DEBUG=False` + placeholder `SECRET_KEY`; dev-safe defaults otherwise |

### Source Changes (3 conventional commits on `main`, no AI attribution)

| Commit | Message | Files | Changed lines |
|---|---|---|---|
| `f5b4499de440f8de2024e4563b91127ff821493f` | feat(orders): read-only order/cart surfaces and atomic checkout | `backend/orders/views.py` (132), `backend/orders/serializers.py` (23) | 155 |
| `dfb2f48d26f45251b08a0819cfdee5ff7640bf56` | feat(backend): staff-only product writes, validated profile update, env guard | `backend/products/views.py` (23), `backend/users/views.py` (26), `backend/users/serializers.py` (25), `backend/mitienda/settings.py` (8) | 82 |
| `a0c6bec3b9b27f9147ca49a2c37488639fcd8a5c` | test(backend): cover hardening changes with regression tests | `backend/orders/tests.py` (198), `backend/products/tests.py` (76), `backend/users/tests.py` (70) | 386 |

**Total: 623 changed lines (541 insertions + 82 deletions)** — production ~237, tests ~386 (incl. new `backend/mitienda/tests.py`). Design conformance: 9/9 files listed in `design.md` modified; the one new file is tasks-sanctioned (drift #1 below).

### Tests

- **Full suite**: `python manage.py test -v2` from `backend/` → `Ran 24 tests in 11.463s; OK`, EXIT_CODE=0 (per validated `verify-report.md`, 2026-09-16). Output hash `sha256:7ba5b9d4630b2fa012f03de3270ad43a686e0941e77af8cc91439b3865e1bbd2`.
- **Build check**: `python manage.py check` → `System check identified no issues (0 silenced).`, EXIT_CODE=0. Output hash `sha256:f87ceb15410bde28ff826ce26228e0576558258fa64d145847921a593a61ee63`.
- Test files: `backend/orders/tests.py` (OrderHardeningTests 6, CartItemUpdateTests 4), `backend/products/tests.py` (StaffOrReadOnlyTests 6), `backend/users/tests.py` (ProfileUpdateTests + LogoutTests 5), `backend/mitienda/tests.py` (SettingsGuardTests 3 — new file).
- Coverage per spec: order-integrity 11/11, staff-or-read-only 6/6, profile-update 5/5, env-settings 3/3 scenarios.

## Deviations from Design (all documented at apply/verify time, code-verified)

1. **IsStaffOrReadOnly implemented locally** in `backend/products/views.py` — DRF ships no such built-in (verified against installed DRF core; only `IsAuthenticatedOrReadOnly` + `DjangoModelPermissionsOrAnonReadOnly` exist); tasks.md:2.1's import would have crashed.
2. **403 pinned for unauthenticated writes** via `StaffWriteDeniedViewMixin.permission_denied` — DRF defaults to 401 when authenticators are configured; spec staff-or-read-only demands 403.
3. **`_check_stock` handles DoesNotExist** → `ValidationError("Producto no disponible")` — inactive/missing products yield a clean 400 instead of 500.
4. **`update_item` quantity <= 0 → 400** (min_value=1) — replaced the old delete-on-zero branch (spec-driven).
5. **`UpdateProfileSerializer.save()` uses `if field in data`** — `required=False` means omitted fields may be absent; omitted fields keep current values while blank strings still clear.

## Drift Findings (non-blocking suggestions carried from verify-report)

1. **suggestion**: New file `backend/mitienda/tests.py` was added although `design.md:109` states "No new files created" — explicitly sanctioned by tasks.md task 3.5; tasks win. Informational only.
2. **suggestion**: `UpdateCartItemSerializer.validate_quantity` guards `_check_stock` with `isinstance(product_id, int)` and `not isinstance(product_id, bool)` (`backend/orders/serializers.py:47-51`) vs. the design snippet's unconditional call — robustness enhancement producing a clean 400 instead of a 500. Not documented in apply-progress; recorded here for the audit trail.

No critical drift. No CRITICAL findings in verify-report.

## Workload / PR Decision

- Forecast (tasks.md): ~295 changed lines. **Actual: 623 lines (541 insertions + 82 deletions)** — tests overshot the ~150-200 line estimate ~2x because the suite covers every spec scenario across 4 files, and the `create_from_cart` restructure inflated `orders/views.py`. No code-golf applied.
- **Resolution**: maintainer-approved **Single PR with `size:exception`** (623 > 400-line review budget) — approved 2026-09-16 by the user via the interactive ask-on-risk gate.
- SDD process artifacts (`openspec/`) remain intentionally **uncommitted** per repo policy; commit hashes above are the shipped source of truth on `main`.

## Rollback Notes

- Each commit is independently revertible with `git revert` in order: `a0c6bec` (tests) → `dfb2f48` (staff/profile/env) → `f5b4499` (orders) for a full reversal; reverting `f5b4499` alone removes only the order hardening.
- No migrations, no schema changes, no new runtime dependencies (only stdlib `os`; `unittest.mock` in tests).
- Original pre-implementation note (proposal): repo had no git at proposal time; touched files were backed up to `%TEMP%\mitienda-backup-<date>` before apply. The repo is now git-based (commits f5b4499/dfb2f48/a0c6bec on `main`); a remote origin does not exist yet — see follow-ups.

## Follow-ups (all recorded, none blocking)

| # | Follow-up | Context |
|---|---|---|
| 1 | **Postgres migration**: `select_for_update()` becomes effective (real row locks) | SQLite no-op documented in proposal; `atomic()` single-writer lock covers today |
| 2 | **Factories + CI test infrastructure** | Out of scope (proposal); suites use raw `TestCase` + DRF `APIClient` |
| 3 | **Multi-device logout / token revocation** | Out of scope (proposal); logout deletes only the request user's token |
| 4 | **payment_method enum validation** | Out of scope (proposal); still free-form in serializers |
| 5 | **Frontend: react-query migration + remove eslint override** | Out of scope (proposal); frontend verified zero impact |
| 6 | **Superuser staff flag check** | Local admin must be created with `staff=True` (`createsuperuser` sets it by default); verify before relying on staff writes |
| 7 | **Remote git origin** | Repo has `main` history but no remote; delivery/PR requires one |

## Specs Synced (delta → main, all first versions — project had no prior specs)

| Domain | Action | Main spec |
|---|---|---|
| order-integrity | Created (full spec, 3 reqs / 11 scenarios) | `openspec/specs/order-integrity/spec.md` |
| staff-or-read-only | Created (full spec, 2 reqs / 6 scenarios) | `openspec/specs/staff-or-read-only/spec.md` |
| profile-update | Created (full spec, 2 reqs / 5 scenarios) | `openspec/specs/profile-update/spec.md` |
| env-settings | Created (full spec, 1 req / 3 scenarios) | `openspec/specs/env-settings/spec.md` |

`openspec/specs/` did not exist before this archive; each delta spec IS a full spec and was copied mechanically (cp → temp, `diff -r` empty readback, mv). No `sdd-archive-compose` merge was required (no main spec to compose against), per the OpenSpec convention.

## Mechanical Copy Evidence

- Step 2 (specs): per-domain `diff -r <delta-source> <temp-copy>` — **all empty** (verbatim output captured in phase result).
- Step 3 (folder move): `git mv` failed (source untracked — `openspec/changes/` is untracked), fallback verified source byte-identity against the pre-move snapshot (empty diff) and used plain `mv`; final `diff -r <snapshot> <destination>` — **empty** (verbatim output captured in phase result: `ARCHIVE MOVE OK`).
- `archive-report.md` is additive and excluded from the comparison (did not exist in the source snapshot).

## Traceability

**Disk artifacts (archived)**: `proposal.md`, `specs/{order-integrity,staff-or-read-only,profile-update,env-settings}/spec.md`, `design.md`, `tasks.md` (13/13 [x]), `apply-progress.md`, `verify-report.md` (native envelope, pass), `archive-report.md` (this file).

**Engram observations (project `mitienda`, all read/traced for this archive)**:

| ID | Topic key | Written |
|---|---|---|
| #5 | sdd/backend-hardening/explore | 2026-09-16 09:31 |
| #6 | sdd/backend-hardening/proposal | 2026-09-16 09:36 |
| #14 | sdd/backend-hardening/spec | 2026-09-16 12:41 |
| #15 | sdd/backend-hardening/design | 2026-09-16 13:41 |
| #16 | sdd/backend-hardening/tasks | 2026-09-16 13:44 |
| #17 | sdd/backend-hardening/apply-progress | 2026-09-16 14:02 |
| #18 | sdd/backend-hardening/verify-report | 2026-09-16 14:18 |
| (new) | sdd/backend-hardening/archive-report | 2026-09-16 (this archive) |

## Residual Risks

- `select_for_update()` is a no-op on SQLite (documented proposal risk); `transaction.atomic()` single-writer protection covers SQLite; Postgres follow-up recorded (#1).
- Profile/logout spec shorthand (`/api/profile/`, `/api/logout/`) vs. registered routes (`/api/users/profile/`, `/api/users/logout/`, urls.py:33) — same views, tests exercise real routes; naming note only.

## Verdict

**ARCHIVED.** SDD cycle complete: planned, specified, designed, implemented (13/13), independently verified (8/8 reqs, 25/25 scenarios, 24 tests green, native envelope `valid: true, verdict: pass`), delivered (Single PR + size:exception, 3 conventional commits on `main`), and archived (specs synced to `openspec/specs/`, change folder moved to `openspec/changes/archive/2026-09-16-backend-hardening/`). Ready for the next change.