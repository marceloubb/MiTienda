# Proposal: Admin Inventory Roles

## Intent

Staff (admin, bodega, despacho) share the customer storefront; all order transitions happen via Django admin. Goal: role-specific operational surfaces per workflow, preserving shipped stock/order contracts.

## Scope

### In Scope

- `UserProfile.role` (customer|admin|bodega|despacho), exclusive; defaults customer, backfills `is_staff` users → admin
- `role=admin` ⇒ `is_staff=True` (sync at save); bodega/despacho NOT staff (keeps `staff-or-read-only`)
- DRF permissions `IsAdmin`/`IsBodega`/`IsDespacho`/`IsStaffRole` — server-side enforcement
- New `ready` status; bodega pending→processing→ready; despacho ready→shipped→delivered
- Admin-only cancel at any status — ALWAYS restores stock
- Bodega discrepancy flag (missing/damaged) → order blocked until admin resolves
- Staff order viewset `/api/staff/orders/` (all orders, role-scoped transitions)
- Staff-user creation endpoint (admin-only) + storefront form
- Routes `/admin`, `/bodega`, `/despacho` + `RequireRole` guards + Navbar
- `UserSerializer` exposes `role`/`is_staff`

### Out of Scope

- Customer self-cancel; payment tracking / COD collection
- Stock decrement timing (stays at checkout per `order-integrity`); Django Groups rework

## Capabilities

### New Capabilities

- `role-based-access`: role field, permission classes, `is_staff` sync, staff-user endpoint
- `order-state-machine`: `ready` status, role-scoped transitions, cancel + stock restore
- `order-discrepancy`: bodega flag, admin resolution, blocked flow
- `staff-admin-ui`: guarded routes, RequireRole wrapper, Navbar

### Modified Capabilities

- `order-integrity`: adds cancel write path (atomic, restores stock)
- `staff-or-read-only`: adds read-only bodega/despacho roles

## Approach

Exploration Option C: single role field; `is_staff` synced for admin. DRF enforces; client guards UX-only. Checkout decrement unchanged; cancel restores stock; `select_for_update()` on transitions; discrepancy blocks progression.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `backend/users/{models,serializers,views}.py` | Modified | `role` field+migration, serialize `role`/`is_staff`, staff-user endpoint |
| `backend/users/permissions.py` | New | Role permission classes |
| `backend/orders/{models,views,serializers,urls}.py` | Modified | `ready`, discrepancy, staff viewset, transitions, cancel |
| `frontend/lib/{api.ts,auth-context.tsx}` | Modified | `User.role`, staff APIs |
| `frontend/components/{Navbar,RequireRole}.tsx` | Mod/New | Role links, guard |
| `frontend/app/{admin,bodega,despacho}/**` | New | Operational routes |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Client-only enforcement bypass | Medium | DRF permission on every transition |
| `is_staff`/`role` drift | Low | Sync at save; backfill migration |
| Discrepancy blocks orders | Medium | Admin dashboard surfaces blocked orders |
| Staff-user endpoint abuse | Medium | Admin-only; token + role check |
| >400-line review budget | High | Chained PRs: backend first, frontend second |

## Rollback Plan

1. Revert migration/role field; remove staff viewset, permissions, staff-user endpoint
2. Revert frontend routes + Navbar
3. Archived specs (`order-integrity`, `staff-or-read-only`) untouched

## Dependencies

- Archived specs `order-integrity` + `staff-or-read-only` (must not break); Django 6.1 migrations; DRF TokenAuthentication (in use)

## Success Criteria

- [ ] Admin: product mgmt, all orders, cancel at any status
- [ ] Role-filtered queues: bodega pending→processing→ready; despacho ready→shipped→delivered
- [ ] Discrepancy flag blocks order until admin resolves
- [ ] Staff provisioning via Django admin AND storefront endpoint
- [ ] Customer flow unchanged; unauthorized transitions 403