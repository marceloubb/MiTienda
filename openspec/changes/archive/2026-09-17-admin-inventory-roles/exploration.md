## Exploration: admin-inventory-roles

Storefront admin (store + inventory management), bodega (warehouse preparation) and despacho (dispatch/shipping) profiles for MiTienda.

### Current State

**Inventory / products.** `Product` has a plain `stock` IntegerField (`backend/products/models.py:28`). Stock is validated at three points: cart `add_item` (rejects when `product.stock < quantity`), `update_item` (serializer `_check_stock`), and checkout (re-validates inside `transaction.atomic()` with `select_for_update`). The decrement happens **at order creation** in the atomic checkout block (`backend/orders/views.py:156-159`). There is **no stock restoration path**: no cancellation endpoint exists anywhere in the API, so a cancelled order's stock can only be restored manually via Django admin product edits.

**Auth & roles.** Django default `User` + `UserProfile` (phone, address, city, postal_code) — no role concept. `UserSerializer` exposes `id, username, email, first_name, last_name, profile`; **`is_staff` is NOT exposed** (`backend/users/serializers.py:12-17`). DRF uses `TokenAuthentication` + `SessionAuthentication`, default permission `IsAuthenticatedOrReadOnly`. Register/Login return `{user, token}`; the frontend stores the token in `localStorage` (`frontend/lib/auth-context.tsx`). The frontend `User` type (`frontend/lib/api.ts:190-197`) has no role/staff info either.

**Orders.** `OrderViewSet` is a `ReadOnlyModelViewSet` scoped to `request.user` — each user sees only their own orders. The only write path is `create_from_cart` (atomic checkout). **No status-transition endpoint exists**: `pending → processing → shipped → delivered` (+ `cancelled` lateral) are only mutable through Django admin. Order serializers expose shipping data, payment method and notes to the owner.

**Staff-write precedent.** Commit `dfb2f48` added `IsStaffOrReadOnly` + `StaffWriteDeniedViewMixin` (`backend/products/views.py:12-23`): product/category writes require `is_staff`, and denied writes force 403 instead of 401. Archived spec `staff-or-read-only`. This is the existing primitive the admin role builds on.

**Frontend.** Next.js App Router, `AuthProvider` wraps the root layout, pages guard client-side (`app/orders/page.tsx` redirects to `/login` when `!user`). No `middleware.ts`; auth is token-in-localStorage so **middleware/server guards cannot see credentials** — route protection is a UX concern, real enforcement MUST live in DRF permissions. Routes today: `/`, `/products`, `/products/[id]`, `/cart`, `/checkout`, `/login`, `/register`, `/orders`, `/profile`. Navbar shows cart/orders/profile links only; no staff surfaces.

### Affected Areas

- `backend/users/models.py` — add `role` to `UserProfile` (+ migration)
- `backend/users/serializers.py` — expose `role` (+ `is_staff`) in `UserSerializer`
- `backend/users/permissions.py` (new) — role permission classes (`IsAdmin`, `IsBodega`, `IsDespacho`)
- `backend/orders/models.py` — optional new `ready` status choice; cancellation/stock-restore helper
- `backend/orders/views.py` — new staff order-management viewset: all-orders queryset, role-scoped status transitions, cancel action (with `select_for_update` on the order row)
- `backend/orders/serializers.py` — staff order serializer (customer username, stock-aware data)
- `backend/orders/urls.py`, `backend/mitienda/urls.py` — wire the staff surface (e.g. `/api/staff/orders/`)
- `backend/{orders,users}/tests.py` — role-guard and transition regression tests
- `frontend/lib/api.ts` — `User.role` (+ `is_staff`), staff order APIs
- `frontend/lib/auth-context.tsx` — role flows through existing `user`
- `frontend/components/Navbar.tsx` — role-conditional links
- `frontend/components/RequireRole.tsx` (new) + `frontend/app/admin/*`, `frontend/app/bodega/*`, `frontend/app/despacho/*` — guarded routes

### Approaches

#### 1. Role modeling

**A. Django Groups + model permissions** — create `Admin`/`Bodega`/`Despacho` groups, gate views via `has_perm` / `DjangoModelPermissions`.
- Pros: granular capability grants; integrates with Django admin out of the box; standard Django idiom; future capabilities (e.g. "cancel-only") map to permissions.
- Cons: exclusivity is NOT structural — nothing stops a user being in two groups, so a policy/check is needed anyway; serializer must map groups → frontend role (denormalization + query cost); heavier ceremony for a 3-role shop; permission checks scattered across viewsets.
- Effort: Medium

**B. Role field on `UserProfile`** — `role = CharField(choices=customer|admin|bodega|despacho, default=customer)`.
- Pros: exclusivity by construction (single value); trivially exposed in `UserSerializer` and the frontend `User` type; simple DRF permission classes that check `user.profile.role`; minimal migration; dead-simple to seed/backfill.
- Cons: not granular — a future "cancel permission only for bodega, not despacho" needs extra booleans or a later migration to groups; role changes are admin-only operations (acceptable at this scale).
- Effort: Low

**C. Hybrid (recommended)** — role field on `UserProfile` as the single source of truth for the three operational roles; keep `is_staff` as the Django-admin/staff-write marker, **synced to `role=admin`** (enforced at save or via data migration). Bodega/despacho are NOT `is_staff` (no Django admin, no product writes — preserves the archived `staff-or-read-only` contract verbatim). Central `users/permissions.py` with `IsAdmin`, `IsBodega`, `IsDespacho`, `IsStaffRole(admin|bodega|despacho)`.
- Pros: exclusivity + serializer simplicity + existing staff-write contract untouched; one obvious permission per surface; `is_staff` keeps meaning "can touch Django admin and product writes".
- Cons: two flags exist (`is_staff`, `role`) — need a documented sync rule to prevent drift (admin must imply `is_staff=True`).
- Effort: Low-Medium

**Recommendation: Option C.** Django Groups add ceremony without paying for it at 3 mutually-exclusive roles in a single-store shop. The role field gives structural exclusivity and a trivial frontend contract; `is_staff` remains the admin marker consistent with the shipped `staff-or-read-only` spec.

#### 2. Stock decrement timing

**A. At checkout (current behavior)** — decrement inside the atomic `create_from_cart` block.
- Pros: already implemented and spec-locked (`order-integrity`: atomic checkout, stock re-validation, rollback); prevents overselling; one source of truth.
- Cons: cancellation must restore stock (new logic); bodega sees committed numbers, not physical shelf reality (shrinkage/damage at pick time isn't tracked); no adjustment channel except product PATCH by admin.
- Effort: Low (keep) + cancel-restore (Medium)

**B. At bodega prep** — re-check physical stock and decrement when the bodega starts/records picking.
- Pros: numbers reflect physical reality at pick time; cancels before prep never touch stock.
- Cons: overselling window between checkout and prep (two customers can commit the same last unit; checkout can only "soft" check); checkout no longer atomic by itself; partial/return handling complexity; **breaks the archived `order-integrity` spec** (rewrite + retest).
- Effort: High

**C. At despacho/shipment** — worst-case window, identical complexity to B with a longer exposure. Not viable.

**Recommendation: Option A — keep checkout-time decrement.** It is the industry-standard, already-shipped, spec-locked behavior. Add: (1) stock **restore on cancel** (unconditional, since every order decremented at checkout), (2) bodega pick verifies quantities against reality, (3) discrepancies (missing/damaged) are handled by admin manual stock PATCH — keeps bodega UI simple and the inventory contract intact.

### Proposed Order State Machine

```
customer checkout            bodega                    bodega            despacho             despacho
pending  ──────────────►  processing  ───────────►  ready(1)  ───────►  shipped  ──────────►  delivered
   ▲                         │                         │
   └───────── cancelled ◄────┴─────────────────────────┘        (admin-only cancel; stock restore + return handling)
```

1. `ready` ("Listo para despacho") is a **new** status making the bodega→despacho handoff explicit. Without it, `processing → shipped` is ambiguous (does the bodega pack AND ship, or does the despacho take over?).
2. Transitions by role: bodega does `pending → processing` and `processing → ready`; despacho does `ready → shipped` and `shipped → delivered`.
3. Cancel rules (to confirm with user):
   - `pending`/`processing`/`ready`: cancellable by admin (and optionally bodega for its own queue; optionally customer self-service at `pending`).
   - `shipped`/`delivered`: **admin-only**, and it is a logistics decision (physical return) — not a plain revert.
   - Every cancel **restores stock** (always valid because decrement happens at checkout).
4. Each transition must `select_for_update()` the order row inside a transaction to avoid two staff users racing the same order (SQLite single-writer mitigates, but the pattern is correct).

### Proposed Frontend Structure

| Route | Role | Purpose |
|---|---|---|
| `/admin` | admin | Product/category CRUD, stock adjustments, all-orders overview + cancel |
| `/bodega` | bodega | Order queue filtered to `pending/processing/ready`; mark `processing`/`ready`; pick list (items + quantities) |
| `/despacho` | despacho | Queue filtered to `ready/shipped`; mark `shipped`/`delivered`; shipping info + phone |

- **Guards**: client-side `RequireRole role="bodega"` wrapper following the existing redirect pattern (`app/orders/page.tsx`); redirect unauthorized users to `/login` (or a 403 state). Because the token lives in `localStorage`, **Next middleware cannot authenticate** — treat client guards as UX only and enforce every transition server-side via the DRF permission classes (403 on violation).
- Navbar: conditional links when `user.role` matches; the `User` type gains `role` + `is_staff`.
- Reuse design system as-is (tokens, shadcn/ui base-nova, sileo toasts, Badge status maps in `app/orders/page.tsx` — extend `ORDER_STATUS_STYLES` with `ready`).

### Open Questions (need product decisions)

1. **Exclusivity**: can one person hold bodega AND despacho at the same time (small-shop reality)? Single role field assumes exclusive; if users may hold multiple, we need multiple/multi-select modeling instead.
2. **Admin as operator**: may the admin also perform bodega/despacho actions in the UI, or strictly separate surfaces?
3. **Cancellation policy**: who cancels at which statuses? Does cancel always restore stock (it will, given checkout decrement), and what is the process for cancelling after shipment (physical return)?
4. **`ready` status**: accept adding "Listo para despacho", or keep 5 statuses and let despacho take `processing → shipped` directly?
5. **Customer self-cancel**: should customers cancel their own `pending` orders from order history (new capability the user did not mention)?
6. **Pick discrepancy**: if bodega finds missing/damaged items during prep, do they flag the order (and what happens to it) or is it admin-only stock adjustment?
7. **Staff provisioning**: staff accounts created only via Django admin, or also via a guarded endpoint in the storefront admin?
8. **Cash on delivery**: `payment_method` includes `cash`; does despacho collect payment on delivery and record it? (No payment-status tracking exists today — separate concern, may be out of scope.)

### Recommendation

Profile-role field with admin≡`is_staff` sync, checkout-time stock decrement + cancel-restore, new `ready` handoff status, backend-enforced DRF role permissions with client-side route guards for UX, routes `/admin`, `/bodega`, `/despacho`. Overall scope is large (~backend model+migration+viewset+serializers+tests, plus 3 frontend route groups) — expect the tasks forecast to need **chained PRs** well over the 400-line review budget, with backend roles/state machine first.

### Risks

- **Rote client-side-only enforcement** (High if done): guards can be bypassed; every transition endpoint MUST be permission-checked server-side.
- **Stock/decrement semantics drift** (Medium): moving decrement would break the archived `order-integrity` spec — scope excludes it.
- **Concurrent transitions** (Low-Medium): two staff updating the same order — mitigate with `select_for_update`.
- **`ready` status ripple** (Low): badge maps, order-history filters, seed data need the new choice.
- **Existing users backfill** (Medium): migration defaults `role=customer`; every existing `is_staff` user needs `role=admin` backfill or they lose product-write → Django-admin access.
- **`is_staff`/`role` drift** (Low-Medium): sync rule needed at save time.
- **Review budget** (Medium-High): forecast ~700-900 authored lines → chained PRs required.

### Ready for Proposal

Yes — but the proposal must carry the 8 open questions above as user decisions (especially #1 exclusivity, #3 cancellation policy, #4 `ready` status), since they change the state machine and data model.