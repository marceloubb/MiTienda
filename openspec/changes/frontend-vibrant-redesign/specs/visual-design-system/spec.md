# Visual Design System Specification

## Purpose

Adopt the "Vibrant Retail Clean" design system (docs/designs/DESIGN.md) across the Next.js frontend: global tokens, fonts, radius, elevation, and lucide iconography. Desktop-first (D2); no mobile rebuild and no `user-scalable=no`.

## Requirements

### Requirement: Global Design Tokens

The frontend token ramp in `globals.css` MUST be replaced with the Vibrant Retail Clean tokens defined in `docs/designs/DESIGN.md`: primary `#00288e`, primary-container `#1e40af`, secondary `#006c49`, tertiary `#4c2e00`, error `#ba1a1a`, surface/background `#faf8ff`, on-surface `#131b2e`, the `surface-container-*` ramp, and outline variants. The Tailwind `@theme inline` block MUST expose these as utilities (`bg-surface`, `text-on-surface`, `bg-primary-container`) so existing class names keep working.

#### Scenario: Token ramp swapped app-wide

- GIVEN the current ferretería ramp in `globals.css`
- WHEN the design-system tokens are applied
- THEN every page renders with the Vibrant Retail Clean palette
- AND existing utility usages compile under the new theme

#### Scenario: No zoom-blocking viewport

- GIVEN any page of the app
- WHEN the viewport meta is inspected
- THEN there is no `user-scalable=no` or `maximum-scale` restriction

### Requirement: Semantic Token Mapping

Legacy semantic tokens MUST map to design-system tokens preserving meaning: `--primary` (CTA orange) → primary; `--stock` (in-stock/success) → secondary emerald; `--stock-low` (low stock/urgency) → tertiary amber; `--offer` (discount/on-sale) → DESIGN.md discount token; `--destructive` → error; `--surface-0/1/2` → surface ramp. Components using `bg-stock`, `text-offer`, `text-stock-low`, or `bg-destructive` MUST retain their semantic behavior after the swap.

#### Scenario: Offer and stock semantics preserved

- GIVEN an on-sale product and a low-stock product after the token swap
- WHEN the catalog renders
- THEN the on-sale product shows a distinct discount badge and the low-stock product shows urgency styling

#### Scenario: Status badges keep tints

- GIVEN orders in `shipped` and `delivered` status
- WHEN a staff surface renders OrderStatusBadge
- THEN both keep their emerald (secondary) tint semantics

### Requirement: Typography via next/font

`layout.tsx` MUST load Plus Jakarta Sans (display/headline/body) and Inter (labels/badges/buttons) with `next/font`, replacing Geist. The DESIGN.md type scale (display-hero 36px/800 … label-badge 11px/700) MUST be wired into the theme; headings MUST use Plus Jakarta Sans and labels/badges/buttons MUST use Inter.

#### Scenario: Fonts swapped with no flash

- GIVEN the root layout
- WHEN the app reloads
- THEN Plus Jakarta Sans renders headings, Inter renders labels/buttons, and Geist is absent

### Requirement: Radius and Elevation Scale

The DESIGN.md rounded scale (sm 0.25rem, md 0.75rem, lg 1rem, xl 1.5rem, full) MUST replace the current 0.625rem base across `components/ui/*` and page surfaces: cards rounded-2xl, buttons/inputs rounded-xl, badges rounded-full. Shadows MUST follow the Level 0–3 ambient hierarchy (flat, card rest, floating, overlay).

#### Scenario: Radius applied per component class

- GIVEN a product card, a primary button, and a badge
- WHEN rendered after the swap
- THEN card radius is rounded-2xl, button radius rounded-xl, badge radius rounded-full
- AND `--radius` no longer equals 0.625rem

### Requirement: Lucide Icon Mapping

The frontend MUST keep lucide-react as the icon library and MUST NOT load the Material Symbols webfont. Material Symbols used in the design screens MUST map to lucide equivalents: `arrow_back`→ArrowLeft, `local_shipping`→Truck, `route`→Route, `schedule`→Clock, `check`→Check, `shopping_bag`→ShoppingBag, `qr_code_scanner`→QrCode, `navigation`→Navigation. The mapping SHALL be documented in one module (e.g. `lib/icons.ts`).

#### Scenario: Icons render from lucide

- GIVEN a restyled screen whose design uses Material Symbols
- WHEN the page renders
- THEN the corresponding lucide icon renders and no `Material+Symbols` font request is issued

### Requirement: Desktop-First with Sober Accessibility

The redesign targets the existing desktop layouts (max-w-7xl) as the primary surface and MUST NOT regress keyboard accessibility. Text and UI-component color pairs MUST meet WCAG 2.1 AA contrast (e.g. on-surface on surface, white on primary-container). Every interactive element MUST show a visible `:focus-visible` ring. The 44px touch target from the designs is a mobile concern; desktop interactive elements SHALL retain a minimum comfortable clickable size consistent with the current app (≥32px).

#### Scenario: Focus rings visible on all controls

- GIVEN a restyled page with buttons, links, and inputs
- WHEN the user tabs through them
- THEN each focused control shows a visible focus ring

#### Scenario: Contrast preserved after swap

- GIVEN the applied token palette
- WHEN text color pairs are measured
- THEN body text and primary CTA pairs meet AA contrast