# Proposal: Frontend Vibrant Retail Redesign

## Intent
Adopt the Stitch design system across the Next.js frontend: global tokens/fonts, 10 of 15 design screens built on real backend data, admin 2FA end-to-end (enrollment + login TOTP), and a backend order-events model for exact tracking timestamps. Backend-less screens (invoicing, bodega picking, reviews, coupons, flash-sale) are documented and deferred — never mocked. Applies FIRST, before `erp-domain-restructure`.

## Scope

### In Scope
- Design system (Vibrant Retail Clean tokens, Plus Jakarta Sans + Inter via `next/font`, radius/typography, lucide mapping — `globals.css`, `layout.tsx`, `components/ui/*`); desktop-first restyle, no mobile rebuild (D2).
- Restyles: cart (coupon UI cut), catalog, checkout (4-step wizard), order history, staff ops (KPI/filter/discrepancy); token-level restyle covers remaining routes.
- NEW `/orders/[id]`: tracking + delivered detail (D4, exact timestamps from events).
- NEW `/admin/2fa` + login TOTP challenge (`enroll2FA`/`confirm2FA`, `X-TOTP`, `totp_required` — D3, admin-only, no backend change).
- Backend order-events model (D4).

### Out of Scope
- Mock/fake screens or fiscal documents (D1); mobile rebuild or `user-scalable=no`; open 2FA for bodega/despacho; invoicing, picking, reviews, coupons, flash-sale.

## Capabilities

### New Capabilities
- `order-event-history`: backend per-status event model; transitions append events.
- `order-tracking`: `/orders/[id]` timeline + delivered detail from events.
- `visual-design-system`: tokens, fonts, lucide mapping, component specs.

### Modified Capabilities
- `two-factor-auth`: web enrollment + login TOTP requirements.
- `order-state-machine`: transitions MUST append timestamped events.

## Approach
Global token/font/icon swap, then route-by-route translation, then 2FA end-to-end, then order-events + tracking. Chained PRs under the 400-line budget (auto-chain); gates: `next build`, lint, backend tests, manual smoke.

## Affected Areas
| Area | Impact |
|---|---|
| `frontend/app/**`, `components/**`, `lib/api.ts` | Modified — restyles + additive 2FA |
| `frontend/app/orders/[id]`, `admin/2fa` | New — tracking + enrollment |
| `backend/orders/*`, `migrations/` | Modified — OrderEvent model |

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Collision with `erp-domain-restructure` | Med | Applies first (D5); erp structural moves untouched |
| No frontend test runner | High | build + lint + manual smoke |
| 400-line budget | High | per-slice PR chaining |
| Token remap breaks semantics | Med | mapping table + visual smoke |

## Rollback Plan
Each chained PR independently revertible: tokens/fonts = restore `globals.css`/`layout.tsx`; new routes = drop dirs + api.ts funcs; order-events = `migrate <app> <prev>`.

## Dependencies
Order-events lands before tracking UI (D4); `erp-domain-restructure` stays unstarted (D5); 2FA backend unchanged.

## Success Criteria
- [ ] 15 routes render design system; build + lint green.
- [ ] `/orders/[id]` timestamps exact from events.
- [ ] `/admin/2fa` enroll works; login TOTP completes.
- [ ] No screen renders data backend can't provide.
- [ ] erp file buckets untouched.