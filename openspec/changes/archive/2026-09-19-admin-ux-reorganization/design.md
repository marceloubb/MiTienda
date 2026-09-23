# Design: Admin UX Reorganization

## Technical Approach

Frontend-first single-task reorg (per `staff-admin-ui` delta) with one minimal backend addition — admin-only `GET /api/staff/users/` (per `staff-user-list`) — shipped as three auto-chained PRs each under the 400-line review budget. No models, no migrations: despacho routes are client-side grouping over existing `shipping_city`; bodega inventory reuses `getProducts.stock`; sales flow is computed in-client from the `getStaffOrders` payload bounded to a recent window. Server-side enforcement stays DRF `IsAdmin` per `role-based-access`.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| `/admin` behavior | Client-side redirect to `/admin/orders` | Lightweight landing card | Spec mandates redirect; landing adds a dead page. Implemented as small page inside `RequireRole` calling `router.replace` on mount. |
| Component placement | Keep `components/admin/*` in place | Move `OrdersDashboard`/`DiscrepancyPanel` to route dirs | A file move counts deletions+additions (~2× size) and would blow the 400-line slice budget. Pages import existing components. |
| Staff summary | New `StaffManagementView` + `StaffUserList`; `StaffUserForm` gains `onCreated` | Form fetches list itself | One screen needs shared refresh state; parent holds `reloadKey`, bumps it after creation (spec scenario "summary reflects a new user"). |
| Endpoint shape | Extend `StaffUserCreateView` → rename `StaffUserView` (GET+POST on one class, same URL) | Separate list view + second path | Spec requires GET+POST coexist on `/api/staff/users/`; single class/URL is minimal. Name/URL-name are internal-only (verified: no `reverse()` usages). |
| Staff serializer | New `StaffUserListSerializer` (id, username, email, is_staff, role) | Reuse `UserSerializer` | Spec fields are exact; reuse would leak `profile`, `first_name`, `last_name` (PII minimization beyond the contract). |
| Sales-flow window | In-client derived indicators over last 7 days of orders | Full-payload aggregation | Bounded window keeps payload cost contained; pagination/aggregation is explicit p2 non-goal. |
| Despacho grouping | New `DispatchRoutesView` with local pure `groupOrdersByCity` helper | Inline map in page | Keeps page thin; grouping is a deterministic pure function, one testable unit. |

## Data Flow

```
/admin ──(role=admin, replace)──▶ /admin/orders ──▶ OrdersDashboard + DiscrepancyPanel
                                         │            (getStaffOrders, existing actions)
                                         └─ /admin/staff ──▶ StaffManagementView
                                                 ├─ StaffUserForm ──▶ POST /api/staff/users/
                                                 └─ StaffUserList ──▶ GET /api/staff/users/  (admin-only)
/bodega ──▶ BodegaQueue (unchanged) + InventoryView ──▶ getProducts (stock) + getStaffOrders (7-day flow)
/despacho ──▶ DispatchRoutesView ──▶ getStaffOrders ──groupOrdersByCity(shipping_city)──▶ route cards
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/app/admin/page.tsx` | Modify | Mashup → `RequireRole` + redirect to `/admin/orders` |
| `frontend/app/admin/orders/page.tsx` | Create | Renders `OrdersDashboard` + `DiscrepancyPanel` (one task: order management) |
| `frontend/app/admin/staff/page.tsx` | Create | Renders `StaffManagementView` |
| `frontend/components/admin/StaffManagementView.tsx` | Create | Composes form + summary; `reloadKey` refresh |
| `frontend/components/admin/StaffUserList.tsx` | Create | Summary table from `listStaffUsers`; empty/error states |
| `frontend/components/admin/StaffUserForm.tsx` | Modify | Optional `onCreated` callback |
| `frontend/components/admin/InventoryView.tsx` | Create | Stock table, low-stock flag (`stock === 0`/≤ threshold), 7-day flow indicators |
| `frontend/components/admin/DispatchRoutesView.tsx` | Create | City-grouped route cards + per-order advance (existing scopes) |
| `frontend/components/Navbar.tsx` | Modify | `STAFF_LINKS`: admin → `/admin/orders`, `/admin/staff`, `/bodega`, `/despacho` |
| `frontend/lib/api.ts` | Modify | `listStaffUsers`, `StaffUser` type |
| `backend/users/views.py` | Modify | `StaffUserView` (rename) + `get` (list) |
| `backend/users/serializers.py` | Modify | `StaffUserListSerializer` |
| `backend/users/staff_urls.py` | Modify | Import/name `staff-user` |
| `backend/users/tests.py` | Modify | `StaffUserListViewTests` |

## Interfaces / Contracts

```python
# backend/users/serializers.py
class StaffUserListSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', read_only=True)
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff', 'role']
```

`GET /api/staff/users/` (admin only, `IsAuthenticated + IsAdmin`): queryset `User.objects.filter(profile__role__in=STAFF_ROLES).order_by('id')`; 200 list | 401 unauthenticated | 403 other roles, no data revealed. Frontend `StaffUser` = `{ id, username, email, is_staff, role }`.

## Chained-PR Slice Plan (delivery_strategy: auto-chain)

- **Slice 1 — frontend reorg** (`feat/admin-routes`): `admin/page.tsx` redirect, `admin/orders`, `admin/staff`, `StaffManagementView`, `StaffUserList`, `StaffUserForm.onCreated`, `Navbar STAFF_LINKS`, `api.ts` (`listStaffUsers` + type). ~350 lines. Verification: routes render, redirect works; summary tolerates endpoint-absent error state until slice 2.
- **Slice 2 — staff-list backend** (`feat/staff-user-list`, targets slice 1 branch): view rename+get, serializer, URL, `StaffUserListViewTests`. ~150 lines. Verification: full backend test suite green.
- **Slice 3 — data views** (`feat/staff-data-views`, targets slice 2 branch): `InventoryView` + bodega wiring, `DispatchRoutesView` + despacho wiring. ~340 lines. Verification: pages render with stock/flow/grouping.

Work-unit commits per slice (routes → components → api client; endpoint → tests; bodega → despacho). Each slice has autonomous scope and commit-revert rollback.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Backend unit (`users/tests.py`) | Admin 200 + field set (id/username/email/role/is_staff), customer omitted from list, 403 for bodega/despacho/customer, 401 unauthenticated, POST-then-GET lists new user, deterministic `id` order | `APIClient.force_authenticate` + role fixtures (existing `_role_user` pattern) |
| Frontend | No test framework (`frontend` test_command: "—") | Type-check + manual review; `groupOrdersByCity` kept pure for future unit test |

## Threat Matrix

N/A — no shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Web URL dispatch (Next.js App Router, DRF URLconf) is framework request routing, not the automation routing this matrix targets.

## Migration / Rollout

No migration, no model changes. Rollback is per-slice commit revert (remove route dirs, restore `/admin` composition; drop view/serializer/url/tests).

## Non-Goals (confirmed)

No pagination/aggregation endpoint (p2); no `DeliveryRoute` model; no auth model changes; no server-side route guards (`RequireRole` stays UX-only; DRF enforces APIs).

## Open Questions

None — remaining proposal questions (`/admin` landing vs redirect; bodega queue as flow driver) are resolved by the delta spec.