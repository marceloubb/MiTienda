# Apply Progress — frontend-vibrant-redesign

Delivery: `auto-chain` / `feature-branch-chain`. PRs are the orchestrator's job — none created.
Review budget: 400 changed lines per slice.

Slices 1–4 complete. Task 1.4 (the last remaining item of slice 1) complete. Slice 5 (2FA) not started.

## Cumulative task state

| Task | State | Work unit |
|---|---|---|
| 1.1 Vibrant `:root` tokens in `globals.css` | [x] | slice 1 |
| 1.2 `next/font` PJS + Inter in `layout.tsx` | [x] | slice 1 |
| 1.3 `frontend/lib/icons.ts` lucide map | [x] | slice 1 |
| 1.4 Radius ramp on `components/ui/*` | [x] | slice 1 (deferred, this unit) |
| 2.1–2.5 `OrderEvent` model, migration, views, serializers, tests | [x] | slice 2 |
| 3.1–3.6 Customer routes (home, catalog, detail, cart, checkout, orders, tracking) | [x] | slice 3 |
| 4.1–4.4 Staff routes (admin/orders, bodega, despacho, admin/staff, profile, register) | [x] | slice 4 |
| 5.1–5.4 Admin 2FA + login TOTP | [ ] | slice 5 (not started) |

---

## Slice 1 — Design system (branch `feat/vibrant-redesign-slice1-design-system`)

- [x] 1.1 `frontend/app/globals.css` — Vibrant Retail Clean `:root` ramp from `docs/designs/DESIGN.md` (read-only): `--primary #00288e` (+hover `#1d4ed8`), `--stock #006c49`, `--stock-low #92400e` (+badge bg `#fffbeb`), `--offer #065f46`, `--destructive/--error #ba1a1a`, surfaces `#fff/#f2f3ff/#eaedff`, background `#faf8ff`, on-surface `#131b2e`, `--outline-variant #c4c5d5`, `--outline #757684`, ring `#00288e`; legacy names mapped, never renamed; `@theme inline` keeps utilities. `--radius: 0.5rem`; radius ramp registered as `--radius-sm .25 / md .375 / lg .5 / xl .75 / 2xl 1 / 3xl 1.5 / 4xl 2`.
- [x] 1.2 `frontend/app/layout.tsx` — next/font PJS `--font-jakarta` + Inter `--font-inter`; Geist dropped; `--font-sans/--font-heading`=jakarta, `--font-label`=Inter; body `bg-background`. No `user-scalable=no`.
- [x] 1.3 `frontend/lib/icons.ts` (new) — `materialToLucide` map: arrow_back→ArrowLeft, local_shipping→Truck, route→Route, schedule→Clock, check→Check, shopping_bag→ShoppingBag, qr_code_scanner→QrCode, navigation→Navigation + `materialIcon(name)`.
- [x] 1.4 Radius ramp on `frontend/components/ui/*` — see dedicated section below (deferred from the original slice-1 batch because slices 2–4 shipped first and passed radius via `className` overrides).

### Foundation fix recorded in slice 3
`globals.css` `@theme inline` was missing `--color-on-primary`, `--color-secondary-container`, `--color-on-secondary-container`, `--color-on-secondary`. Tailwind 4 generates no CSS for unregistered theme keys, so those DESIGN.md tokens existed only as raw CSS vars and every badge/CTA using them rendered unstyled. Fixed and verified in the compiled `.next/static/chunks/*.css`.

---

## Slice 2 — OrderEvent backend (branch `feat/vibrant-redesign-slice2-order-events`)

- [x] 2.1 `backend/orders/models.py` — `OrderEvent`: FK `order` (`related_name='events'`, CASCADE), `event_type` choices created/advanced/discrepancy/resolved/cancelled, `from_status` (null, blank), `to_status`, `timestamp` DateTimeField `default=timezone.now, editable=False` (server clock), Meta `ordering=['timestamp','id']` + index `(order,timestamp)`.
- [x] 2.2 `backend/orders/migrations/0004_orderevent.py` — CreateModel + AddIndex + RunPython backfill (`created` from `created_at`, skips orders already having events, batch 500; reverse `RunPython.noop`).
- [x] 2.3 `backend/orders/views.py` — 5 in-transaction appends inside the existing `transaction.atomic()` blocks, all after 403/400 guard returns.
- [x] 2.4 `backend/orders/serializers.py` — `OrderEventSerializer`; `events` on `OrderSerializer`, inherited by `StaffOrderSerializer`; ascending via Meta ordering; cross-user 404 via user-scoped queryset.
- [x] 2.5 `backend/orders/tests.py` — 20 new tests: model/ordering/server-clock, `MigrationExecutor` backfill, atomic transition appends + 7 rejection paths, serializer timeline + cross-user 404.

**Verification (slice 2 gate)**: `..\backend\.venv\Scripts\python.exe manage.py test orders` — 80 tests, **OK (skipped=1)**. `makemigrations --check --dry-run` — **No changes detected**. `migrate` — `orders.0004_orderevent OK`.

**Work-unit commits**: `c909177`, `21cba0f`, `b73338c`, `c0e72d9`.
**Rollback**: `manage.py migrate orders 0003`; or revert `views.py`/`serializers.py`/`tests.py`.
**Review budget**: 497 changed lines → `size:exception` (tests alone are 353).

---

## Slice 3 — Customer routes (branch `feat/vibrant-redesign-slice3-customer-routes`)

- [x] 3.1 Token restyle of `app/page.tsx`, `app/products/page.tsx`, `app/products/[id]/page.tsx`, `components/ProductCard.tsx`; sale/low-stock semantics kept.
- [x] 3.2 `app/cart/page.tsx` restyle; coupon UI cut (none existed).
- [x] 3.3 4-step `CheckoutWizard` in `app/checkout/page.tsx` (Envío→Pago→Revisión→Confirmación) — full rewrite.
- [x] 3.4 `app/orders/page.tsx` — history tabs (Todos/En curso/Entregados/Cancelados) + `OrderCard`.
- [x] 3.5 NEW `app/orders/[id]/page.tsx` + `DeliveryTimeline` — 5-step timeline from `events`; timestamps only from OrderEvent; foreign order → redirect; terminal cancelled/discrepancy.
- [x] 3.6 `DeliveredDetail` + `RebuyButton` (delivered only).
- [x] Prerequisite types in `lib/api.ts`: `OrderEventType`, `OrderEvent`, `Order.events`. **Deviation**: tasks.md lists these under 5.1, but `/orders/[id]` needs them at compile time, so they landed in slice 3. Task 5.1 retains only its own deltas (APIError.code, TOTP helpers).

**Verification (slice 3 gate)**: `npm run build` — exit 0, `✓ Compiled successfully in 1161ms`, 15 routes. `npm run lint` — exit 0, `✖ 4 problems (0 errors, 4 warnings)` (pre-existing `<img>`). `manage.py test orders` — 80 tests OK (skipped=1), no backend touched.

**Work-unit commits**: `23b8bc1`, `c11d5ae`, `cfac379`, `f9a152e`, `7821387`, `edcc194`, `b8db3ad`.
**Review budget**: ~1,581 changed lines → `size:exception`.

---

## Slice 4 — Staff routes (branch `feat/vibrant-redesign-slice4-staff-routes`)

- [x] 4.1 NEW `StaffKpiRow.tsx` + `StatusFilterChips.tsx`; `OrdersDashboard.tsx` wired with KPI row, chips, `DiscrepancyModal`; `DiscrepancyPanel.tsx` restyled; `app/admin/orders/page.tsx` header tokens.
- [x] 4.2 `app/bodega/page.tsx` full restyle + `InventoryView.tsx` / `DispatchRoutesView.tsx`; `app/despacho/page.tsx` was already token-clean → no changes.
- [x] 4.3 `StaffUserForm.tsx` / `StaffUserList.tsx` restyle; `app/admin/staff/page.tsx` + `StaffManagementView.tsx` already clean → no changes.
- [x] 4.4 `app/profile/page.tsx` + `app/register/page.tsx` restyle.

**Verification (slice 4 gate)**: `npm run lint` — exit 0, `✖ 4 problems (0 errors, 4 warnings)`. `npm run build` — exit 0, `✓ Compiled successfully in 1149ms`, 15 routes. `manage.py test orders` — 80 tests OK (skipped=1).
One TS error fixed during the slice: `DiscrepancyModal` destructured `order` param did not narrow inside the `handleSubmit` closure → added an explicit guard.

**Work-unit commits**: `1fedff8`, `923a0d8`, `bc84744`, `ac836c4`.
**Review budget**: 679 additions / 256 deletions → `size:exception`.

---

## Task 1.4 — Radius ramp on `components/ui/*` (this work unit)

Scope: `frontend/components/ui/*` only. No new dependencies, no new components, no backend, no 2FA work.

### Radius values used (single source of truth)

`spec.md` "Radius and Elevation Scale" + `docs/designs/DESIGN.md` "Shapes", resolved against the `@theme inline` radius ramp already registered in `globals.css`:

| Element | Class | Resolved value |
|---|---|---|
| Card | `rounded-2xl` | 1rem (DESIGN: 1rem–1.25rem) |
| Button (all sizes) | `rounded-xl` | 0.75rem (DESIGN: 12px) |
| Badge | `rounded-full` | 9999px (DESIGN: 9999px) |

### Files changed

| File | Change |
|---|---|
| `components/ui/card.tsx` | `Card` base `rounded-xl` → `rounded-2xl`; the two image corner clips `*:[img:first-child]:rounded-t-xl` / `*:[img:last-child]:rounded-b-xl` → `-2xl`; `CardHeader` `rounded-t-xl` → `rounded-t-2xl`; `CardFooter` `rounded-b-xl` → `rounded-b-2xl` |
| `components/ui/button.tsx` | base `rounded-lg` → `rounded-xl`; removed the four size-level `rounded-[min(var(--radius-md),10px|12px)]` overrides (xs, sm, icon-xs, icon-sm) that pinned small buttons to 6px; their paired `in-data-[slot=button-group]:rounded-lg` → `:rounded-xl` so a button group cannot lower the ramp |
| `components/ui/badge.tsx` | `rounded-4xl` → `rounded-full` |

### Deliberately not changed

- `components/ui/separator.tsx` — a 1px rule with no radius; the spec mapping does not cover it.
- `components/ui/skeleton.tsx` — `rounded-md` placeholders are not cards/buttons/inputs/badges; they stand in for arbitrary content and are shaped per usage. Outside the enumerated mapping, so left alone per "change only what task 1.4 requires".
- `components/Navbar.tsx` — its search/cart inputs still carry `rounded-lg`. It is a page surface but **not** under `components/ui/*`, so it is outside task 1.4's stated scope. **Open gap — see Risks.**
- `globals.css` — `--radius` is already `0.5rem` (≠ 0.625rem) and the full ramp is registered, so the spec scenario "`--radius` no longer equals 0.625rem" is already satisfied. That file belongs to task 1.1.

### Findings

1. **There is no input primitive in `components/ui/*`.** The directory contains exactly five files: `badge`, `button`, `card`, `separator`, `skeleton`. The "inputs rounded-xl" half of task 1.4 therefore has no primitive to restyle — the app's inputs already carry `rounded-xl` from slices 3/4 (verified: `app/products/page.tsx` search + select, `app/profile/page.tsx` inputClass, `app/register/page.tsx`, `StaffUserForm.tsx` fieldClasses). No input component was invented, since that would be new code rather than a restyle.
2. **The `min(var(--radius-md),Npx)` overrides were the real radius bug.** `--radius-md` resolves to `0.375rem`, so `min(6px, 10px)` / `min(6px, 12px)` both collapsed to 6px — `size="xs"`, `size="sm"`, `size="icon-xs"` and `size="icon-sm"` buttons were rendering at 6px regardless of the base value. Those four sizes are live in the app (20+ call sites, mostly `app/cart/page.tsx` and the staff/admin views), so leaving them would have made the "ramp" inconsistent inside the very component being ramped.
3. **Small buttons become lozenges by design.** At `h-6`/`h-7`/`size-6`/`size-7`, a 12px radius is a full pill. This matches DESIGN.md ("Balanced radius providing a modern pill-adjacent touch target") and the badge precedent in this very codebase (`h-5` with a pill radius). Flagged so the reviewer is not surprised.
4. Accessibility untouched: no `focus-visible:ring-*`, no `aria-invalid:*`, no `disabled:*`, no `data-slot`/`aria-*` attribute and no semantic markup was altered. Pure class-value restyle.
5. `--radius` and the `@theme inline` radius ramp were already correct from task 1.1 — no duplicate work needed.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm run lint` (workdir `frontend/`) — exit 0, `✖ 4 problems (0 errors, 4 warnings)`; the 4 are the pre-existing `@next/next/no-img-element` warnings at `app/cart/page.tsx:157`, `app/checkout/page.tsx:594`, `app/products/[id]/page.tsx:226`, `components/ProductCard.tsx:82` — identical to slices 1–4, none in a changed file |
| Runtime harness command/scenario and exact result | `npm run build` (workdir `frontend/`) — exit 0, `✓ Compiled successfully in 1738ms`, TypeScript finished, all 15 routes emitted (`/`, `/admin`, `/admin/orders`, `/admin/staff`, `/bodega`, `/cart`, `/checkout`, `/despacho`, `/login`, `/orders`, `/orders/[id]`, `/products`, `/products/[id]`, `/profile`, `/register`) |
| Rollback boundary | Revert `frontend/components/ui/card.tsx`, `button.tsx`, `badge.tsx` only. Class-value-only change confined to three primitive files; no consumer file edited, no new file, no dependency, no API/schema change. Reverting restores the previous radius without affecting slices 2–4 |

### Deviations from design.md

None. The design's Design-System table (ramp `.25/.75/1/1.5rem` → cards `rounded-2xl`, inputs `rounded-xl`, badges `rounded-full`) is implemented verbatim.

---

## Remaining work

- [ ] 5.1 `lib/api.ts`: `APIError.code`, `totp_required` interception, TOTP code helpers, `X-TOTP` header rules, `getProfile({totp?})`
- [ ] 5.2 `enroll2FA()` / `confirm2FA(id, code)`
- [ ] 5.3 `app/login/page.tsx` TOTP challenge step
- [ ] 5.4 NEW `app/admin/2fa/page.tsx` under `RequireRole ["admin"]`

Next recommended: `apply` for slice 5.
