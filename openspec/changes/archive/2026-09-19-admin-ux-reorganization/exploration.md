# Exploration: admin-ux-reorganization

Strategic review of the admin/staff operational surfaces — single-task views, bodega inventory + sales flow, despacho established routes. Read-only exploration; no artifacts beyond this file.

## Current State

**Routes and composition.** All staff surfaces are App Router pages guarded client-side by `RequireRole` (UX-only; DRF permissions enforce server-side):

- `/admin` (`frontend/app/admin/page.tsx`) — `<RequireRole roles={["admin"]}>`. One page mixing THREE tasks in a 3-column grid: `OrdersDashboard` (all orders: advance + cancel, spans 2 cols), `StaffUserForm` (aside, create-staff form only), `DiscrepancyPanel` (full-width row below). This is the "todo demasiado desordenado" core: order management, staff provisioning, and discrepancy resolution share one dashboard with no navigation between them.
- `/bodega` (`frontend/app/bodega/page.tsx`) — `<RequireRole roles={["bodega","admin"]}>`. Single card, "Cola de preparación": orders filtered in-client to `QUEEUE_STATUSES = pending|processing|ready|discrepancy` from `GET /api/staff/orders/`; actions: advance (pending→processing→ready) and flag discrepancy (missing/damaged). **No inventory/stock data and no sales flow anywhere.**
- `/despacho` (`frontend/app/despacho/page.tsx`) — `<RequireRole roles={["despacho","admin"]}>`. Single card "Cola de despacho": orders filtered to `ready|shipped|delivered`; advance ready→shipped→delivered. **No delivery-route concept or display** — only a flat, per-order table showing `shipping_city` per row.
- No `(storefront)` route group exists; storefront lives at root routes (`/`, `/products`, `/products/[id]`, `/cart`, `/checkout`, `/login`, `/register`, `/profile`, `/orders`). `/orders` is the customer "Mis pedidos" page.

**Navigation and guards.** `Navbar.tsx` `STAFF_LINKS` map: admin → `/admin`, `/bodega`, `/despacho`; bodega → `/bodega`; despacho → `/despacho`; customer → none. `frontend/components/RequireRole.tsx` + `useRole()` (`frontend/lib/auth-context.tsx`) supply the UX role check. No `middleware.ts`; token lives in localStorage, so server-side guards are impossible — enforcement is DRF permissions (`backend/users/permissions.py`: `IsAdmin`, `IsBodega`, `IsDespacho`, `IsStaffRole`, `get_user_role`).

**Data layer (frontend `lib/api.ts`).** Staff surface consumes: `getStaffOrders` → `GET /api/staff/orders/` (returns ALL orders, unbounded), `advanceOrder`, `cancelOrder`, `flagDiscrepancy`, `resolveDiscrepancy`, `createStaffUser` → `POST /api/staff/users/` (creation ONLY — no list). Product inventory is reachable through the public storefront contract: `getProducts` → `GET /api/products/` (each product carries `stock`) and `getCategories`. No dedicated inventory/stock endpoint, no sales-flow/metrics endpoint, no staff-user list endpoint.

**Backend models/endpoints.**

- `Order` (`backend/orders/models.py`) — status flow `pending→processing→ready→shipped→delivered` plus lateral `discrepancy` and `cancelled`; shipping fields `shipping_name/address/city/postal_code/phone`. **No delivery route, zone, or itinerary model exists anywhere** (grep for `route|zona|zone|delivery|ruta` matches only DRF routers).
- `OrderItem` — product, quantity, price (no stock snapshot beyond price).
- `Product` (`backend/products/models.py`) — plain `stock = IntegerField(default=0)`; decremented at checkout, restored on admin cancel via `_restore_order_stock` (F-expression). `ProductViewSet` is a full `ModelViewSet` under `IsStaffOrReadOnly` — staff can CRUD products via the API/Django admin, but there is **no frontend inventory-management page** and **no aggregation endpoint** (no low-stock list, no stock value, no units-sold summary). The `Sum`/`F` imports in `orders/views.py` are used only inside `create_from_cart` total computation.
- `StaffOrderViewSet` (`backend/orders/views.py:200`) — `ReadOnlyModelViewSet`, `IsStaffRole`, queryset `Order.objects.all()`; actions `advance` (role-scoped `ADVANCE_MATRIX`), `discrepancy` (bodega/admin), `resolve-discrepancy` (admin), `cancel` (admin, restores stock). `StaffOrderSerializer` adds `customer` username + `discrepancy_reason`.
- Staff users (`backend/users/views.py`) — `StaffUserCreateView` is **POST-only** at `/api/staff/users/`. Admin user ops: `UserDetailView` GET/PATCH `/api/users/{id}/` (role change via `UserRoleUpdateSerializer`). **No list endpoint for staff users** → the "create + summary in one screen" ask has no existing backend support.
- Roles: `UserProfile.role` (`customer|admin|bodega|despacho`), `is_staff` synced to `role=admin` at save (`backend/users/models.py`). Specs locked: `role-based-access`, `staff-admin-ui`, `order-state-machine`, `order-discrepancy`, `order-integrity` (`openspec/specs/`).

## Affected Areas

- `frontend/app/admin/page.tsx` — the 3-task mashup to split into single-task surfaces.
- `frontend/app/bodega/page.tsx` — add inventory (stock data) + sales-flow summary.
- `frontend/app/despacho/page.tsx` — add established-routes presentation (city-grouped or modeled routes).
- `frontend/components/admin/StaffUserForm.tsx` — becomes one half of a staff-management view; needs a staff summary list alongside.
- `frontend/components/admin/OrdersDashboard.tsx`, `DiscrepancyPanel.tsx` — move to their own task pages or keep as focused sections under separate routes.
- `frontend/components/Navbar.tsx` — extend role link map if new routes appear (e.g. `/admin/staff`, `/admin/orders`).
- `frontend/lib/api.ts` — new API functions (staff list; inventory/flow summaries; routes if modeled).
- `backend/users/views.py` + `staff_urls.py` — add admin-only `GET /api/staff/users/` (staff summary for the single view).
- `backend/orders/views.py` + `serializers.py` — optional lightweight aggregation endpoints (sales flow) and/or routes endpoint.
- `backend/orders/tests.py`, `backend/users/tests.py` — cover new endpoints and permissions (staff list admin-only, aggregation access).
- `openspec/specs/staff-admin-ui` — spec-locked navbar/routes contract; new route structure must update or extend it.

## Approaches

1. **Frontend-only reorganization (reuse existing endpoints)** — split `/admin` into single-task routes; bodega renders stock from `getProducts` and computes a sales-flow summary in-memory from `getStaffOrders`; despacho groups orders by `shipping_city` shown as ad-hoc "routes".
   - Pros: no data model changes; fastest to ship; directly addresses the "one task per screen" complaint; simple for a 3-role shop.
   - Cons: staff summary is impossible without a backend list endpoint (blocking the user's explicit create+summary example); in-client aggregation over the unbounded staff-orders payload does not scale; "established routes" stay cosmetic (grouping), not a persisted concept.
   - Effort: Medium

2. **Backend data support first** — add `GET /api/staff/users/` (admin), inventory summary + sales-flow aggregation endpoints, and a `DeliveryRoute` model (+ CRUD + assignment) before touching the UI.
   - Pros: real, correct data for every requested surface; "rutas establecidas" become first-class; keeps clients thin.
   - Cons: much larger change (new model, migrations, serializers, tests, admin wiring); risks over-engineering a UX reorganization; review budget likely exceeded → chained PRs mandatory.
   - Effort: High

3. **Hybrid (incremental, recommended)** — Restructure the frontend into single-task views first (frontend-heavy work in one slice), adding only the minimal backend `GET /api/staff/users/` so the staff view shows create + summary in one screen. Bodega inventory reuses the existing `getProducts` stock data; sales flow starts as summary counts computed from the staff-orders payload (or a tiny aggregation endpoint if a second slice is justified). Despacho routes start as city-grouped order views derived from existing `shipping_city` — defer a `DeliveryRoute` model until product confirms routes are pre-established entities to be managed, not a grouping of today's orders.
   - Pros: delivers all three concrete asks incrementally; each slice is reviewable within the 400-line budget (auto-chain fits); avoids speculative schema; keeps server-side enforcement patterns intact.
   - Cons: partial backend additions split across slices; the "establecidas" interpretation must be settled in proposal (model vs. derived grouping) or the routes slice needs a rework.
   - Effort: Medium (frontend slice) → Medium-High (if route model confirmed)

## Recommendation

**Approach 3 (hybrid, incremental).** The UX reorganization is primarily frontend: one task per route, staff view = create form + staff summary (requiring the one minimal backend addition `GET /api/staff/users/`, admin-only, consistent with `role-based-access`), bodega = inventory (stock from `/api/products/`) + sales-flow summary, despacho = routes-by-city grouping (reusing `shipping_city` already in every order). Treat a persisted `DeliveryRoute` model as a follow-up that only if product confirms "rutas establecidas" means managed, pre-configured routes. Backend aggregation endpoints (sales flow, low-stock) are only worth their weight if the frontend summary computations over `getStaffOrders` prove too heavy — note that endpoint already returns every order unbounded, so consider a pagination/aggregation fix regardless.

## Risks

- `GET /api/staff/orders/` returns ALL orders with items; every staff page filters in-client. Frontend-only aggregation for "sales flow" multiplies payload cost — a backend aggregation endpoint or pagination should accompany the flow feature.
- "Rutas establecidas" is ambiguous: derived grouping by `shipping_city` vs. a managed route entity. Shipping model does not exist today; the proposal must pin this down to avoid a redesign mid-change.
- New staff-list endpoint exposes username/email/role of staff — MUST be `IsAdmin`-only and aligned with the archived `role-based-access`/`admin-access-control` contracts.
- Review budget: the combined change easily exceeds 400 changed lines → chained PRs recommended (frontend reorg slice → staff list backend slice → bodega/despacho data slice).
- `staff-admin-ui` spec locks the current route set and navbar map; new routes (`/admin/staff`, etc.) require a delta spec update to keep the contract current.

## Ready for Proposal

Yes — with one clarification for the user: whether "rutas establecidas" (despacho) means (a) grouping today's orders by city, or (b) a managed delivery-route entity (model + assignment). Tell the user the staff-view example (create + summary in one screen) is fully supported but needs the small admin-only staff-list endpoint; everything else can start frontend-first.