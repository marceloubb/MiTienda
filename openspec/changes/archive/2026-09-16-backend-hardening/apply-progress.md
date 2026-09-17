# Apply Progress: backend-hardening

**Status**: success — all 13 tasks complete (Phases 1-3 + task 4.1 final verification).
**Mode**: Standard (strict_tdd: false per openspec/config.yaml and testing-capabilities cache).
**Delivery**: Single PR (user-approved, ask-on-risk). See workload note below.

## Completed Tasks

- [x] 1.1 ReadOnlyModelViewSet on CartViewSet/OrderViewSet (405 on generic CRUD; custom actions kept)
- [x] 1.2 Atomic create_from_cart: transaction.atomic + select_for_update on cart/products + stock re-validation + total recomputed via F/Sum aggregate + cart cleared on success
- [x] 1.3 UpdateCartItemSerializer + shared _check_stock helper; update_item uses serializer validation
- [x] 2.1 IsStaffOrReadOnly on Category/Product viewsets (+403 pin for unauthenticated writes — deviation, see below)
- [x] 2.2 ProfileView.put via UpdateProfileSerializer; LogoutView.post via Token.objects.filter(user=...).delete()
- [x] 2.3 UpdateProfileSerializer (flat, allow_blank=True, save() updates User then Profile)
- [x] 2.4 ImproperlyConfigured guard at end of settings.py (DEBUG=False + placeholder SECRET_KEY)
- [x] 3.1 OrderHardeningTests (6 tests: 405 lockdown orders+cart, bare POST 405, atomic success, stock rollback, total recomputation)
- [x] 3.2 CartItemUpdateTests (4 tests: valid update, below-min, non-numeric, above-stock)
- [x] 3.3 StaffOrReadOnlyTests (6 tests: non-staff/unauthenticated/staff writes, anon read, category writes)
- [x] 3.4 ProfileUpdateTests + LogoutTests (5 tests)
- [x] 3.5 SettingsGuardTests in new backend/mitienda/tests.py (3 tests via importlib.reload + mock env)
- [x] 4.1 Full suite green

## Work Unit Evidence

| Unit | Focused test command + exact result | Runtime harness | Rollback boundary |
|------|-------------------------------------|-----------------|-------------------|
| 1 (order-integrity) | `.venv\Scripts\python.exe manage.py test orders` → "Ran 10 tests in 7.238s; OK" | N/A — unit + integration only; no runtime boundary exists | `backend/orders/views.py`, `backend/orders/serializers.py` (commit f5b4499) |
| 2 (staff/profile/env) | `.venv\Scripts\python.exe manage.py test products users mitienda` → "Ran 14 tests in 5.857s; OK" | N/A — unit + integration only | `backend/products/views.py`, `backend/users/views.py`, `backend/users/serializers.py`, `backend/mitienda/settings.py` (commit dfb2f48) |
| 3 (regression tests) | `.venv\Scripts\python.exe manage.py test -v2` → "Ran 24 tests in 11.493s; OK" | N/A — unit + integration only | 4 test files (commit a0c6bec) |

## Commits (main, conventional, no AI attribution)

- `f5b4499` feat(orders): read-only order/cart surfaces and atomic checkout (155 changed lines)
- `dfb2f48` feat(backend): staff-only product writes, validated profile update, env guard (82 changed lines)
- `a0c6bec` test(backend): cover hardening changes with regression tests (386 changed lines)
- SDD process artifacts (openspec/changes/, openspec/config.yaml) intentionally NOT committed.

## Final Verification

1. `.venv\Scripts\python.exe manage.py check` → "System check identified no issues (0 silenced)."
2. `.venv\Scripts\python.exe manage.py test -v2` (backend/) → "Ran 24 tests in 11.493s; OK" (green on second run after 1 spec-semantics fix, within bounded attempt budget)
3. `git status --short` → only openspec/ artifacts remain modified/untracked; all backend work committed
4. tasks.md checkboxes: all 13 tasks marked [x]

## Deviations from Design (all spec-driven, documented in tasks.md)

1. **IsStaffOrReadOnly is NOT in DRF core** (verified against installed DRF: only IsAuthenticatedOrReadOnly + DjangoModelPermissionsOrAnonReadOnly exist). Tasks 2.1 assumed `from rest_framework.permissions import IsStaffOrReadOnly`, which would crash at import. Implemented a local `IsStaffOrReadOnly(BasePermission)` in `backend/products/views.py` (SAFE_METHODS → allow; else user.is_staff).
2. **Unauthenticated writes → 403 per spec**: DRF's `APIView.permission_denied` raises NotAuthenticated (401) when authenticators are configured and none succeeded, even on permission denial. Spec staff-or-read-only scenario demands 403. Added `StaffWriteDeniedViewMixin.permission_denied` forcing PermissionDenied (403) on Category/Product viewsets. Security intent (deny writes) preserved either way; 403 chosen to match spec.
3. **`_check_stock` robustness**: design snippet raised only on stock; added DoesNotExist → ValidationError("Producto no disponible") so inactive/missing products produce a clean 400 instead of a 500.
4. **update_item no longer deletes cart items on quantity <= 0** — spec requires 0 → 400 (min_value=1), replacing the old delete branch.
5. **UpdateProfileSerializer.save uses `if field in data`** (design used direct indexing) — required=False means omitted fields may be absent; omitted fields now keep current values while blank strings still clear.

## Workload / PR Boundary

- Forecast in tasks.md: ~295 lines. **Actual: 623 changed lines (541 insertions + 82 deletions)** — production ~237, tests ~386.
- Tests overshot the ~150-200 line estimate ~2x: the suite covers every spec scenario (15+ scenarios, 24 tests, 4 files). orders/views.py diff inflated by create_from_cart restructure. NO code-golf applied (nothing deleted/compressed to fit budget, per skill rule).
- **Resolution: maintainer-approved Single PR with `size:exception` (623 > 400)** — approved 2026-09-16 by user via interactive gate.

## Rollback

- Each commit independently revertible: `git revert f5b4499` removes order hardening only; `dfb2f48` removes staff/profile/env changes; `a0c6bec` removes tests. No migrations, no schema changes, no new dependencies (except stdlib `unittest.mock` in tests).