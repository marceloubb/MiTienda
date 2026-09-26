# Exploration: frontend-vibrant-redesign

Change: adopt the Stitch "Vibrant Retail Clean" design system across the MiTienda frontend — translate every provided screen into the real Next.js app, add the missing 2FA UI (backend already exists), and explicitly defer the screens with no backend support instead of faking them.

Exploration date: 2026-09-23. Evidence: read directly from the working tree (branch `main`, clean except untracked `openspec/changes/erp-domain-restructure/`); all 15 `docs/designs/stitch-*/**/code.html` + `DESIGN.md`; current frontend pages/components (`frontend/app`, `frontend/components`, `frontend/lib`); backend API surface (`backend/orders`, `backend/users`, `backend/products`). Read-only exploration; no code was modified.

---

## Current State

### Design deliverables (docs/designs/)

15 `code.html` + `screen.png` across 4 stitch families, plus `DESIGN.md` (master "Vibrant Retail Clean" system):

| Family | Screens |
|---|---|
| stitch-main (customer) | `carrito_de_compras`, `cat_logo_exploraci_n`, `checkout_despacho`, `seguimiento_de_orden`, `seguridad_2fa_admin` |
| stitch-staff | `panel_de_operaciones_staff`, `preparaci_n_de_orden_bodega`, `seguridad_2fa_admin` (byte-identical to stitch-main copy, MD5 `2D3610B8C3C12785364345BCA9747289`) |
| stitch-orders (customer) | `detalle_de_pedido_entregado`, `historial_de_rdenes`, `reportar_discrepancia_modal` |
| stitch-invoicing | `boleta_electr_nica_b_492019`, `confirmaci_n_de_env_o_por_email_descarga`, `factura_electr_nica_emitida_f_18492`, `solicitar_factura_electr_nica` |

Design system facts (verified from the HTML + DESIGN.md):
- **Tokens**: Material-3-style "Vibrant Retail Clean" ramp — primary `#00288e`, primary-container `#1e40af`, secondary `#006c49`, tertiary `#4c2e00`, error `#ba1a1a`, background/surface `#faf8ff`, on-surface `#131b2e`, full `surface-container-*` ramp, outline tokens; `darkMode: class` config present.
- **Typography**: Plus Jakarta Sans (display/headline, 400–800) + Inter (body, 500–700); display-hero 36px/800.
- **Icons**: Material Symbols Outlined (e.g. `shopping_bag`, `qr_code_scanner`, `barcode_scanner`, `local_shipping`).
- **Shell**: mobile-first viewport (safe-area `pt-safe`/`pb-safe`, 44px touch targets, hidden scrollbars). NOTE: designs set `user-scalable=no` — an a11y regression we must NOT copy.
- Placeholder detail: most headers carry the generic title "Proceso De Pago"; `reportar_discrepancia_modal` is `lang="en"`. Headers are decorative AI mockups; body content is design-accurate.

### Frontend today (Next.js 16.3.6 / React 19.2.8 / TS 5 / Tailwind 4, no test runner; left column is lib content)

- **Design language (current)**: "ferretería" palette in `frontend/app/globals.css` — primary orange `#e65c00`, gray surfaces, Geist fonts (`next/font`), radius 0.625rem; shadcn-style primitives (`components/ui/`); icons already **lucide-react**.
- **Routes (13)**: `/` (home), `/products`, `/products/[id]`, `/cart`, `/checkout`, `/orders`, `/profile`, `/login`, `/register`, `/admin` (→ `/admin/orders`), `/admin/orders`, `/admin/staff`, `/bodega`, `/despacho`. All `max-w-7xl` desktop layouts, responsive grids, sticky top Navbar, footer.
- **lib/api.ts (466 lines)**: full domain contract — products/categories, auth (login/register/logout/profile), cart (get/add/remove/update/clear), customer orders (list/get/create_from_cart), staff orders (list/advance/cancel/flag-resolve discrepancy), staff users (create/list). **No 2FA functions, no invoicing functions.** Auth = httpOnly SameSite=Lax cookie with single retry-on-401/refresh.
- **Components**: `Navbar` (role-aware staff links), `ProductCard`, `RequireRole` (UX-only guard), `admin/` = OrdersDashboard, DiscrepancyPanel, StaffManagementView, StaffUserForm, StaffUserList, InventoryView (rendered by `/bodega`), DispatchRoutesView (rendered by `/despacho`).

### Backend API surface (Django 6.1.1 / DRF, SQLite)

- **2FA EXISTS, frontend missing**: `POST /api/users/2fa/enroll/` (admin-only → `provisioning_uri`), `POST /api/users/2fa/confirm/` (code), plus TOTP challenge at login via `X-TOTP` header and error code `totp_required` (`users/authentication.py`, `users/urls.py`, `users/views.py`, tested in `users/tests.py`). Frontend has ZERO handling (verified: no `totp|2fa|X-TOTP` matches under `frontend/`).
- **Invoicing DOES NOT EXIST**: zero `factura|boleta|invoice|dte|sii` matches in `backend/`. The four invoicing designs are **Chilean SII DTE** artifacts (RUT 76.842.190-3, SII Chile, CLP, boleta→factura substitution via Nota de Crédito).
- Orders: `Order` carries `created_at`/`updated_at` only — no per-status event timestamps (timeline designs will need derivation or a new history model).

---

## Screen-to-Route Matrix (the core finding)

| # | Design screen | Role | Current route | Backend support | Delta |
|---|---|---|---|---|---|
| 1 | `carrito_de_compras` | customer | `/cart` | cart API ✅ | Restyle; stock auto-adjust banners; coupon UI **CUT** (no coupon backend) |
| 2 | `cat_logo_exploraci_n` | customer | `/products` | products search/category/ordering ✅ | Restyle; flash-sale timer / voice search / coupon banner **CUT** |
| 3 | `checkout_despacho` | customer | `/checkout` | `create_from_cart` ✅ | Restyle + 4-step wizard (Carrito→Despacho→Pago→Orden); keep existing payment methods; shipping-method display |
| 4 | `seguimiento_de_orden` | customer | — (no detail route) | `getOrder` ✅ | **NEW `/orders/[id]`** tracking: 5-step timeline derived from status + timestamps; courier/ETA card **CUT** (no data) |
| 5 | `seguridad_2fa_admin` | admin | — (no UI at all) | `enroll`/`confirm` ✅ (admin-only) | **NEW `/admin/2fa`** enrollment (QR/manual secret → confirm code → backup codes) + **login TOTP challenge** (api.ts + `/login`) required to make it functional |
| 6 | `panel_de_operaciones_staff` | bodega/admin | `/admin/orders` + `/bodega` | staff orders API ✅ | Restyle both surfaces: KPI chips, status filter tabs, order cards with transitions/discrepancy actions |
| 7 | `preparaci_n_de_orden_bodega` | bodega | `/bodega` (list queue only) | `advance` ✅; NO item-level scan/SLA/per-item state | **DEFER apart** (needs backend picking model); bodega restyle covers advance/flag from the queue |
| 8 | `detalle_de_pedido_entregado` | customer | — | `getOrder` ✅ | **NEW `/orders/[id]`** delivered detail: items, shipping, payment, re-buy; tax-doc block + reviews **CUT** (invoicing/reviews nonexistent) |
| 9 | `historial_de_rdenes` | customer | `/orders` | `getOrders` ✅ | Restyle: status tabs (Todas/En curso/Entregadas/Canceladas), progress chips, "Ver Estado" CTA → detail route — all frontend-capable |
| 10 | `reportar_discrepancia_modal` | bodega | inline flag UI in `/bodega` + `DiscrepancyPanel` | `flagDiscrepancy(reason)` ✅ (reason only) | Rebuild as the design modal (missing/damaged); quantity commitment **CUT** (API has no item/qty fields) |
| 11 | `boleta_electr_nica_b_492019` | customer | — | **❌ none** | **DEFER → `erp-sales-invoicing`** (Chilean SII domain: folios, PDF/XML, SII validity) |
| 12 | `confirmaci_n_de_env_o_por_email_descarga` | customer | — | **❌ none** | **DEFER → same change** (email + DTE XML dispatch) |
| 13 | `factura_electr_nica_emitida_f_18492` | customer | — | **❌ none** | **DEFER → same change** (boleta→factura substitution, IVA crédito) |
| 14 | `solicitar_factura_electr_nica` | customer | — | **❌ none** | **DEFER → same change** (company-data form, SII deadline rules) |

Net scope: 10 screens built (8 restyle + 2 new routes), 1 bodega workflow deferred on its own, 4 invoicing screens deferred as one family.

---

## Affected Areas

- `frontend/app/globals.css` — replace token ramp with "Vibrant Retail Clean" (primary `#00288e`, secondary `#006c49`, tertiary `#4c2e00`, error `#ba1a1a`, surface ramp); map existing semantic tokens (`stock`/`stock-low`/`offer`, `surface-1/2`, `primary-hover`) deliberately to the new palette.
- `frontend/app/layout.tsx` — `next/font` Plus Jakarta Sans + Inter replace Geist; body background.
- `frontend/components/` — every page component restyled (Navbar, ProductCard, ui/*, admin/* restyle); no new UI dependencies (lucide-react already present — document Material-Symbol → lucide mapping instead of adding the icon font).
- `frontend/app/{page,products,products/[id],cart,checkout,orders,profile,login,register,bodega,despacho,admin,admin/orders,admin/staff}` — restyle per screen matrix.
- NEW `frontend/app/orders/[id]/page.tsx` — customer order tracking/detail (derives the timeline from `Order.status` + `created_at`/`updated_at`; exact per-step timestamps need a future order-events model).
- NEW `frontend/app/admin/2fa/page.tsx` (+ component) — TOTP enrollment per design (QR `provisioning_uri`, manual Base32 secret, 6-digit confirm, backup codes).
- `frontend/lib/api.ts` — add `enroll2FA()`, `confirm2FA(code)`; extend `login()` with optional TOTP code sent via `X-TOTP` header; surface `totp_required`.
- `frontend/app/login/page.tsx` — TOTP challenge step after `totp_required`.

## Approaches

1. **Full translation, design-system-first, cut what has no backend (RECOMMENDED)** — token/font/icon swap, then screen-by-screen translation onto existing routes, new `/orders/[id]` + `/admin/2fa`, 2FA included end-to-end (enrollment + login challenge); invoicing/picking/reviews/coupons/scanners deferred to their own changes.
   - Pros: honest UI (every pixel renders real data); security win (2FA finally usable); no fake fiscal documents or fake discounts in a storefront; smallest long-term debt; fits the ERP roadmap (invoicing = C4).
   - Cons: biggest single frontend change yet — touches every page; needs chained PRs under the 400-line budget; mobile-first responsive pass is the main effort driver.
   - Effort: High

2. **Design-system-only (tokens/fonts/radius applied globally, no per-screen rebuilds, no new routes)** —
   - Pros: low effort/risk; instantly "on-brand".
   - Cons: leaves 2FA, tracking/detail routes, and mobile-first unserved; 11 of 15 screens never get built; misses the point of the deliverable set.
   - Effort: Low–Medium

3. **Full translation + mock the backend-less domains frontend-only** (static invoicing pages, coupons, reviews, flash sale) —
   - Pros: closest visual fidelity to all 15 screens.
   - Cons: fake fiscal documents (SII boleta/factura with no legal backing) and fake discounts are a compliance/customer-trust hazard; debt doubles; user-facing features that silently do nothing or lie.
   - Effort: High

## Recommendation

**Approach 1.** The red line is honesty: the backend is the source of truth, so any design screen is built only when its data exists. That yields a real, coherent change — rebrand + responsive pass + order tracking/detail + working 2FA — and postpones four clean families: invoicing (Chilean SII DTE — belongs in `erp-sales-invoicing`), bodega picking workflow (needs a picking/SLA/item-state backend model), reviews, and coupons. Do NOT adopt `user-scalable=no` from the designs (accessibility regression). Keep lucide-react and map Material Symbols → lucide names rather than shipping the icon font.

## Risks

- **Concurrent change collision**: untracked `openspec/changes/erp-domain-restructure/exploration.md` proposes moving the same files this change restyles (`components/admin/` split, `lib/api.ts` split, route groups). Sequencing must be decided before both enter apply.
- **No frontend test runner**: restyle gates are `next build` + lint only; needs a manual smoke checklist across all 13+2 routes.
- **Review budget**: 15 screens → chained/stacked PRs required; each slice must keep build + lint green.
- **Mobile-first vs desktop-first is THE sizing fork** (open decision 2): full responsive rebuild of every page is the dominant cost; confirm intent before proposal.
- **Locale mismatch**: storefront strings are es-AR; invoicing designs are Chilean SII (RUT/CLP). Any invoicing work needs a jurisdiction decision first (deferred here, but flagged).
- **2FA admin-only backend**: enrollment endpoint is admin-restricted; if bodega/despacho must also enroll, that is a backend change (out of this change's scope).

## Open Decisions (must be answered before `propose`)

1. **Scope of backend-less screens**: cut/defer (recommended) vs. frontend-only mock — the risk table above is the tradeoff.
2. **Mobile-first storefront or desktop-first retail app?** The designs are mobile-width; today the app is `max-w-7xl` desktop. Decide the responsive strategy — it is the biggest effort driver.
3. **2FA scope**: admin enrollment only (design matches admin-only backend) + the login TOTP challenge needed to make it functional — also cover bodega/despacho enrollment (backend change) or not?
4. **Timeline fidelity**: derive the 5-step tracking from `Order.status` + timestamps now (no backend change) and accept approximation, or add an order-events history model (backend change first)?
5. **Sequence vs `erp-domain-restructure`**: which change applies first, or are their frontend buckets deconflicted explicitly?

## Ready for Proposal

**Yes** — evidence-complete. `propose` can proceed once decisions 1–5 are collected; decision 2 (mobile-first vs desktop-first) gates the design phase most heavily, and decision 5 gates sequencing.