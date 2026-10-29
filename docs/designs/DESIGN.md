---
name: Vibrant Retail Clean
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#444653'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#4c2e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#6b4200'
  on-tertiary-container: '#ffa929'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  price-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 28px
    letterSpacing: -0.01em
  price-card:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 22px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-badge:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system expresses a vibrant, contemporary digital commerce atmosphere optimized for energetic retail. It strikes a balance between Latin-American marketplace vitality and global mobile-commerce precision. The user experience should feel immediate, trustworthy, fluid, and delightfully tactile.

### Design Movement & Aesthetic
The aesthetic pairs **Clean Modern Utilitarianism** with **Vibrant Micro-Interactions**:
- High-contrast readability on neutral crisp canvases.
- Saturated focal accents that guide conversion paths without visual clutter.
- Tactile, rounded surfaces that invite continuous thumb-driven browsing.
- Structural layout integrity with generous tap zones (minimum 44x44pt touch bounding targets) designed explicitly for mobile ergonomics.

## Colors

The palette balances conversion clarity with structured neutral scaffolding:

### Functional Palette
- **Primary (`#1E40AF`)**: Deep energetic indigo-blue. Governs core CTAs, active tab bars, checkout triggers, and high-priority directional indicators.
- **Secondary (`#10B981`)**: Emerald green. Dedicated to positive financial signals, savings tags, high stock availability, and verified success badges.
- **Tertiary (`#F59E0B`)**: Amber gold. Reserved for urgency cues, flash sales, low-stock warnings, and review ratings.
- **Destructive / Alert (`#EF4444`)**: Crimson rose. Strictly for out-of-stock notices, inline field errors, discount expiration timers, and cancellation flows.

### Canvas & Neutral Architecture
- **Surface Canvas**: Pure White (`#FFFFFF`) as the baseline ground.
- **Surface Muted / Layer 2**: Slate Soft Tint (`#F8FAFC`) for category carousels, sheet backgrounds, and grouped input trays.
- **Borders & Dividers**: Subtle Slate (`#E2E8F0` at 1px) for low-contrast containment.
- **Text Primary**: Deep Slate (`#0F172A`) for punchy titles and critical pricing info.
- **Text Secondary**: Neutral Slate (`#64748B`) for specs, unselected navigation, and sublabels.

## Typography

The type system merges the approachable, geometric energy of **Plus Jakarta Sans** for headings and product narratives with the mechanical legibility of **Inter** for data-dense labels, badge metadata, and form interactions.

- Display and price metrics use tighter negative tracking to assert authority and prevent wrapping on narrow viewports.
- Labels, badges, and button text use uppercase or semi-bold optical configurations with subtle positive tracking for legibility during rapid mobile scanning.

## Layout & Spacing

A mobile-first fluid layout calibrated for thumb zones, quick lateral scrolling, and vertical discovery.

### Grid & Margins
- **Mobile (`< 768px`)**: 4-column fluid layout with `margin: 1rem` (16px) and `gutter: 0.75rem` (12px). Allows dual-column product cards to breathe comfortably on 360px–420px device screens.
- **Tablet (`768px - 1024px`)**: 8-column layout with `margin: 2rem` (32px) and `gutter: 1rem` (16px).
- **Desktop (`> 1024px`)**: 12-column layout capped at a maximum width of `1280px` centered, with `margin: 3rem` (48px) and `gutter: 1.5rem` (24px).

### Spacing Rhythm
Component spacing follows strict 4px / 8px linear cadences (`0.25rem` to `2rem`). Micro distances between product titles and prices use `space-xs` (4px); badge padding uses `space-xs` vertically and `space-sm` horizontally; section card groups use `space-lg` (24px).

## Elevation & Depth

This design system favors crisp layered depth, pairing flat structural borders with soft, non-muddy ambient shadows.

### Ambient Shadow Hierarchy
- **Level 0 (Flat)**: Background plane (`#FFFFFF` to `#F8FAFC`). No shadow, delineated solely by 1px subtle slate borders (`#E2E8F0`).
- **Level 1 (Card Rest)**: Product grids and category squares. `0px 2px 8px -2px rgba(15, 23, 42, 0.06)`, bounded by a 1px `#F1F5F9` stroke to prevent edge bleed.
- **Level 2 (Floating Action & Modals)**: Bottom sheets, sticky add-to-cart bars, and active filter drawers. `0px 8px 24px -4px rgba(15, 23, 42, 0.12)`.
- **Level 3 (Toasts & Overlays)**: Quick notifications, undo pills, and active cart drawers. `0px 16px 36px -6px rgba(15, 23, 42, 0.18)`.

## Shapes

The design system incorporates generous curvature to create a soft, accessible, and friendly retail journey:

- **Cards & Surfaces (`rounded-2xl` / 1rem - 1.25rem)**: Applied to product cards, promo banners, and modal dialogs.
- **Buttons & Form Inputs (`rounded-xl` / 0.75rem)**: Balanced radius providing a modern pill-adjacent touch target.
- **Badges & Chips (`rounded-full` / 9999px)**: Completely rounded capsules that stand out sharply against rectangular imagery.

## Components

### Buttons
- **Primary Action**: Background `#1E40AF`, text `#FFFFFF`, font weight 600 (`label-lg`), height 50px, border-radius 12px (`rounded-xl`). Active state shifts to `#1D4ED8` with a micro scale transform (`0.98`).
- **Secondary Action**: Border 1.5px solid `#1E40AF`, background transparent, text `#1E40AF`.
- **Destructive**: Background `#FEF2F2`, text `#EF4444`, border 1px solid `#FCA5A5`.

### Chips & Badges
- **Discount Badge**: Background `#ECFDF5`, text `#065F46`, font `label-badge`. Displays percentage drops cleanly (`-30% OFF`).
- **Low Stock Urgency Badge**: Background `#FFFBEB`, text `#92400E`, prepended by a pulse indicator dot.
- **Out of Stock**: Background `#F8FAFC`, text `#94A3B8`, slash strike-through style.

### Product Cards
- Encapsulated in 16px radius (`rounded-2xl`) surfaces with `#FFFFFF` background and subtle `#E2E8F0` border.
- 1:1 aspect ratio image container with `#F8FAFC` under-fill.
- Pinned discount badge top-left (8px inset); wishlist heart toggle top-right (floating with Level 1 elevation).
- Direct "Quick Add (+)" floating button aligned bottom-right of the card image.

### Form Inputs & Selectors
- Height 48px, radius 12px, border 1px solid `#CBD5E1`, background `#FFFFFF`. Focus ring transitions to a 2px stroke of `#1E40AF` with a subtle 3px spread of `rgba(30, 64, 175, 0.15)`.

### Step Progress Indicator (Checkout Flow)
- Horizontal connector system running above the fold:
  - **Completed Step**: Emerald `#10B981` circle with white check icon; connected line solid emerald.
  - **Active Step**: Indigo `#1E40AF` circle with bold white numeral; connected line muted slate `#E2E8F0`.
  - **Pending Step**: Slate outline circle `#CBD5E1` with slate numeral text.

### Sticky Mobile Action Bar
- Pinned to the bottom viewport: white canvas with high-blur backdrop filter (`backdrop-blur-md`), 1px top border `#E2E8F0`, containing product price hero on the left and full-width Primary CTA on the right.