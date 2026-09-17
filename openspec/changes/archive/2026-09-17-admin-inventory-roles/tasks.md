# Tasks: Admin Inventory Roles

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,500 (range 1,400â€“1,650) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1a role model+perms â†’ PR1b endpoints+tests â†’ PR2a ready+viewset â†’ PR2b cancel+tests â†’ PR3 discrepancy â†’ PR4 frontend foundation â†’ PR5 admin â†’ PR6 bodega/despacho |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1a | Role model foundation (~110) | PR 1a | `.venv\Scripts\python.exe manage.py test users products` in `backend/` | `force_authenticate` per role vs IsAdmin/IsStaffRole views (unit) | Revert users 0002, drop permissions/signals |
| 1b | Role endpoints + tests (~489) | PR 1b | `.venv\Scripts\python.exe manage.py test users products` in `backend/` | Staff-user + user-detail API 201/403/400 | Revert serializers/views/staff_urls/mitienda-urls + test files |
| 2a | Ready + staff viewset (~165) | PR 2a | `.venv\Scripts\python.exe manage.py test orders` in `backend/` | Advance matrix via APIClient per role/status | Revert orders 0002, drop viewset/advance |
| 2b | Cancel + serializer + tests (~291) | PR 2b | `.venv\Scripts\python.exe manage.py test orders` in `backend/` | Cancel restore atomic; forced mid-failure cancels | Revert cancel action + serializer + tests |
| 3 | Discrepancy flow (~235) | PR 3 | `.venv\Scripts\python.exe manage.py test orders` | Flag â†’ advance 403 â†’ resolve/cancel flows | Revert orders 0003, drop flag/resolve actions |
| 4 | Frontend foundation (~195) | PR 4 | `npx eslint . && npx next build` in `frontend/` | N/A â€” no JS test runner; lint/build are the harness | Revert lib/components (api, order-status, RequireRole, Navbar) |
| 5 | Admin surface (~260) | PR 5 | `npx eslint . && npx next build` | N/A â€” no JS test runner | Delete `app/admin/` + `components/admin/` |
| 6 | Bodega/despacho (~145) | PR 6 | `npx eslint . && npx next build` | N/A â€” no JS test runner | Delete `app/bodega/`, `app/despacho/`, revert orders page |

## Phase 1: Backend Role Foundation (PR 1a + PR 1b â€” re-sliced per maintainer decision, 599 authored lines)

- [x] 1.1 `backend/users/models.py`: exclusive `role` choices (default customer) + `save()` sync `is_staffâ‡”role=='admin'` (~30) â€” accept: role default + sync scenarios
- [x] 1.2 `backend/users/migrations/0002_role_backfill.py`: AddField + RunPython backfill `is_staff`â†’admin, reverseable (~35) â€” accept: fresh-DB backfill scenario
- [x] 1.3 `backend/users/permissions.py` (new): `IsAdmin`/`IsBodega`/`IsDespacho`/`IsStaffRole` checking `user.role` (~25) â€” accept: bodega on IsAdmin â†’ 403; customer on IsStaffRole â†’ 403
- [x] 1.4 `backend/users/signals.py` (new) + `backend/users/apps.py`: recursion-guarded post_save drift guard (~20) â€” accept: Django-admin `is_staff` checkbox cannot desync role
- [x] 1.5 `backend/users/serializers.py`, `backend/users/views.py`, `backend/users/staff_urls.py` (new), `backend/mitienda/urls.py`: `role` readable + `is_staff` read-only in UserSerializer; `UserDetailView` GET/PATCH role (admin-guarded); `StaffUserCreateView` POST at `api/staff/users/` (~105) â€” accept: 201 create (is_staff by role), non-admin 403, bad role 400
- [x] 1.6 `backend/users/tests.py` + `backend/products/tests.py`: role matrix, staff-user 201/403/400, sync both directions, backfill, bodega/despacho product+category write 403 (~160) â€” accept: all spec role-based-access + staff-or-read-only scenarios

## Phase 2: Order State Machine + Cancel (PR 2a + PR 2b â€” re-sliced per maintainer decision, 456 authored lines)

- [x] 2.1 `backend/orders/models.py` + `backend/orders/migrations/0002_*.py`: add `ready` choice (~45) â€” accept: full status set per spec
- [x] 2.2 `backend/orders/views.py` `StaffOrderViewSet` + `backend/orders/urls.py` router: list all orders; `advance` per matrix with `select_for_update()`; 404 missing (~120) â€” accept: matrix rows (bodega pendingâ†’processingâ†’ready, despacho readyâ†’shippedâ†’delivered, admin any; skip/overreach 403; discrepancy 403)
- [x] 2.3 `backend/orders/views.py`: `cancel` [IsAdmin] atomic restore via `F()` (~70) â€” accept: any status except delivered/cancelled (400 those); non-admin 403; no partial restore on forced failure
- [x] 2.4 `backend/orders/serializers.py`: `StaffOrderSerializer(OrderSerializer)` (~30) â€” accept: all statuses incl. `ready` serialized
- [x] 2.5 `backend/orders/tests.py`: advance matrix Ã— role Ã— status, cancel restore atomic + independent, 403/400/404 contracts, prior order-integrity suite green (~140) â€” same-task regression tests

## Phase 3: Discrepancy Flow (PR 3) â€” dep: PR2

- [x] 3.1 `backend/orders/models.py` + `backend/orders/migrations/0003_*.py`: `pre_discrepancy_status` (nullable) + `discrepancy_reason` (missing|damaged) (~35) â€” accept: fields persist
- [x] 3.2 `backend/orders/views.py`: `discrepancy` action (bodega/admin, from pending/processing/ready, stores pre-status + reason; 403 on discrepancy status) + `resolve-discrepancy` (admin-only; non-discrepancy â†’ 400) (~70) â€” accept: error contracts 403/400/404
- [x] 3.3 `backend/orders/serializers.py`: expose `discrepancy_reason` (~10) â€” accept: discrepancy orders in admin list with reason
- [x] 3.4 `backend/orders/tests.py`: flag â†’ advance 403 â†’ resolve â†’ resume (pending & processing), non-admin resolve 403, cancel from discrepancy, bad reason 400 (~120) â€” same-task regression tests

## Phase 4: Frontend Foundation (PR 4) â€” dep: PR1â€“3 API shapes

- [x] 4.1 `frontend/lib/api.ts`: `UserRole` type; `User.role/is_staff`; `discrepancy_reason?`; staff fns (list, advance, cancel, flag, resolve, createStaffUser) (~60) â€” accept: TS strict pass
- [x] 4.2 `frontend/lib/order-status.ts` (new): shared badge/status styles; `ready` primary, `discrepancy` destructive (~60)
- [x] 4.3 `frontend/components/RequireRole.tsx` (new): `roles` prop; loadingâ†’null, `!user`â†’/login, mismatchâ†’redirectTo (~40) â€” accept: guard spec scenarios
- [x] 4.4 `frontend/components/Navbar.tsx`: roleâ†’links map (admin 3, bodega/despacho own, customer none) (~30)
- [x] 4.5 `frontend/lib/auth-context.tsx`: type-level `role` exposure (~5) â€” accept: ESLint + `next build` clean on all Phase 4 tasks

## Phase 5: Admin Surface (PR 5a + PR 5b + PR 5c — re-sliced per maintainer decision, 661 authored lines) — dep: PR4

- [x] 5.1 `frontend/components/admin/StaffUserForm.tsx` (new): staff-user creation form (~75) â€” accept: 201/400 surfaced to user
- [x] 5.2 `frontend/components/admin/OrdersDashboard.tsx` (new): all-orders table, role-scoped action buttons (~90) â€” accept: advance/cancel wired to staff fns
- [x] 5.3 `frontend/components/admin/DiscrepancyPanel.tsx` (new): blocked orders with reason, resolve/cancel actions (~60) â€” accept: calls resolve/cancel APIs
- [x] 5.4 `frontend/app/admin/page.tsx` (new): `RequireRole(["admin"])` wiring 3 sub-components (~35) â€” accept: route scenarios; ESLint + `next build`

## Phase 6: Bodega/Despacho Surfaces (PR 6a + PR 6b — re-sliced per maintainer decision, 610 authored lines) — dep: PR4

- [x] 6.1 `frontend/app/bodega/page.tsx` (new): bodega queue pendingâ†’processingâ†’ready + flag button (~80) â€” accept: spec scenario; ESLint + `next build`
- [x] 6.2 `frontend/app/despacho/page.tsx` (new): queue readyâ†’shippedâ†’delivered (~60) â€” accept: spec scenario; ESLint + `next build`
- [x] 6.3 `frontend/app/orders/page.tsx`: import shared status styles (~5) â€” accept: customer page behavior unchanged; ESLint + `next build`
