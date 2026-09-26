# Tasks: Frontend Vibrant Retail Redesign

## Review Workload Forecast

Estimated changed lines: ~1,800 (1,500–2,100). Delivery: auto-chain.

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Test command | Harness | Rollback |
|------|------|----|--------------|---------|----------|
| 1 | Tokens/fonts/icons | 1 | `npm run build && npm run lint` | Smoke home/catalog/cart | Revert globals.css, layout.tsx, icons.ts |
| 2 | OrderEvent model | 2 | `.venv\Scripts\python.exe manage.py test orders` | MigrationExecutor backfill | `migrate orders 0003` |
| 3 | Customer routes + tracking | 3 | build+lint | Smoke track/re-buy | Drop orders/[id] + comps |
| 4 | Staff routes | 4 | build+lint | Smoke KPI/modal, advance | Revert staff comps/pages |
| 5 | 2FA enroll + TOTP | 5 | build+lint | Smoke 2FA happy/wrong | Revert api.ts/2fa/login |

## Phase 1: Design System

- [x] 1.1 `frontend/app/globals.css`: Vibrant `:root` tokens from `docs/designs/DESIGN.md` (read-only): primary `#00288e`, secondary `#006c49`, error `#ba1a1a`, surfaces/outlines; remap `--primary/--stock/--stock-low/--offer/--destructive/--surface-*`; `@theme inline` keeps utilities.
- [x] 1.2 `frontend/app/layout.tsx`: `next/font` PJS + Inter (drop Geist); `--font-jakarta/--font-inter/--font-label`; no `user-scalable=no`.
- [x] 1.3 Create `frontend/lib/icons.ts`: lucide map (ArrowLeft, Truck, Route, Clock, Check, ShoppingBag, QrCode, Navigation).
- [x] 1.4 Radius ramp on `frontend/components/ui/*`: cards rounded-2xl, buttons/inputs rounded-xl, badges rounded-full. Verify: build+lint; smoke palette, focus, AA.

## Phase 2: Order Events

- [x] 2.1 `backend/orders/models.py`: `OrderEvent` (FK `order`/events, `event_type`, null `from_status`, `to_status`, server `timestamp`, ordering+index).
- [x] 2.2 `backend/orders/migrations/0004_orderevent.py`: schema + RunPython backfill from `created_at` (rev noop).
- [x] 2.3 `backend/orders/views.py`: append events in-transaction on each transition (create/advance/discrepancy/resolve/cancel); rejected paths append none.
- [x] 2.4 `backend/orders/serializers.py`: `OrderEventSerializer`; `events` on Order/StaffOrder serializers; ascending, cross-user 404.
- [x] 2.5 `backend/orders/tests.py`: fields/ordering/server clock; atomic appends; 403/400 append none; cancel statuses; backfill; cross-user 404. Verify: `.venv\Scripts\python.exe manage.py test orders`.

## Phase 3: Customer Routes

- [x] 3.1 Token restyle: `frontend/app/page.tsx`, `app/products/page.tsx`, `app/products/[id]/page.tsx`, `components/ProductCard.tsx`; keep sale/low-stock semantics.
- [x] 3.2 `frontend/app/cart/page.tsx` restyle; cut coupon UI.
- [x] 3.3 4-step CheckoutWizard in `frontend/app/checkout/page.tsx` (Envío→Pago→Revisión→Confirmación).
- [x] 3.4 `frontend/app/orders/page.tsx`: tabs (Todos/En curso/Entregados/Cancelados) + OrderCard.
- [x] 3.5 New `frontend/app/orders/[id]/page.tsx` + `DeliveryTimeline`: 5-step timeline from `events`; foreign order → redirect; cancelled/discrepancy terminal; cut ETA/map/courier/tax/reviews.
- [x] 3.6 New `DeliveredDetail`/`RebuyButton` (delivered only): items/shipping/payment/total; re-buy skips inactive. Verify: build+lint, smoke tracking.

## Phase 4: Staff Routes

- [x] 4.1 KPI row, filter chips, discrepancy modal: `frontend/components/admin/OrdersDashboard.tsx`, `DiscrepancyPanel.tsx`, `app/admin/orders/page.tsx`.
- [x] 4.2 Restyle `frontend/app/bodega/page.tsx`, `app/despacho/page.tsx`.
- [x] 4.3 Restyle `frontend/app/admin/staff/page.tsx` + StaffManagementView/StaffUserList/StaffUserForm.
- [x] 4.4 Restyle `frontend/app/profile/page.tsx`, `app/register/page.tsx`. Verify: build+lint, smoke KPI/advance.

## Phase 5: 2FA

- [ ] 5.1 `frontend/lib/api.ts`: `APIError.code`; intercept `totp_required` pre-refresh; `setTOTPCode`/`clearTOTPCode`; attach `X-TOTP` (never login/register); clear on logout; `refreshToken()` sends code; `getProfile({totp?})`. Types: `OrderEventType`, `OrderEvent`, `Order.events`.
- [ ] 5.2 `enroll2FA()`/`confirm2FA(id, code)` → `/users/2fa/enroll|confirm/`; errors as `APIError`.
- [ ] 5.3 `frontend/app/login/page.tsx`: TOTPChallengeStep post-probe; valid code retries with `X-TOTP`; wrong stays; unaffected skip.
- [ ] 5.4 New `frontend/app/admin/2fa/page.tsx` (TOTPSecretCard/TOTPConfirmForm) under `RequireRole ["admin"]`: QR + Base32 + confirm; invalid keeps pending; already-confirmed shown; non-admin redirect. Verify: build+lint; smoke enroll/wrong.