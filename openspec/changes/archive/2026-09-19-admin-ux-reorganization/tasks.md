# Tasks: Admin UX Reorganization

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~840 (350 + 150 + 340 per slice) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3, stacked to main |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Frontend route reorg + staff view | PR 1 `feat/admin-routes` | `cd frontend && npx tsc --noEmit` | Manual: `/admin` redirect; `/admin/staff` renders | Revert slice-1 commits; restore `/admin` mashup |
| 2 | Admin-only `GET /api/staff/users/` + tests | PR 2 `feat/staff-user-list` | `cd backend && .venv\Scripts\python.exe manage.py test users` | DRF: admin 200, bodega 403, anon 401 | Drop view/serializer/url/tests commits |
| 3 | Bodega inventory + despacho grouping | PR 3 `feat/staff-data-views` | `cd frontend && npx tsc --noEmit` | Manual: stock+flow; city-grouped cards | Revert slice-3 commits; queue-only pages |

## Phase 1: Frontend Reorg — Slice 1 (`feat/admin-routes`)

- [x] 1.1 `frontend/lib/api.ts`: `listStaffUsers` (GET `/staff/users/`) + `StaffUser` type
- [x] 1.2 `frontend/app/admin/page.tsx`: mashup → `RequireRole` + redirect to `/admin/orders`
- [x] 1.3 Create `frontend/app/admin/orders/page.tsx`: `OrdersDashboard` + `DiscrepancyPanel` (order mgmt only)
- [x] 1.4 Create `frontend/components/admin/StaffManagementView.tsx`: composes form + list; `reloadKey` bump on `onCreated`
- [x] 1.5 Create `frontend/components/admin/StaffUserList.tsx`: summary from `listStaffUsers`; empty/error states
- [x] 1.6 `frontend/components/admin/StaffUserForm.tsx`: optional `onCreated` on POST success
- [x] 1.7 Create `frontend/app/admin/staff/page.tsx`: renders `StaffManagementView`
- [x] 1.8 `frontend/components/Navbar.tsx`: `STAFF_LINKS` admin → `/admin/orders`, `/admin/staff`, `/bodega`, `/despacho`
- [x] Verify: `npx tsc --noEmit`; manual — `/admin` redirects, both new routes render

## Phase 2: Staff-List Backend — Slice 2 (`feat/staff-user-list`)

- [x] 2.1 `backend/users/serializers.py`: `StaffUserListSerializer` (`id, username, email, is_staff, role` from `profile.role`, no extra PII)
- [x] 2.2 `backend/users/views.py`: rename `StaffUserCreateView` → `StaffUserView`; `get` → `User.objects.filter(profile__role__in=['admin','bodega','despacho']).order_by('id')`, `IsAuthenticated + IsAdmin`
- [x] 2.3 `backend/users/staff_urls.py`: import `StaffUserView`; url name `staff-user` (same URL, GET+POST coexist)
- [x] 2.4 `backend/users/tests.py`: `StaffUserListViewTests` — 200+exact fields, customer omitted, 403×3, 401, id order, POST-then-GET
- [x] Verify: `.venv\Scripts\python.exe manage.py test users` green (38 tests OK; full suite 103 OK)

## Phase 3: Data Views — Slice 3 (`feat/staff-data-views`)

- [x] 3.1 Create `frontend/components/admin/InventoryView.tsx`: stock from `getProducts`, low-stock flag, 7-day flow from `getStaffOrders` in-client (no aggregation)
- [x] 3.2 `frontend/app/bodega/page.tsx`: `InventoryView` + existing queue
- [x] 3.3 Create `frontend/components/admin/DispatchRoutesView.tsx`: pure `groupOrdersByCity`; city cards; advance keeps `order-state-machine` scopes
- [x] 3.4 `frontend/app/despacho/page.tsx`: flat table → `DispatchRoutesView`
- [x] Verify: `npx tsc --noEmit`; manual — `/bodega` stock+flow+queue, `/despacho` groups + advance works

## Phase 4: Whole-Change Verification

- [x] 4.1 Backend: `cd backend && .venv\Scripts\python.exe manage.py test` green — 103 tests OK (163.5s)
- [x] 4.2 Route matrix: admin redirect; bodega/despacho own routes; customer blocked from staff routes
- [x] 4.3 Non-goal audit: no models, migrations, aggregation endpoint, `DeliveryRoute`, or auth changes