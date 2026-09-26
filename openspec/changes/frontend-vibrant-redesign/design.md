# Design: Frontend Vibrant Retail Redesign

## Technical Approach
Apply "Vibrant Retail Clean" (docs/designs/DESIGN.md; specs authoritative) as global tokens/fonts/icons over desktop-first `max-w-7xl` layouts; add backend `OrderEvent` as sole tracking-timestamp source (D4); admin 2FA + login TOTP against unchanged backend (D3); real data only (D1); before `erp-domain-restructure` (D5); 5 chained PR slices under the 400-line budget.

## Architecture Decisions
| Decision | Choice |
|---|---|
| Tokens+radius | `:root` values in `globals.css`, ramp .25/.75/1/1.5rem |
| Fonts | `next/font` PJS + Inter, drop Geist |
| Icons+QR | lucide map `lib/icons.ts`; `qrcode` pkg canvas |
| Timestamps | `OrderEvent` in same txn, server clock |
| Legacy orders | RunPython backfill `created` events |
| TOTP session | In-memory `totpCode` → `X-TOTP` (never login/register), cleared on logout |

Rationale: keeps existing classNames compiling; server clock = D4-exact history; in-memory TOTP XSS-safe; QR spec-required.

## Backend: OrderEvent (slice 2)
`backend/orders/models.py`: `OrderEvent` — FK `order` (`related_name='events'`), `event_type` choices `created/advanced/discrepancy/resolved/cancelled`, `from_status` (null,blank), `to_status`, `timestamp` DateTimeField `default=timezone.now, editable=False` (server clock only); Meta `ordering=['timestamp','id']`, index `(order,timestamp)`.

Append inside the SAME `transaction.atomic()`; rejected paths return first:
- `create_from_cart`: after `Order.objects.create` → `created`, None→`pending`, `timestamp=order.created_at`.
- `advance`: prior status captured pre-mutation → `advanced` from→target.
- `discrepancy`: `pre_discrepancy_status`→`discrepancy`.
- `resolve_discrepancy`: `discrepancy`→restored.
- `cancel`: prior status (incl. `discrepancy`)→`cancelled`.

Migration `0004_orderevent` + RunPython backfill (`created` from `created_at`; reverse noop). Serializers: `OrderEventSerializer` (event_type, from_status, to_status, timestamp); `events` added to `OrderSerializer`, inherited by `StaffOrderSerializer`; ascending via Meta ordering; cross-user leak blocked by user-scoped queryset (404).

## Design System (slice 1)
Token map (`globals.css` `:root`):
| Legacy | New |
|---|---|
| `--primary #e65c00` | `#00288e`; hover `#1d4ed8` |
| `--stock #2e7d32` | `#006c49` |
| `--stock-low #f39c12` | `#92400e`, badge bg `#fffbeb` |
| `--offer #c0392b` | `#065f46` |
| `--destructive` | `--error #ba1a1a` |
| `--surface-0/1/2` | `#fff`/`#f2f3ff`/`#eaedff`; background `#faf8ff`; on-surface `#131b2e` |
| `--border #e0e0e0` | `--outline-variant #c4c5d5`; `--outline #757684` |
| `--radius .625rem` | .25/.75/1/1.5rem → cards `rounded-2xl`, inputs `rounded-xl`, badges `rounded-full` |

Fonts (`layout.tsx`): `Plus_Jakarta_Sans`→`--font-jakarta`, `Inter`→`--font-inter`; `--font-sans`/`--font-heading`=jakarta, new `--font-label`=Inter (labels/buttons/badges); DESIGN scale (36/800…11/700) as utilities. Icons `lib/icons.ts`: `arrow_back`→ArrowLeft, `local_shipping`→Truck, `route`→Route, `schedule`→Clock, `check`→Check, `shopping_bag`→ShoppingBag, `qr_code_scanner`→QrCode, `navigation`→Navigation.

## Routes & Components
- `/` | /products | /products/[id] → HomePage, ProductsCatalog, ProductCard, ProductDetail (token restyle; sale/low-stock semantics kept)
- `/cart` → CartPage, CartLine, CartSummary (restyle; coupon UI cut)
- `/checkout` → CheckoutWizard, CheckoutStepper, ShippingStep, PaymentStep, ReviewStep, ConfirmationStep (4-step wizard Envío→Pago→Revisión→Confirmación)
- `/orders` → OrdersPage, OrderHistoryTabs, OrderCard (tabs Todos/En curso/Entregados/Cancelados)
- `/orders/[id]` NEW → OrderTrackingPage, DeliveryTimeline, DeliveredDetail, RebuyButton (5-step timeline from `events`; delivered detail + re-buy; terminal cancelled/discrepancy; foreign id → `/orders`)
- `/admin/orders` | /bodega | /despacho → OrdersDashboard, DiscrepancyPanel, StaffKpiRow, StatusFilterChips (KPI row, filter chips, discrepancy modal)
- `/admin/staff` → StaffManagementView, StaffUserList, StaffUserForm (restyle)
- `/admin/2fa` NEW → TwoFAEnrollPage, TOTPSecretCard, TOTPConfirmForm (Enroll→QR+Base32→confirm; `RequireRole ["admin"]`)
- `/login` → LoginPage, TOTPChallengeStep (TOTP step when `totp_required`)
- /register | /profile → RegisterPage, ProfilePage (token restyle)

## api.ts / 2FA (slice 5)
- `APIError` gains `code?: string`; `performFetch` throws with `code` on `body.code==='totp_required'`; `fetchAPI` intercepts BEFORE `refreshToken()`/`setActiveToken()`; `refreshToken()` also sends stored `X-TOTP`.
- Module `totpCode` + `setTOTPCode`/`clearTOTPCode`; `performFetch` attaches `X-TOTP` when set (never `/users/login/`, `/users/register/`); cleared on logout.
- `login()` unchanged; `getProfile({totp?})` for the probe.
- `enroll2FA(): Promise<{device_id,secret,provisioning_uri}>` → POST `/users/2fa/enroll/`; `confirm2FA(deviceId,code)` → POST `/users/2fa/confirm/`; errors as `APIError`.
- Types: `OrderEventType` (`created|advanced|discrepancy|resolved|cancelled`); `OrderEvent {event_type; from_status:OrderStatus|null; to_status; timestamp}`; `Order.events`.

Login flow: `apiLogin` → cookie → probe `getProfile()`; `totp_required` → challenge; valid → `setTOTPCode` → probe → `auth.login(user)`; wrong → re-401, stay; else normal.

## Verification
| Layer | What | How |
|---|---|---|
| Backend unit | Fields/ordering/server clock (client ts ignored) | `orders/tests.py` |
| Backend integration | Atomic append on all transitions; 403/400 appends nothing | Extend `StaffOrderTestBase`; event counts |
| Backend migration | Legacy backfill | `MigrationExecutor` forward test |
| Backend serialization | Ascending events; 404 cross-user | serializer assertions |
| Frontend gates | build+lint per slice (no test runner) | Smoke all routes: cart, catalog, checkout 4-step, orders tabs, orders/[id] (delivered/in-flight/cancelled), admin KPI/filter/discrepancy, bodega advance, 2FA enroll/confirm/duplicate, login TOTP happy/wrong/unaffected, profile, register, home; tab/AA spot checks |

## PR Chaining (auto-chain)
1. **Slice 1** tokens/fonts/icons — `globals.css`, `layout.tsx`, `lib/icons.ts`.
2. **Slice 2** order-events — model, migration+backfill, view appends, serializers, tests (before tracking, D4).
3. **Slice 3** customer routes — cart, catalog, checkout wizard, orders tabs, orders/[id].
4. **Slice 4** staff routes — admin/orders KPI/filter/modal, bodega, despacho, admin/staff, profile, register.
5. **Slice 5** 2FA — api.ts interception, login challenge, admin/2fa.

Each slice: own start/finish, gate, rollback; PR n targets previous branch; retarget until clean.

## Threat Matrix
N/A — no routing, shell, subprocess, VCS/PR automation, executable classification, or process-integration boundary (delivery chaining is process-level; URLs untouched).

## Migration / Rollout
Backfill in migration `0004`; events append-only from deploy; no flags. Rollback: slice 2 = `migrate orders 0003`; others revert files.

## Open Questions
None blocking.