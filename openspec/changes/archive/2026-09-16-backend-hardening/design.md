# Design: Backend Hardening

## Technical Approach

Four targeted hardening capabilities applied to the existing DRF backend. No schema changes, no new dependencies. Each capability modifies a small surface: swap ViewSet base classes, wrap a checkout method in a transaction, add a serializer, and replace a raw handler with a validated one. The design follows the existing DRF patterns already in the codebase (class-based ViewSets, `serializer.is_valid()`, DRF test `APIClient`).

## Architecture Decisions

### Decision: ReadOnlyModelViewSet for Order/Cart generic routes

**Choice**: Swap `viewsets.ModelViewSet` to `viewsets.ReadOnlyModelViewSet` on both `CartViewSet` and `OrderViewSet`.

**Alternatives considered**: Custom `http_method_names` override; DRF `@action`-only ViewSet.

**Rationale**: `ReadOnlyModelViewSet` automatically removes POST/PUT/PATCH/DELETE from list/detail routes while preserving `@action`-decorated methods (`create_from_cart`, `add_item`, `remove_item`, `update_item`, `clear`). This is the DRF-idiomatic way; ~2 lines changed.

### Decision: Atomic checkout with SQLite-compatible locking

**Choice**: Wrap `create_from_cart` body in `transaction.atomic()` + `select_for_update()` on cart and relevant products. Re-validate stock inside the transaction. Recompute total from cart items.

**Alternatives considered**: Ad-hoc try/except with manual rollback; omitting select_for_update entirely.

**Rationale**: `select_for_update()` is a no-op on SQLite but is correct for Postgres and costs nothing on SQLite. `transaction.atomic()` guarantees the entire checkout is all-or-nothing. Stock is re-checked inside the transaction to prevent race conditions (relevant when migrating to Postgres). Total is recomputed from cart items to prevent stale values.

### Decision: UpdateCartItemSerializer with shared stock helper

**Choice**: New `UpdateCartItemSerializer` with `product_id`, `quantity` (min_value=1), stock validation in `validate_quantity`. Extract `_check_stock(product, quantity)` as a module-level helper shared with `add_item`.

**Alternatives considered**: Inline validation in the view; separate validation utility module.

**Rationale**: Serializer pattern is already used in the codebase (`AddToCartSerializer`). A shared helper avoids duplicating the stock check logic. Keep it in `orders/serializers.py` alongside existing serializers — no new files.

### Decision: Flat UpdateProfileSerializer for PUT /profile

**Choice**: New `UpdateProfileSerializer(serializers.Serializer)` with User fields (`first_name`, `last_name`, `email`) and Profile fields (`phone`, `address`, `city`, `postal_code`), all `required=False, allow_blank=True`. `save()` updates User then Profile.

**Alternatives considered**: Nested serializer; ModelSerializer on User only.

**Rationale**: Flat serializer gives full control over cross-model update. `allow_blank=True` lets empty strings clear fields (current `.get()` fallback cannot). Matches `RegisterSerializer` pattern (flat `Serializer` with custom `save()`).

### Decision: Idempotent logout via filter().delete()

**Choice**: Replace bare `except: pass` with `Token.objects.filter(user=request.user).delete()`.

**Alternatives considered**: `get_or_none` + conditional delete; keep try/except with narrower except type.

**Rationale**: `filter().delete()` returns 0 affected rows when no token exists — naturally idempotent, no exception handling needed, clearer intent.

### Decision: ImproperlyConfigured guard at end of settings.py

**Choice**: Add 3 lines at the bottom of `settings.py`: after DEBUG and SECRET_KEY are set, check `if not DEBUG and SECRET_KEY == <placeholder>: raise ImproperlyConfigured(...)`.

**Alternatives considered**: Guard in `wsgi.py` / `asgi.py`; environment validation management command.

**Rationale**: End of `settings.py` is where all env vars are resolved. Guard fires once on import. Importing `ImproperlyConfigured` from `django.core.exceptions` is zero-cost. No new files, no new dependencies.

## Data Flow

```
── order-integrity ──

Client ─POST /api/orders/create_from_cart/──→ OrderViewSet.create_from_cart
  ├── transaction.atomic()
  │     ├── Cart.objects.select_for_update(user)     ← DB lock
  │     ├── Product.objects.select_for_update(id)     ← per-item lock
  │     ├── Re-check stock for each cart item
  │     ├── Recompute total = Σ(price × qty)
  │     ├── Order + OrderItem.objects.create
  │     ├── Product.stock -= qty
  │     └── Cart items cleared
  └── 201 on commit / 400 on stock fail → rollback

── staff-or-read-only ──

Client ─POST /api/products/──→ ProductViewSet.create
  └── IsStaffOrReadOnly permission
        └── user.is_staff? → 201 / 403

── profile-update ──

Client ─PUT /api/profile/──→ ProfileView.put
  ├── UpdateProfileSerializer(data=request.data)
  ├── serializer.is_valid() → 400 on bad email etc.
  └── serializer.save(user)
        ├── user.first_name = data['first_name']  (empty string → clear)
        └── profile.phone = data['phone']          (empty string → clear)

── env-settings ──

Django import settings.py
  └── if not DEBUG and SECRET_KEY == placeholder:
        raise ImproperlyConfigured("...")
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/orders/views.py` | Modify | Swap both ViewSets to `ReadOnlyModelViewSet`; wrap `create_from_cart` in `transaction.atomic` + `select_for_update` + stock re-validation + total recomputation; replace `update_item` body to use `UpdateCartItemSerializer`; add `from django.db import transaction` and `from django.db.models import F` imports |
| `backend/orders/serializers.py` | Modify | Add `UpdateCartItemSerializer` (product_id, quantity min_value=1, validate_quantity for stock); add `_check_stock(product, quantity)` helper; add `from products.models import Product` import |
| `backend/users/views.py` | Modify | Replace `ProfileView.put` body to use `UpdateProfileSerializer`; replace `LogoutView.post` with `Token.objects.filter(user=...).delete()`; add serializer import |
| `backend/users/serializers.py` | Modify | Add `UpdateProfileSerializer` (flat Serializer, all fields required=False + allow_blank, custom save) |
| `backend/products/views.py` | Modify | Add `permission_classes = [IsStaffOrReadOnly]` to both ViewSets; add `from rest_framework.permissions import IsStaffOrReadOnly` import |
| `backend/mitienda/settings.py` | Modify | Add `from django.core.exceptions import ImproperlyConfigured` import; add 3-line guard at bottom of file |
| `backend/orders/tests.py` | Modify | Add regression tests for order-integrity capability (~80-100 lines): 405 lockdown, atomic checkout, stock rollback, total recomputation, update_item validation |
| `backend/products/tests.py` | Modify | Add regression tests for staff-or-read-only (~30 lines) |
| `backend/users/tests.py` | Modify | Add regression tests for profile-update (~30 lines) |

**No new files created. No migrations. No frontend changes.**

## Interfaces / Contracts

### UpdateCartItemSerializer (orders/serializers.py)

```python
class UpdateCartItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

    def validate_quantity(self, value):
        product_id = self.initial_data.get('product_id')
        # Re-check stock via shared helper
        _check_stock(product_id, value)
        return value
```

### Shared stock helper (orders/serializers.py)

```python
def _check_stock(product_id, quantity):
    """Fetch product, raise ValidationError if stock < quantity."""
    product = Product.objects.get(id=product_id, is_active=True)
    if product.stock < quantity:
        raise serializers.ValidationError("Stock insuficiente")
    return product
```

### UpdateProfileSerializer (users/serializers.py)

```python
class UpdateProfileSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    postal_code = serializers.CharField(required=False, allow_blank=True)

    def save(self, user):
        # Update User fields
        for field in ('first_name', 'last_name', 'email'):
            setattr(user, field, self.validated_data[field])
        user.save()
        # Update Profile fields
        profile, _ = UserProfile.objects.get_or_create(user=user)
        for field in ('phone', 'address', 'city', 'postal_code'):
            setattr(profile, field, self.validated_data[field])
        profile.save()
        return user
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| **Unit** | `UpdateCartItemSerializer` validates min_value=1, rejects quantity > stock | DRF serializer `.is_valid()` + `assertErrors` |
| **Unit** | `UpdateProfileSerializer` clears fields on blank, rejects invalid email | DRF serializer tests |
| **Unit** | `_check_stock` raises on insufficient stock | Call helper directly with mocked product |
| **Integration** | `create_from_cart` succeeds atomically (order created, stock decremented, cart cleared) | DRF `APIClient` + `TestCase` (DB rollback per test) |
| **Integration** | `create_from_cart` fails on insufficient stock (400, no order, stock unchanged, cart intact) | DRF `APIClient` + `TestCase` |
| **Integration** | `create_from_cart` recomputes total from cart items | DRF `APIClient` + `TestCase` |
| **Integration** | PUT/PATCH/DELETE on `/api/orders/{id}/` and `/api/cart/` return 405 | DRF `APIClient` |
| **Integration** | Non-staff POST to `/api/products/` returns 403; staff returns 201 | DRF `APIClient` with `User.objects.create_user` |
| **Integration** | PUT `/api/profile/` with invalid email returns 400; empty string clears field | DRF `APIClient` |
| **Integration** | Logout without token returns 200 (idempotent) | DRF `APIClient` |
| **Unit** | `DEBUG=False` + placeholder SECRET_KEY raises `ImproperlyConfigured` | Override settings in test, import settings module |

**Test count estimate**: ~150-200 lines across 3 test files. All use `django.test.TestCase` + DRF `APIClient` (existing project convention — no factories, no pytest).

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. No schema changes. No new dependencies. Rollback: restore backed-up files, run `python manage.py test` to confirm green.

## Open Questions

- [ ] None — all decisions mapped from proposal and specs with no blockers.
