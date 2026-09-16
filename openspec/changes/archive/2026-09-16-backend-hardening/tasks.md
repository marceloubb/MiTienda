# Tasks: Backend Hardening

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~295 (production ~170, tests ~125) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

> **Apply outcome note (2026-09-16)**: forecast underestimated the final diff. Actual authored change:
> **541 insertions + 82 deletions = 623 changed lines** (production ~237, tests ~386). Tests overshot the
> ~150-200 line estimate ~2x because the suite covers every spec scenario across 4 files, and the
> `create_from_cart` restructure inflates the orders/views.py diff. No code-golf applied. Single PR as
> user-approved requires a `size:exception` (623 > 400) or a test-file split into a second PR.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | order-integrity: ReadOnlyModelViewSet, atomic checkout, UpdateCartItemSerializer | PR 1 (includes Unit 2) | `.venv\Scripts\python.exe manage.py test orders -v2` | N/A — unit + integration only | `orders/views.py`, `orders/serializers.py` |
| 2 | staff-or-read-only + profile-update + env-settings guard | PR 1 | `.venv\Scripts\python.exe manage.py test products users mitienda -v2` | N/A — unit + integration only | `products/views.py`, `users/views.py`, `users/serializers.py`, `mitienda/settings.py` |

## Phase 1: order-integrity

- [x] 1.1 In `backend/orders/views.py`: add `from django.db import transaction` and `from django.db.models import F`. Swap `CartViewSet(viewsets.ModelViewSet)` → `CartViewSet(viewsets.ReadOnlyModelViewSet)`. Swap `OrderViewSet(viewsets.ModelViewSet)` → `OrderViewSet(viewsets.ReadOnlyModelViewSet)`. Satisfies spec **order-integrity / Order and Cart Write Lockdown** (405 on generic CRUD).
- [x] 1.2 In `backend/orders/views.py`: wrap `create_from_cart` body in `transaction.atomic()`. Inside: `select_for_update()` on cart + per-item products. Re-check stock for each cart item (return 400, no partial state). Recompute total from `F('price') * F('quantity')` via `cart.items.aggregate(...)`. Clear cart after order creation. Satisfies spec **order-integrity / Atomic Checkout with Stock Re-validation**.
- [x] 1.3 In `backend/orders/serializers.py`: add `_check_stock(product_id, quantity)` helper. Add `UpdateCartItemSerializer` with `product_id` (IntegerField), `quantity` (IntegerField, min_value=1), and `validate_quantity` calling `_check_stock`. Add `from products.models import Product` import. In `backend/orders/views.py`: replace `update_item` body to use `UpdateCartItemSerializer.is_valid()` instead of manual validation. Satisfies spec **order-integrity / Cart Item Update Validation**.

## Phase 2: staff-or-read-only + profile-update + env-settings

- [x] 2.1 In `backend/products/views.py`: add `from rest_framework.permissions import IsStaffOrReadOnly`. Add `permission_classes = [IsStaffOrReadOnly]` to `CategoryViewSet` and `ProductViewSet`. Satisfies spec **staff-or-read-only / Staff-Only Product Writes + Staff-Only Category Writes**. *(Deviation: DRF ships no `IsStaffOrReadOnly`; implemented locally in `products/views.py`. Also pinned 403 for unauthenticated writes via `permission_denied` override — DRF defaults to 401 when authenticators are configured.)*
- [x] 2.2 In `backend/users/views.py`: replace `ProfileView.put` body to instantiate `UpdateProfileSerializer(data=request.data)`, call `.is_valid()`, `.save(user=user)`. Replace `LogoutView.post` body with `Token.objects.filter(user=request.user).delete()`. Add serializer import. Satisfies spec **profile-update / Validated Profile Update + Idempotent Logout**.
- [x] 2.3 In `backend/users/serializers.py`: add `UpdateProfileSerializer(serializers.Serializer)` with fields `first_name`, `last_name`, `email`, `phone`, `address`, `city`, `postal_code` — all `required=False, allow_blank=True`. Add `save(user)` method updating User then Profile via `get_or_create`. Satisfies spec **profile-update / Validated Profile Update**.
- [x] 2.4 In `backend/mitienda/settings.py`: add `from django.core.exceptions import ImproperlyConfigured`. At end of file, add guard: `if not DEBUG and SECRET_KEY == 'django-insecure-ls#+os#hiq*hqg6a9c*yzapi452p*_o$q3k6@%oady%0yxcmxz': raise ImproperlyConfigured(...)`. Satisfies spec **env-settings / ImproperlyConfigured Guard**.

## Phase 3: Regression Tests

- [x] 3.1 In `backend/orders/tests.py`: add `OrderHardeningTests(TestCase)` with DRF `APIClient`. Tests: 405 on PUT/PATCH/DELETE to `/api/orders/{id}/` and `/api/cart/`; 405 on bare POST `/api/orders/`; `create_from_cart` success (201, stock decremented, cart cleared); insufficient stock rollback (400, no order, stock unchanged, cart intact); total recomputed from cart items. Satisfies spec **order-integrity** scenarios.
- [x] 3.2 In `backend/orders/tests.py`: add `CartItemUpdateTests(TestCase)`. Tests: valid quantity update; quantity below minimum (0 → 400); quantity above stock → 400. Satisfies spec **order-integrity / Cart Item Update Validation** scenarios.
- [x] 3.3 In `backend/products/tests.py`: add `StaffOrReadOnlyTests(TestCase)` with `APIClient`. Tests: non-staff POST → 403; staff POST → 201; unauthenticated GET → 200. Tests categories too: non-staff POST → 403, staff POST → 201. Satisfies spec **staff-or-read-only** scenarios.
- [x] 3.4 In `backend/users/tests.py`: add `ProfileUpdateTests(TestCase)` and `LogoutTests(TestCase)` with `APIClient`. Tests: PUT with valid data → 200; PUT with empty string clears field; PUT with invalid email → 400; logout with token → 200, token deleted; logout without token → 200 (idempotent). Satisfies spec **profile-update** scenarios.
- [x] 3.5 In `backend/mitienda/tests.py` (or `backend/mitienda/test_settings.py`): add `SettingsGuardTests(TestCase)` using `override_settings`. Tests: `DEBUG=False` + default SECRET_KEY → `ImproperlyConfigured` raised; `DEBUG=False` + real key → no error; `DEBUG=True` + default key → no error. Satisfies spec **env-settings** scenarios.

## Phase 4: Final Verification

- [x] 4.1 Run full backend test suite: `.venv\Scripts\python.exe manage.py test -v2` from `backend/`. Confirm green. Record results.