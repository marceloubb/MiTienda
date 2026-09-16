# Proposal: backend-hardening

## Intent

Hardening change for the DRF backend. Today any authenticated user can POST/PUT/PATCH/DELETE orders, cart, products and categories (global IsAuthenticatedOrReadOnly + full ModelViewSets), orders expose writable total/status/payment, and a bare POST /api/orders/ creates orders with arbitrary totals and no items. Checkout is non-atomic (mid-loop failure leaves an order without items and partially-decremented stock). PUT /profile bypasses serializers (cannot clear fields, no validation), logout swallows all exceptions, and settings are hardcoded. Fix with ~100-120 code lines plus ~150-200 focused regression test lines.

## Scope

### In Scope
- Staff-or-read-only on products/categories (one permission, ~8 lines)
- Orders/cart generic write routes become 405 (ReadOnlyModelViewSet); custom actions kept
- Atomic checkout: `transaction.atomic()` + `select_for_update()` + stock re-validation, total recomputed
- `UpdateCartItemSerializer` (min_value=1, stock check; shared stock helper)
- Flat `UpdateProfileSerializer` for PUT /profile (`allow_blank` clears fields)
- Idempotent logout: `Token.objects.filter(user=...).delete()`
- Settings via `os.environ.get` with dev-safe defaults + `ImproperlyConfigured` guard
- Regression tests (~150-200 lines, DRF APIClient + TestCase)

### Out of Scope
- Full test infrastructure (factories, CI); Postgres migration / real row locks; multi-device logout / token revocation; payment_method enum validation; `.env` files / python-dotenv / django-environ. Frontend untouched (verified zero impact). All recorded as follow-ups.

## Capabilities

### New Capabilities
- `order-integrity`: read-only order/cart surfaces; atomic transactional checkout with stock re-validation
- `staff-or-read-only`: products/categories writes restricted to staff
- `profile-update`: validated flat profile serializer; idempotent logout
- `env-settings`: environment-driven settings with dev-safe defaults

### Modified Capabilities
- None (project has no existing specs; these are the first spec versions)

## Approach

| # | Finding (sev) | Options evaluated | Recommended |
|---|---|---|---|
| 1 | Order/cart full CRUD (crit) | keep ModelViewSet vs ReadOnlyModelViewSet + actions | ReadOnlyModelViewSet; writes -> 405; create_from_cart kept |
| 2 | Non-atomic checkout (crit) | ad-hoc try/except vs atomic + select_for_update + re-validate | atomic + select_for_update; 400 on stock fail; no partial state |
| 3 | update_item unvalidated (imp) | inline validation vs serializer pattern | UpdateCartItemSerializer + shared stock helper |
| 4 | ProfileView.put raw (imp) | `.get()` fallback vs flat serializer | Flat UpdateProfileSerializer; save() updates User + Profile |
| 5 | Logout swallows errors (imp) | narrower except vs idempotent delete | `Token.objects.filter(user=).delete()` |
| 6 | Hardcoded settings (imp) | python-dotenv / django-environ / pure env vars | `os.environ.get` + guard; zero deps (user-adopted) |

## Affected Areas

| Area | Impact | Change |
|---|---|---|
| backend/products/views.py | Modified | IsStaffOrReadOnly on both viewsets |
| backend/orders/views.py | Modified | ReadOnlyModelViewSet; atomic checkout; validated update_item |
| backend/orders/serializers.py | Modified | UpdateCartItemSerializer + shared stock helper |
| backend/users/views.py | Modified | serializer-based profile update; idempotent logout |
| backend/users/serializers.py | Modified | Flat UpdateProfileSerializer |
| backend/mitienda/settings.py | Modified | env-driven SECRET_KEY/DEBUG/ALLOWED_HOSTS/CORS |
| backend/{products,orders,users}/tests.py | Modified | regression tests (~150-200 lines) |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| No git: manual rollback surface | Med | Back up touched files to %TEMP% before apply; bounded file list |
| SQLite: select_for_update is no-op | Med | atomic() single-writer lock covers; Postgres follow-up recorded |
| Frontend regression | Low | Frontend verified to use only read + listed actions; tests cover |
| Local admin staff flag | Med | Verify superuser staff=True before apply (createsuperuser) |
| 400-line review budget | Low-Med | Forecast ~300-320 lines; single PR slice |

## Rollback Plan

No git repo exists. Before applying, copy every touched file to `%TEMP%\mitienda-backup-<date>`. On failure: restore each file from backup and rerun `python manage.py test`. No migrations expected (no schema change). Record rollback steps in this change's artifacts.

## Dependencies

- None new (stdlib `os` only). Test command: `python manage.py test` from `backend/` with `.venv` active.

## Success Criteria

- [ ] PUT/PATCH/DELETE order & cart and bare POST /api/orders/ -> 405; create_from_cart -> 201
- [ ] create_from_cart with insufficient stock -> 400; no order, stock unchanged, cart intact
- [ ] update_item: quantity <= 0, non-numeric, or above stock -> 400
- [ ] PUT /profile: empty string clears a field; invalid email -> 400
- [ ] Non-staff product/category writes -> 403; staff -> success
- [ ] DEBUG=False with placeholder SECRET_KEY -> ImproperlyConfigured; defaults work out of the box
- [ ] Full backend suite green with new tests