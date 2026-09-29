# Visual Design System Specification

## Purpose

Normative token contract for the Vibrant Retail Clean design system (`docs/designs/DESIGN.md`) in the Next.js frontend: typography and elevation scales, WCAG AA contrast floors, theme registration with a regression guard, radius and focus corrections, and the gates that prove them. `frontend-vibrant-redesign` is deliberately unarchived, so this capability is authored in full.

Numeric token values are sourced from `docs/designs/DESIGN.md`; that document is normative where this spec names a token but not its value.

## Requirements

### Requirement: Typography Scale Tokens

Each of the 12 `docs/designs/DESIGN.md` type steps MUST be registered in `@theme inline` as a base `--text-{step}` token paired with a `--text-{step}--line-height` sub-token. Tailwind v4 emits `text-{step}` from the pair and sets both `font-size` and `line-height`; a base token without its sub-token emits a utility whose `line-height` silently inherits. Size-token names MUST NOT collide with the existing color tokens `--text-primary`, `--text-secondary`, `--text-muted`. The font primitives `--font-sans` and `--font-heading` (Plus Jakarta Sans) and `--font-label` (Inter) MUST remain registered, and the named UI primitives (buttons, badges, cards) MUST render through them. This change MUST NOT require replacing the 236 existing ad-hoc `text-*` size usages.

#### Scenario: Every scale step declares a paired line height

- GIVEN the `@theme inline` block in `frontend/app/globals.css`
- WHEN each registered `--text-{step}` base token is parsed
- THEN a `--text-{step}--line-height` sub-token exists for it
- AND no `--text-*` size token shares a name with a `--color-*` text token

#### Scenario: Inter renders on buttons and badges

- GIVEN the shared button and badge primitives
- WHEN they render label text
- THEN the Inter font primitive applies and Plus Jakarta Sans does not
- AND every other page's ad-hoc `text-*` usage is unchanged

### Requirement: Elevation Scale Tokens

`@theme inline` MUST register `--shadow-level-0` through `--shadow-level-3` using the `docs/designs/DESIGN.md` ambient hierarchy. Level 0 MUST be `none`, delineating form only via a 1px border. Level 1 MUST be `0px 2px 8px -2px rgba(15, 23, 42, 0.06)`, Level 2 `0px 8px 24px -4px rgba(15, 23, 42, 0.12)`, and Level 3 `0px 16px 36px -6px rgba(15, 23, 42, 0.18)`.

#### Scenario: Token values match the design source

- GIVEN the four registered `--shadow-level-*` tokens
- WHEN each value is compared to `docs/designs/DESIGN.md`
- THEN all four match, including Level 0 resolving to no shadow

#### Scenario: Mapped surfaces use the level utilities

- GIVEN the card, category, chip, and modal surfaces identified for elevation
- WHEN their class lists are read
- THEN each uses a `--shadow-level-*` utility rather than a stock Tailwind shadow

### Requirement: Text Token Contrast Floor

Every text token MUST reach a WCAG 2.1 AA contrast ratio of at least 4.5:1 against every surface in the surface ramp, where the ramp includes `--surface-dim` (`#d2d9f4`) as the binding constraint. Per SC 1.4.3 the threshold MUST NOT be rounded: a computed 4.499:1 fails. The ramp-wide reading is normative because a Tailwind token is a global utility that can land on any surface, so a single value must satisfy the threshold everywhere; compliance MUST NOT be asserted against the page background alone. `--text-muted` MUST be `#5c5d72`, which measures 4.587:1 on `--surface-dim`.

#### Scenario: Text tokens clear 4.5:1 across the whole ramp

- GIVEN the text token values and the full surface ramp
- WHEN ratios are computed with the SC 1.4.3 formula
- THEN every text token reaches at least 4.5:1 on every ramp surface
- AND the binding surface `--surface-dim` is among the surfaces asserted

#### Scenario: The superseded muted value fails the binding surface

- GIVEN the `--text-muted` value before this change
- WHEN its ratio on `--surface-dim` is computed
- THEN it is below 4.5:1 and the contrast test fails
- AND after the change the test passes on the same surface

### Requirement: Control Border Contrast Floor

A dedicated control-border token MUST be registered in `@theme inline` and MUST reach at least 3:1 against adjacent surfaces across the same ramp, per SC 1.4.11. It MUST re-point at the existing `--outline` value `#757684`, which already measures 3.198:1 ramp-wide, so no new hex value is introduced. Interactive control boundaries MUST use it. `--outline-variant` (`#c4c5d5`, 1.218:1 worst case) MUST remain available for decorative and divider use, and MUST NOT be darkened globally: SC 1.4.11 does not require a visible boundary where the control's own content identifies it.

#### Scenario: Control borders reach 3:1 on every surface

- GIVEN the control-border token value
- WHEN its ratio is computed against every ramp surface
- THEN each is at least 3:1, asserted on `--surface-dim` as the binding surface

#### Scenario: Decorative outlines are not darkened

- GIVEN `--outline-variant` and the divider surfaces
- WHEN the contrast assertions run
- THEN `--outline-variant` is still `#c4c5d5` and still carries the 1.218:1 figure
- AND only interactive control boundaries carry the control-border token

### Requirement: Theme Token Registration And Guard

The six currently unregistered `:root` tokens — `--tertiary`, `--tertiary-container`, `--on-tertiary`, `--on-tertiary-container`, `--on-background`, `--surface-dim` — MUST be registered inside `@theme inline`. A regression guard MUST assert, in both directions, that every `:root` token has a registration or an explicit allowlist entry, and that every `var()` target referenced by a registration resolves. The guard MUST fail on a deliberately unregistered token and pass once that token is registered.

#### Scenario: All six tokens are registered

- GIVEN the parsed `:root` and `@theme inline` blocks
- WHEN the guard runs
- THEN all six tokens are registered and it passes

#### Scenario: The guard fails on a bad token

- GIVEN a token deliberately added to `:root` without a registration
- WHEN the guard runs
- THEN it fails and names the unregistered token
- AND the guard passes again once the registration is added

### Requirement: Radius Correction At Navbar Controls

Exactly three `rounded-lg` usages in `frontend/components/Navbar.tsx` MUST become `rounded-xl`: the cart chip at L185 (the filled `bg-white/10` control), the logout button at L219, and the mobile-menu button at L238. The two plain navigation links at L198 (`/orders`) and L206 (`/profile`), and the logo container at L121, MUST keep `rounded-lg` because they are not filled button-like controls. The global radius ramp MUST NOT be altered: its registered steps do not match the `docs/designs/DESIGN.md` named steps, and correcting the ramp would restyle every button and surface application-wide.

#### Scenario: Navbar controls use the button radius

- GIVEN the Navbar class lists
- WHEN radius classes are read
- THEN L185, L219, and L238 use `rounded-xl`
- AND L121, L198, and L206 still use `rounded-lg`
- AND the registered `--radius-*` ramp values are byte-identical to their current values

### Requirement: Footer Focus Visibility

The eleven interactive elements in the application footer MUST expose a visible `:focus-visible` ring. Pre-existing markup MUST NOT be treated as exempt.

#### Scenario: Footer links show a focus ring

- GIVEN the eleven footer interactive elements
- WHEN keyboard focus moves to each one
- THEN each exposes a `:focus-visible` ring on the footer's dark surface

### Requirement: Backend Test Gate

`manage.py test` MUST exit 0. The fix MUST be a class-level `@override_settings(STORAGES=…)` on `AdminAccessControlTests` in `backend/mitienda/tests.py`, scoped to exactly the four tests that render the admin login template: `test_default_admin_url`, `test_custom_admin_url_routes_admin`, `test_allowlisted_ip_allowed`, and `test_allowlist_unset_permits_access`. The production `STORAGES` setting MUST NOT change, storage selection MUST NOT be gated on `DEBUG`, and a `collectstatic` step MUST NOT become a prerequisite of the gate. Reason recorded: Django 6.1's `setup_test_environment` inherits `settings.DEBUG` instead of forcing it to `False`, and `settings.py:42` defaults it to `False`, so a `DEBUG`-gated block still selects the manifest backend during tests.

#### Scenario: The gate is green with no prerequisite

- GIVEN a clean checkout with no `staticfiles.json`
- WHEN the backend test command runs
- THEN it exits 0 without a prior `collectstatic` step

#### Scenario: Only the four admin-login tests are affected

- GIVEN the class-level storage override
- WHEN the test suite is inspected
- THEN it covers the four admin-login tests and changes no production setting
- AND the class `tearDown` settings reload still composes with the override

### Requirement: Frontend Test Runner

Vitest with jsdom and React Testing Library MUST be the single runner for this change. Design-system assertions MUST be made at source-and-arithmetic level — parsing `globals.css` for registration and computing WCAG ratios from token values — because jsdom does not apply Tailwind's compiled stylesheet and `@theme` is a build-time construct. The suite MUST NOT claim browser verification. Playwright, CI configuration, and the `qrcode.react` pin are out of scope.

#### Scenario: Design-system assertions are source-and-arithmetic

- GIVEN a token registration or contrast claim
- WHEN it is asserted
- THEN it is proven by parsing the stylesheet source or by computing the ratio
- AND never by reading a computed style that jsdom cannot resolve

#### Scenario: The suite does not claim browser verification

- GIVEN the passing test suite
- WHEN its reported coverage is reviewed
- THEN it states that no browser or computed-style verification was performed
- AND radius and elevation results are marked verified by build or manual inspection

### Requirement: Dead Conditional Removal

The dead conditional in `frontend/app/orders/[id]/page.tsx` whose two branches hold identical class strings MUST be removed, collapsing to the single literal.

#### Scenario: Identical branches are collapsed

- GIVEN the terminal-marker conditional in the order detail page
- WHEN it is read
- THEN a single class string remains and no ternary with equal branches exists
