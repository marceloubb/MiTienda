# Exploration: erp-domain-restructure

Change: reorganize MiTienda as an ERP in phases. This change covers PHASE 1 — structural ERP-domain restructure (module boundaries, package structure, naming, seams) with ZERO visible behavior change. It also maps the full ERP target and proposes the roadmap of subsequent capability changes.

Exploration date: 2026-09-20. Evidence: read directly from the working tree (branch `feat/staff-data-views` @ `e520af7`; `main` @ `83cb01f`). Read-only exploration; no code was modified.

---

## Current State

### Backend (Django 6.1.1 / DRF, SQLite) — 3 apps under `backend/` + config package `backend/mitienda/`

`INSTALLED_APPS` (settings.py): `products`, `orders`, `users`. Root `urls.py` mounts: products, orders, users, users.staff_urls, and `orders.urls.staff_router` under `/api/` and `/api/staff/`.

| App | Models | Views / endpoints | Permissions source |
|---|---|---|---|
| `users` | `UserProfile` (role: customer/admin/bodega/despacho; phone, address, city, postal_code; OneToOne → django `User`) | Register/Login/Logout/Profile views, `UserDetailView` (GET/PATCH role), `StaffUserView` (staff list/create) — `/api/users/…`, `/api/staff/users/` | `users/permissions.py`: `IsAdmin`, `IsBodega`, `IsDespacho`, `IsStaffRole`, `STAFF_ROLES`, `get_user_role()` |
| `products` | `Category`, `Product` (**incl. `stock` IntegerField**, price/original_price, is_featured) | `CategoryViewSet`, `ProductViewSet` + `featured`/`on_sale`/`by_category` — `/api/products/`, `/api/categories/` | **local `IsStaffOrReadOnly`** defined in `products/views.py` (keyed on `is_staff` flag) |
| `orders` | `Cart`, `CartItem`, `Order` (status machine pending→processing→ready→shipped→delivered + `discrepancy` lateral; shipping_* + payment_method snapshot; discrepancy_reason/pre_discrepancy_status), `OrderItem` | `CartViewSet` (add/remove/update/clear), `OrderViewSet.create_from_cart`, `StaffOrderViewSet` (`advance`, `discrepancy`, `resolve-discrepancy`, `cancel`; `ADVANCE_MATRIX`; `_restore_order_stock`) — `/api/cart/`, `/api/orders/`, `/api/staff/orders/` | `users.permissions` (`IsAdmin`, `IsBodega`, `IsStaffRole`, `get_user_role`) |

`users/signals.py` syncs `User.is_staff` ↔ `UserProfile.role == 'admin'` (single choke point plus Django-admin path closure).

**Cross-app dependency graph (imports, verified):**

```
users  ←── orders ──→ products
              └─ products.models.Product (2 FKs: CartItem, OrderItem)
              └─ products.serializers.ProductListSerializer
              └─ products.models.Product (stock mutation in views)
              └─ users.permissions (IsAdmin, IsBodega, IsStaffRole, get_user_role)
products.tests ──→ users.models.UserProfile   (test-only upward import)
mitienda.urls   ──→ orders.urls.staff_router  (composition root)
```

`users` imports nothing internal (base layer). `orders` is the composite domain. `products` is a base layer referenced by `orders`; only its tests reach into `users`.

Tests: `users/tests.py` (443 lines), `orders/tests.py` (752), `products/tests.py` (114), plus `mitienda/tests.py` (42, settings). Runner: `.venv\Scripts\python.exe manage.py test`.

### Frontend (Next.js 16 App Router / React 19 / Tailwind 4) — no test runner; gates are `next build` + lint

Route groups by role/feature (13 pages):

- Customer surfaces: `/` , `/products`, `/products/[id]`, `/cart`, `/checkout`, `/orders`, `/profile`, `/login`, `/register`
- Staff surfaces: `/admin` (redirect → `/admin/orders`), `/admin/orders`, `/admin/staff`, `/bodega`, `/despacho`

Components: `components/admin/` (`OrdersDashboard`, `DiscrepancyPanel`, `StaffManagementView`, `StaffUserForm`, `StaffUserList`, **`InventoryView`, `DispatchRoutesView`**), `components/ui/` (badge, button, card, separator, skeleton), shared `Navbar`, `ProductCard`, `RequireRole` (UX-only guard; enforcement is server-side DRF). Lib: `lib/api.ts` (all endpoints + types), `lib/auth-context.tsx` (auth + cart state), `lib/order-status.tsx`, `lib/category-icons.tsx`, `lib/utils.ts`.

Frontend domain contract is fully expressed in `lib/api.ts` (375 lines): types (`Product`, `Category`, `User`, `UserProfile`, `StaffUser`, `Cart`, `CartItem`, `Order`, `OrderItem`, `UserRole`, `OrderStatus`, `DiscrepancyReason`) and ~20 API functions covering products, categories, auth, profile, cart, orders, staff-orders, staff-users.

### Where boundaries are already clean

1. Backend app boundaries ≈ coarse ERP domains today: `users` = identity/access, `products` = catalog, `orders` = sales. Django's app seam already exists.
2. URL namespaces are clean and domain-scoped: `/api/products/`, `/api/categories/`, `/api/cart/`, `/api/orders/`, `/api/users/`, `/api/staff/…`.
3. Role permissions centralized in `users/permissions.py` (orders consumes them; only products diverges).
4. Order state machine centralized: `ADVANCE_MATRIX` + `Order.STATUS_CHOICES` + `StaffOrderViewSet` transitions; discrepancy lateral state is blocked by design (admin resolve-only).
5. Frontend role-route segregation already exists (`/admin/*`, `/bodega`, `/despacho`) with `RequireRole` UX guards and server-side enforcement.
6. Reusable UI primitives isolated in `components/ui/`.

### Where boundaries are blurred / mixed (the structural debt)

1. **Inventory lives inside catalog and mutates from sales.** `stock` is an IntegerField on `products.Product`; decrement happens in `orders.views.create_from_cart` and increment in `_restore_order_stock` (cancel). No stock-movement history. Inventory is not a domain — it is a field + client-side bodega UI.
2. **Two permission sources.** `products/views.py` defines its own `IsStaffOrReadOnly` (keyed on `is_staff`), while `orders`/`users` use role-based permissions. Net effect today: catalog writes = `is_staff` = admin only (because `UserProfile.save` keeps them in sync), but the mechanism is duplicated and divergent.
3. **Stock rule enforced in 3 places.** `_check_stock` (`orders/serializers.py`), inline in `CartViewSet.add_item`, inline in `OrderViewSet.create_from_cart` (with row locks). Same rule, three copies.
4. **Frontend bucket misnaming.** `components/admin/` hosts NON-admin surfaces: `InventoryView` (rendered by `/bodega`), `DispatchRoutesView` (rendered by `/despacho`). The folder is a "staff-operations" dump, not an admin bucket.
5. **Monolithic API client.** `lib/api.ts` mixes transport, all endpoints, and all types in one 375-line file; `lib/auth-context.tsx` also owns cart state (auth and cart concerns in one provider).
6. **Checkout duplicates profile data.** `CreateOrderSerializer` shipping_* fields mirror `UserProfile` address/city/postal_code/phone but are independent snapshots by design; the structural seam (customer data vs order snapshot) is not named.

---

## Target ERP Domain Map

Justified modules for a single-store tools/materials retailer with internal ops staff (admin/bodega/despacho). NOT padded: only domains with existing code, data, or a concrete near-term need.

| # | ERP domain | Current coverage | Structural (P1) gap | Capability (later) gap | Type |
|---|---|---|---|---|---|
| 1 | **identity-access** (`users`) | Auth (register/login/logout/token/2FA/throttling), profile, roles, staff mgmt, permission classes | None — already bounded | Staff-action audit log; fine-grained per-module permissions (only if multi-tenant/roles grow) | structural now, capability later |
| 2 | **catalog** (`products`) | Category, Product, pricing (price/original_price/discount), featured/on-sale, search/filter | Permission-source seam (local `IsStaffOrReadOnly` vs role model); `stock` field resident here (D) | SKU/barcode, tax rates, supplier link (tied to procurement) | structural now, capability later |
| 3 | **sales** (`orders` + cart) | Cart, checkout, order state machine, discrepancy lateral state, staff queues | Consolidate stock rule (3 copies → 1); extract stock mutation to a seam (D) | Invoices, payment tracking, returns/refunds with restock | structural now, capability later |
| 4 | **inventory** (no backend) | `stock` int on Product; bodega UI `InventoryView` computing low-stock + 7-day flow CLIENT-SIDE from `getStaffOrders` | Name the seam; inventory concerns currently ride in products (data) + orders (mutations) + frontend (view) | Stock-movement ledger, server-side low-stock/flow aggregation, warehouse/zones if needed | capability (no domain exists today) |
| 5 | **fulfillment/dispatch** (no backend) | Roles bodega/despacho + `ADVANCE_MATRIX` transitions + `DispatchRoutesView` (client city-grouping of ready orders) | Name the seam; dispatch is currently role-state only | Routes/carriers, delivery tracking/history backend | capability (no domain exists today) |
| 6 | **customers/CRM** (no backend) | Customer = django `User` + `UserProfile` (address), `Order` shipping snapshot, `StaffOrderSerializer.customer` | Name the seam (customer entity vs order snapshot) | Address book, staff customer detail, purchase history | capability, conditional on product decision |
| 7 | **procurement/suppliers** | — | — | Suppliers, purchase orders, restock workflow | NOT justified yet — parked. Only if the ERP target is real |

(D) = deferred structural item that touches schema or behavior; intentionally NOT in phase 1.

---

## Gap Assessment

### Structural gaps — what blocks the ERP-shaped codebase (phase 1 scope)

- G1. Frontend component bucket `components/admin/` does not match domains (contains warehouse + dispatch views).
- G2. Frontend customer vs staff surfaces are route-segregated but NOT layout-segregated (no `(customer)` / `(staff)` route groups; no shared staff shell).
- G3. `lib/api.ts` monolith — no per-domain modules.
- G4. Backend stock rule triplicated (`_check_stock` + 2 inline copies).
- G5. Backend permission-source duplication (products local `IsStaffOrReadOnly` vs `users.permissions`).
- G6. No documented module-boundary contract (nothing prevents future cross-domain imports; only convention does).
- G7. No ERP naming convention (domain names vs app labels across backend/frontend).

### Capability gaps — what is missing to reach real ERP capabilities (later phases)

- C1. No inventory ledger / stock-movement history; low-stock & flow derived client-side.
- C2. No dispatch domain backend (routes, carriers, history) — only role-scoped status transitions.
- C3. No invoices, payment state, or returns/refunds (sales capability incomplete).
- C4. No customer domain beyond the auth-profile (no address book, staff customer views, purchase history).
- C5. No procurement/suppliers (parked unless product target demands it).
- C6. No staff-action audit trail (compliance/ops visibility).

Capability gaps stay OUT of phase 1 (non-goals). They shape the roadmap only.

---

## Phase-1 Scope Proposal (change: erp-domain-restructure)

### Recommendation: incremental, frontend-first + backend seam-documenting pass. NO app renames, NO schema changes.

The honest finding: the backend is already domain-shaped at the coarse grain (users/products/orders ≈ identity/catalog/sales). The real structural debt is (a) frontend organization, (b) unpoliced seams, (c) duplicate rule/permission sources, (d) unnamed future domains (inventory, dispatch). Phase 1 fixes a–d structurally; capability domains become changes C2+ in the roadmap.

### Backend work (behavior-neutral only; optional items flagged)

| Item | Action | Behavior change? |
|---|---|---|
| B1 | Consolidate the stock rule into a single helper (e.g. `orders/services/stock.py`) used by `add_item`, `update_item`, `create_from_cart`. | No (internal refactor; test-suite is the gate) |
| B2 | Add a **module-boundary enforcement test**: assert the dependency contract `users ← orders → products`, `products MUST NOT import users`, `products MUST NOT import orders`, wiring only via `mitienda.urls`. Structural test; no app behavior change. | No |
| B3 | Document the `IsStaffOrReadOnly` vs role-permissions seam in code + specs; DO NOT reconcile it in phase 1 (reconciling = permission behavior change). Deferred to a capability change or explicit decision. | No |
| B4 | Name the future seams (inventory, dispatch, customers) in the module contract; **no new apps, no models, no migrations, no settings churn**. | No |

### Frontend work (URL-neutral)

| Item | Action | Behavior change? |
|---|---|---|
| F1 | Introduce Next.js **route groups** `app/(customer)/…` and `app/(staff)/…`. Route groups do NOT change URLs. Enables a shared staff shell later. | No (URLs identical) |
| F2 | Split `components/admin/` by domain: `InventoryView` → `components/inventory/`, `DispatchRoutesView` → `components/dispatch/`; keep admin-only components under `components/admin/` (or a renamed `components/staff/`). Pure file moves + import updates. | No |
| F3 | Split `lib/api.ts` into per-domain modules (`client.ts`, `products.ts`, `orders.ts`, `users.ts`, `staff.ts`, `types.ts`) behind a barrel `lib/api/index.ts` so all existing imports keep working. | No |

### Explicit non-goals (phase 1)

- NO new ERP features (inventory ledger, suppliers, invoices, CRM, audit).
- NO DB/schema changes — no migrations, no new models, `Product.stock` stays put.
- NO backend app renames/packages moves (`products`/`orders`/`users` labels stay).
- NO URL changes (frontend or API), no permission behavior changes, no new dependencies.
- Frontend gates stay `next build` + lint (adding a frontend test runner is out of scope).

### Migration / sequencing approach (keep tests green throughout)

1. Module contract + naming convention (openspec baseline spec + B2 structural test) — establishes the rules before the moves.
2. F1 route groups (URL-neutral).
3. F2 component bucket split.
4. F3 API client split.
5. B1 stock-rule consolidation + B3 seam documentation.
Gate after EVERY commit: `backend/.venv\Scripts\python.exe manage.py test` (must stay green) and frontend `next build` + `npm run lint`. Each slice is small, self-contained, and independently verifiable — incremental, NOT big-bang. Expected review-load: broad file-move churn → chained PRs recommended (see Risks).

### Approaches considered

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| **A. Incremental frontend-first + seam tests (RECOMMENDED)** | Zero behavior risk; tests/build green at every step; produces enforceable boundary contract; capability changes C2+ land on clean seams | Moves don't change runtime behavior (feels small for the ambition); backend mostly unchanged | Medium |
| B. Big-bang full reorg (move apps to `catalog`/`sales`/`identity` packages, new app dirs, route-group everything in one change) | Maximum "ERP-looking" diff | Massive churn: imports, migrations/app_label risk, test rewrites, 400-line budget blown in one PR, high regression risk with no frontend test runner | High |
| C. Backend-only reorg (rename apps, extract new empty domains) | Clean backend module names | Behavior-neutral renames deliver little; empty apps = dead code; migration churn; skips the real frontend debt | Low value |

---

## Roadmap of Subsequent Changes (3–6, dependency-ordered)

| # | Change | Intent (one line) | Depends on | OPEN product decision |
|---|---|---|---|---|
| C2 | `erp-inventory` | Inventory domain: stock-movement ledger + server-side low-stock/flow for bodega; inventory logic extracted out of orders/products | C1 seams (B2/B4) | Ledger vs keep simple int? (design) |
| C3 | `erp-fulfillment` | Dispatch domain backend: routes/carriers/history; despacho UI server-backed | C1; sequenced after C2 to avoid concurrent churn on the order domain | Is carrier/route management needed, or is city-grouping enough? |
| C4 | `erp-sales-invoicing` | Invoices, payment state on orders, returns/refunds with stock restock | C1 + C2 (restock path) | **CFDI/invoice compliance (Mexico) required?** |
| C5 | `erp-customers` | Customers/CRM: address book, staff customer detail, purchase history | C1 | Is staff-side customer management in scope? |
| C6 | `erp-procurement` | Suppliers, purchase orders, restock workflows | C2 + catalog (SKU later) | **Is procurement in scope at all?** |
| (optional) | `erp-audit-log` | Staff-action audit trail (who advanced/cancelled/flagged what) | C1 | Fold into each change vs standalone? |

C2–C4 form the core ERP loop (sell → have stock → deliver). C5/C6 are conditional on product decisions. The optional audit change may be folded into C2–C4 instead of standalone.

---

## Risks

1. **Behavior drift during "pure structure" work.** Any consolidation (B1) or move can subtly change error messages, ordering, or edge-case behavior. Mitigation: backend test suite (1309 lines across app tests) is the gate after every commit; frontend has NO test runner, so staff/customer pages must pass `next build` + lint and a manual smoke pass — flag that a frontend smoke checklist is needed.
2. **Worktree state is NOT clean.** Current checkout is `feat/staff-data-views` @ `e520af7` with UNCOMMITTED baseline-spec edits (`env-settings`, `order-integrity`, `staff-admin-ui`, `staff-or-read-only`: +168/−33) and untracked `openspec/changes/archive/*` folders. Before `propose`/`apply`, the orchestrator must reconcile this state and branch the new change from a clean base (`main` @ `83cb01f`).
3. **Backend app-rename temptation.** Renaming `products`→`catalog` etc. is high-churn (imports, migrations/app_label, tests) with zero runtime payoff; phase 1 explicitly does NOT do it (approach B rejected).
4. **400-line review budget.** Many small file moves inflate diff counts without behavior. Forecast: Medium–High risk → chained/stacked PRs recommended (consistent with this repo's track record of 3–6 slice chains).
5. **CodeGraph index staleness.** Index currently lags the checked-out branch (recent checkout); structural conclusions were verified by direct reads. Re-sync (`codegraph sync`) after the branch base is resolved.

---

## Open Decisions (product/scope — MUST be answered before `propose`)

1. **Is MiTienda a real ERP product target (production intent) or an architecture/training exercise?** — decides whether C2–C6 get fully built or skeleton-only, and whether C5/C6 exist at all.
2. **Which ERP domains are in near-term scope?** (e.g. inventory + fulfillment only for now?) — decides which roadmap changes become real vs parked.
3. **Multi-tenant or single-tenant?** — shapes identity/permissions depth and future schema decisions.
4. **Keep the current backend app names (`products`/`orders`/`users`) or rename to ERP-aligned labels (`catalog`/`sales`/`identity`)?** Default: keep (renames are high-churn, zero behavior value).
5. **Is CFDI/invoice compliance (Mexico) required when sales-invoicing lands (C4)?** — shapes C4 scope substantially.

---

## Affected Areas (phase 1)

- `frontend/components/admin/` — InventoryView → `components/inventory/`, DispatchRoutesView → `components/dispatch/` (F2)
- `frontend/app/{products,cart,checkout,orders,profile,login,register}/` + `frontend/app/{admin,bodega,despacho}/` — route-group move, URLs unchanged (F1)
- `frontend/lib/api.ts` — split into per-domain modules behind barrel (F3)
- `backend/orders/{serializers,views}.py` — stock-rule consolidation (B1)
- `backend/orders/tests.py`, `backend/mitienda/tests.py` — structural boundary test (B2)
- `backend/products/views.py` — document permission seam (B3)
- `openspec/specs/` — new module-boundary contract spec (B2/B4)

## Ready for Proposal

**Yes** — exploration is complete and evidence-grounded. `propose` can proceed once the orchestrator collects the 5 open decisions above (real-ERP-vs-exercise is the critical fork: it changes the roadmap's shape) and reconciles the uncommitted worktree state before branching.