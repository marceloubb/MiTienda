# Proposal: Admin UX Reorganization

## Intent

Staff surfaces mix several tasks on one screen (e.g. `/admin` combines order management, staff provisioning, and discrepancy resolution), making operations feel disorganized. This change reorganizes staff UX into ONE dedicated view per task, tailored to each role's data, plus the minimal backend endpoint needed to support the staff summary.

## Scope

### In Scope
- Split `/admin` mashup into single-task staff routes (order management incl. discrepancy resolution; staff management).
- Staff management = create form + registered-staff summary on one screen, backed by new admin-only `GET /api/staff/users/`.
- Bodega = inventory view: stock levels, low-stock, sales-flow/movement indicators; retains the order-preparation flow.
- Despacho = established routes presented as orders grouped by existing `shipping_city`; no new route model.
- Navbar STAFF_LINKS update for new routes; backend tests for the new endpoint.

### Out of Scope
- No DeliveryRoute/zone/itinerary model or migration (routes = city grouping only).
- No new inventory/aggregation backend endpoints (sales flow computed in-client from existing payloads).
- No pagination fix for `GET /api/staff/orders/` (flagged risk, deferred).
- No server-side route guards (still UX-only `RequireRole`; DRF permissions enforce APIs).

## Capabilities

### New Capabilities
- `staff-user-list`: admin-only `GET /api/staff/users/` returning registered staff (id, username, email, role); guarded by `IsAdmin` from `role-based-access`.

### Modified Capabilities
- `staff-admin-ui`: route set changes (single-task views), navbar role-link map, and staff-view (create + summary) frontend contract.

## Approach

Frontend-first, delivered as auto-chained PRs within the 400-line budget:
1. Reorganize routes: `/admin` becomes landing/redirect; add `/admin/orders` (OrdersDashboard + DiscrepancyPanel, one task) and `/admin/staff` (StaffUserForm + summary list).
2. Backend slice: `GET /api/staff/users/` admin-only, reusing `IsAdmin` (role-based-access "DRF Permission Classes"); serializer exposes role/is_staff; tests cover admin 200, bodega/despacho/customer 403.
3. Bodega: add inventory section consuming `getProducts` (`stock` field); sales-flow summary computed in-client from `getStaffOrders`.
4. Despacho: group orders by `shipping_city` into route cards; per-order advance actions unchanged (order-state-machine transition scopes intact).
5. Write `staff-user-list` spec + `staff-admin-ui` delta spec.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/app/admin/page.tsx` | Modified | Split mashup; becomes landing/redirect |
| `frontend/app/admin/orders/`, `staff/` | New | Dedicated task views |
| `frontend/app/bodega/page.tsx` | Modified | Add inventory + sales-flow |
| `frontend/app/despacho/page.tsx` | Modified | City-grouped routes |
| `frontend/components/admin/*` | Modified | StaffUserForm + summary; move OrdersDashboard/DiscrepancyPanel |
| `frontend/components/Navbar.tsx` | Modified | STAFF_LINKS for new routes |
| `frontend/lib/api.ts` | Modified | `listStaffUsers` + inventory helpers |
| `backend/users/views.py` + urls + serializers | Modified | `GET /api/staff/users/` |
| `backend/users/tests.py` | Modified | Admin-only list tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Staff list exposes PII (username/email) | Med | `IsAdmin`-only + permission tests; aligns with role-based-access |
| In-client sales-flow over unbounded orders payload | Med | Bounded summary window; pagination flagged as p2 |
| Combined change exceeds 400 lines | High | auto-chain slices (frontend → staff endpoint → view data) |
| `staff-admin-ui` route contract drift | Med | Delta spec updated within same change |

## Rollback Plan

Revert per-slice commits: remove new route dirs and restore the `/admin` composition; drop the `GET /api/staff/users/` view/url/serializer/tests. No migrations or data changes — rollback is commit-revert only.

## Dependencies

- Existing specs: `role-based-access` (IsAdmin), `staff-admin-ui` (routes/navbar), `order-state-machine` (transition scopes — unchanged).

## Success Criteria

- [ ] Each staff task has one dedicated route; `/admin` mashup removed
- [ ] Staff view shows create + summary sourced from `GET /api/staff/users/`
- [ ] Bodega view shows stock levels, low-stock, and flow indicators
- [ ] Despacho view shows city-grouped routes
- [ ] Backend tests: admin 200, other roles 403
- [ ] Each chained PR within the 400-line review budget

## Open Questions (design-level)

- Should `/admin` be a lightweight landing page or a direct redirect to `/admin/orders`?
- Does the bodega preparation queue stay as the flow driver inside the inventory view?