# Research: Frontend Design System Follow-ups

## Context

The parent change `frontend-vibrant-redesign` failed verification and the maintainer
elected to open this change instead of expanding it. Nine findings were deferred.

Four product decisions are already confirmed and are treated as fixed inputs:

| # | Decision | Confirmed answer |
| --- | --- | --- |
| D1 | Typography scope | Tokens for the type scale plus primitives only (~50 lines). Do not replace the 236 existing size usages. |
| D2 | Border token | Add a dedicated control-border token. Do not darken `--outline-variant` globally. |
| D3 | Frontend test runner | Adopt a real DOM runner. Exact runner pending this research. |
| D4 | 2FA continuity | Global `totp_required` handler plus a `/users/logout/` exemption (~60–120 lines). |

This document is the mandatory external-evidence research that gates `sdd-propose`.
Completion of this research is a hard precondition, not a formality.

### Method

- Normative claims come from first-party sources: W3C, Tailwind, WhiteNoise, Django, Next.js.
- Every contrast number is computed locally from the normative WCAG formula, not quoted
  from a third-party checker, so the arithmetic is auditable and reproducible.
- Where local source code contradicts a prior recommendation, the local source wins and the
  contradiction is recorded in "Corrections" below.

---

## Lane 1 — WCAG 2.2 contrast requirements

### 1.1 SC 1.4.3 Contrast (Minimum), Level AA

Source: <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html>

- Text requires **4.5:1** against its background.
- Large-scale text requires **3:1**. Large scale is at least 18pt (24px), or 14pt (18.66px)
  when bold.
- The ratio is a **threshold and must not be rounded**: a computed 4.499:1 does not pass.
- The normative formula, quoted from the criterion:

  ```
  contrast ratio = (L1 + 0.05) / (L2 + 0.05)
  L  = 0.2126*R + 0.7152*G + 0.0722*B
  R  = RsRGB/12.92                      if RsRGB <= 0.04045
  R  = ((RsRGB + 0.055)/1.055) ^ 2.4   otherwise
  RsRGB = R8bit/255   (same for G, B)
  ```

- If a text color is specified with no background, that is a failure, because the user's
  default background is unknown and cannot be evaluated.

### 1.2 SC 1.4.11 Non-text Contrast, Level AA

Source: <https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>

- Visual information required to identify **user interface components and states** requires
  **3:1** against adjacent colors. The same applies to graphical objects required to
  understand content.
- Exempt: inactive components, appearance determined by the user agent, decorative graphics,
  essential presentation, and logos.
- "Adjacent colors" means colors **outside** the component. An input with a white fill, a dark
  border and a white surrounding background is measured border-against-surrounding-white.
- **A visible boundary is not required** when the control is already identifiable by its
  content:

  > "This success criterion does not require that controls have a visual boundary indicating
  > the hit area. If a control has visible content (such as text or a sufficiently
  > contrasting icon), which helps users identify the presence of the control, then a border
  > or other indication of the overall boundary of the hit area is not required."

- Author-supplied hover treatments are supplemental and need not reach 3:1; the component
  must simply not lose contrast against adjacent colors.
- 3:1 is likewise a threshold and must not be rounded.

This clause is the direct normative basis for decision D2: the correct move is a token
scoped to control borders, not a global darkening of the decorative `--outline-variant`.

### 1.3 Local computation against the real palette

Computed with the formula in 1.1 over the surface ramp in `frontend/app/globals.css`.
The binding surface is the one with the lowest ratio.

**Text pairs, threshold 4.5:1** (`--text-muted` is `#757684` today):

| Foreground | on `#faf8ff` | `#ffffff` | `#f2f3ff` | `#eaedff` | `#e2e7ff` | `#dae2fd` | `#d2d9f4` | Worst | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `#757684` (current) | 4.259 | 4.486 | 4.067 | 3.857 | 3.655 | 3.478 | 3.198 | **3.198** | FAIL |
| `#6b6c79` | 4.927 | 5.190 | 4.705 | 4.462 | 4.228 | 4.023 | 3.700 | **3.700** | FAIL |
| `#5f6078` | 5.811 | 6.121 | 5.549 | 5.263 | 4.986 | 4.744 | 4.364 | **4.364** | FAIL |
| `#5c5d72` | 6.108 | 6.434 | 5.834 | 5.532 | 5.242 | 4.987 | 4.587 | **4.587** | PASS |
| `#444653` (`--text-secondary`) | 8.873 | 9.347 | 8.474 | 8.037 | 7.615 | 7.245 | 6.664 | **6.664** | PASS |

**Control borders, threshold 3:1** (`--outline-variant` / `--border` is `#c4c5d5` today):

| Border | on `#faf8ff` | `#ffffff` | `#f2f3ff` | `#eaedff` | `#e2e7ff` | `#dae2fd` | `#d2d9f4` | Worst | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `#c4c5d5` (current) | 1.622 | 1.708 | 1.549 | 1.469 | 1.392 | 1.324 | 1.218 | **1.218** | FAIL |
| `#949494` | 2.880 | 3.033 | 2.750 | 2.608 | 2.471 | 2.351 | 2.163 | **2.163** | FAIL |
| `#8a8b9c` | 3.188 | 3.358 | 3.045 | 2.887 | 2.736 | 2.603 | 2.394 | **2.394** | FAIL |
| `#7d7e8f` | 3.795 | 3.998 | 3.625 | 3.437 | 3.257 | 3.099 | 2.850 | **2.850** | FAIL |
| `#757684` (`--outline`) | 4.259 | 4.486 | 4.067 | 3.857 | 3.655 | 3.478 | 3.198 | **3.198** | PASS |

### 1.4 Stated assumption

Tailwind design tokens are global utilities: any token can be applied to any surface. A
single token value must therefore satisfy its threshold on **every** surface it can land on,
which makes `--surface-dim` (`#d2d9f4`) the binding constraint. This is the defensible
reading for a design system and it is stricter than checking only the page background.

If the maintainer later narrows the requirement to `#faf8ff` and `#ffffff` only, a lighter
value would pass. The ramp-wide reading is recommended and is what the numbers above assume.

### 1.5 Conclusions

1. `--text-muted` `#757684` **already fails AA today**, at 4.259 on the page background
   itself. This is not only a token-registration problem.
2. `#6b6c79` and `#5f6078` are both **insufficient**. See Corrections.
3. `#5c5d72` passes 4.5:1 across the entire ramp with 4.587 worst case. Recommended value.
4. `--outline-variant` `#c4c5d5` fails 3:1 at every surface, worst case 1.218.
5. **`--outline` `#757684` already satisfies 3:1 across the entire ramp** (worst 3.198).
   The new control-border token therefore needs **no new hex value** — it re-points at an
   existing palette entry. The diff is a token plus re-pointed usages, not a palette change.

---

## Lane 2 — Tailwind CSS v4 theme namespaces

Sources: <https://tailwindcss.com/docs/theme> and <https://tailwindcss.com/docs/font-size>

### 2.1 The `@theme` contract

`@theme` declares CSS variables and Tailwind generates the matching utilities and variants
automatically. Generation is **namespace-driven**, which is precisely why unregistered
variables produce no utility:

| Namespace | Generates |
| --- | --- |
| `--color-*` | color utilities (`bg-*`, `text-*`, `border-*`, …) |
| `--text-*` | `text-{name}` setting **both** `font-size` and `line-height` |
| `--font-*` | `font-{name}` |
| `--radius-*` | `rounded-{name}` |
| `--breakpoint-*` | `{name}:*` variants |

### 2.2 The font-size sub-token pattern

Each `--text-{name}` base token is paired with a `--text-{name}--line-height` sub-token. The
default scale has 13 steps from `--text-xs: 0.75rem` through `--text-9xl: 8rem`, each with a
paired line height (`--text-sm: 0.875rem` with `--text-sm--line-height: calc(1.25 / 0.875)`).

A custom size may carry further sub-tokens:

```css
@theme {
  --text-tiny: 0.625rem;
  --text-tiny--line-height: 1.5rem;
  --text-tiny--letter-spacing: 0.125rem;
  --text-tiny--font-weight: 500;
}
```

**Consequence for D1:** a correct type-scale token is a base value plus at least a
`--line-height` sub-token. Declaring only `--text-*` without the paired sub-token emits a
utility whose `line-height` falls back to an inherited value, which is exactly the kind of
defect the deferred finding describes.

### 2.3 `@theme inline`

When a theme variable references another CSS variable, `@theme inline` makes the generated
utility use the resolved **value** instead of re-referencing the theme variable. `globals.css`
already uses `@theme inline`, which is the correct pattern for tokens that alias `:root`
custom properties.

### 2.4 Conclusions

1. The six unregistered tokens fail purely because of namespace registration. Registering
   them inside `@theme inline` is a self-contained edit with no component changes.
2. Typography tokens must be declared as base + `--line-height` sub-token pairs to emit a
   correct `text-*` utility. This research confirms the **mechanism**; the numeric values
   remain those already settled in `docs/designs/DESIGN.md`.
3. The control-border token is a `--color-*` registration like any other, and re-points at
   `#757684` per Lane 1.

---

## Lane 3 — WhiteNoise manifest storage and the failing backend gate

### 3.1 Observed failure, local evidence

- Django **6.1.1**, `whitenoise.storage.CompressedManifestStaticFilesStorage` configured at
  `backend/mitienda/settings.py:178-185`.
- Scoped run `.venv\Scripts\python.exe manage.py test mitienda.tests.AdminAccessControlTests`:
  `Ran 6 tests ... FAILED (errors=4)`, every error
  `ValueError: Missing staticfiles manifest entry for 'admin/css/base.css'`.
- The four failing methods are exactly the four that render the admin login template:
  `test_default_admin_url`, `test_custom_admin_url_routes_admin`,
  `test_allowlisted_ip_allowed`, `test_allowlist_unset_permits_access`.
  `test_unlisted_ip_denied` returns 403 without rendering and passes.

Root cause per <https://whitenoise.readthedocs.io/en/stable/django.html>: `{% static %}`
resolves through the manifest backend and requires `staticfiles.json`, which only
`collectstatic` produces. The test gate never runs it.

### 3.2 Why a DEBUG-gated STORAGES does **not** fix this — source evidence

Django 6.1 `django/test/utils.py`, `setup_test_environment`:

```python
if debug is None:
    debug = settings.DEBUG
...
saved_data.debug = settings.DEBUG
settings.DEBUG = debug
```

The test runner now **inherits** `settings.DEBUG`; it no longer forces it to `False`. And
`backend/mitienda/settings.py:42` defaults it off:

```python
DEBUG = _env_bool('DJANGO_DEBUG', 'False')
```

`STORAGES` is evaluated at settings import time, before the runner touches `DEBUG`. So a
DEBUG-gated storage block still selects the manifest backend in the test gate unless
`DJANGO_DEBUG=1` is exported. That would run the entire suite — and the
`HashedFilesMixin` manifest path — under a configuration that never ships, in a project whose
own suite asserts DEBUG-dependent behavior at `mitienda/tests.py:23-37`.

This rejects the exploration's recommendation on evidence, not on preference.

### 3.3 Options evaluated

| Option | Fixes gate | Touches production | Creates files | Assessment |
| --- | --- | --- | --- | --- |
| `collectstatic --noinput` before tests | Yes | No | Yes, hundreds under `backend/staticfiles/`, plus a `.gitignore` change and a slower gate | Rejected |
| DEBUG-gated `STORAGES` | No | Yes | No | Rejected, see 3.2 |
| Dedicated test settings module | Yes | No | Yes | Viable, but changes the gate command and widens scope |
| `manifest_strict = False` subclass | Yes | Only if misapplied | Yes, new module | Rejected: weakens genuine missing-asset detection |
| **`@override_settings(STORAGES=...)` on `AdminAccessControlTests`** | **Yes, all 4** | **No** | **No** | **Recommended** |

### 3.4 Conclusion

Decorate the single affected test class with
`@override_settings(STORAGES={'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}})`.
This targets exactly the four failing tests, changes no production behavior, creates no
build artifacts, and matches the file's existing style, which already uses method-level
`@override_settings`.

Implementation risk to verify at apply time: the class `tearDown` reloads the
`mitienda.settings` module, so confirm the class-level override composes with that reload.

`CompressedStaticFilesStorage` is a reasonable alternative if compression parity with
production is wanted in tests; plain `StaticFilesStorage` is preferred because tests assert
nothing about compression.

---

## Lane 4 — Frontend test runner

### 4.1 What this change actually needs to prove

| Evidence need | Real browser required? |
| --- | --- |
| Every `var(--token)` used resolves to a `@theme` definition | No, source assertion |
| Token pairs meet 1.4.3 and 1.4.11 | No, pure arithmetic |
| Radius and elevation utilities are applied | Yes, computed style |
| `totp_required` handler redirects and exempts logout | No, jsdom is sufficient |
| A real user flow across the stack | Yes |

### 4.2 Candidates, from the official Next.js guides (docs version 16.3.4)

Source: <https://nextjs.org/docs/app/guides/testing> and
<https://nextjs.org/docs/app/guides/testing/vitest>

- **Vitest + jsdom + React Testing Library.** The documented unit and component setup. Dev
  dependencies: `vitest @vitejs/plugin-react jsdom @testing-library/react
  @testing-library/dom vite-tsconfig-paths`. Config is `test: { environment: 'jsdom' }`.
  Caveat stated by Next.js: async Server Components are not supported, so E2E is recommended
  for those.
- **Playwright.** E2E across Chromium, Firefox and WebKit. Requires a running server and a
  browser download.
- **Vitest browser mode.** Runs tests in a real browser inside Vitest; the Vitest docs note
  limitations and recommend Playwright as the complement for E2E.

### 4.3 Critical caveat that drives the recommendation

jsdom does not apply Tailwind's compiled stylesheet, and `@theme` is a build-time construct.
Asserting `getComputedStyle(el).color` against Tailwind output inside jsdom is unreliable.
The design-system contract must therefore be asserted **at source and arithmetic level**, not
at computed-style level. A "DOM runner" that cannot see the stylesheet would give false
confidence about exactly the defects this change exists to fix.

### 4.4 Recommendation

**Vitest (jsdom + React Testing Library) as the single runner for this change**, hosting:

1. A token-registration guard that parses `globals.css` and asserts every `var(--…)`
   referenced has a `@theme` definition. Pure source, no DOM required.
2. WCAG assertions computed from the token values with the Lane 1 formula. Pure arithmetic,
   deterministic, milliseconds.
3. Component tests for the global `totp_required` handler and its logout exemption.

This satisfies confirmed decision D3: jsdom is a real DOM implementation, unlike the
standalone `node:test` guard, so component behavior is genuinely exercised — while the two
highest-value guards need no browser at all.

Playwright is deferred to a later change. Adopting it now would require a running server, a
browser download, and CI infrastructure that this repository does not have, in exchange for
computed-style verification that the arithmetic tests already cover more precisely.

The standalone `node:test` guard proposed during exploration is superseded: it folds into
this suite as cases 1 and 2, and drops its separate prebuild step.

---

## Corrections to `exploration.md`

1. **`#5f6078` is insufficient.** It reaches 4.364:1 on `--surface-dim`, below the 4.5
   threshold. `#5c5d72` (4.587 worst case) is the minimum passing value of the candidates
   evaluated. The exploration's contrast fix would not have closed the finding.
2. **A DEBUG-gated `STORAGES` does not fix the backend gate.** Django 6.1's
   `setup_test_environment` inherits `settings.DEBUG` and the project defaults it to `False`,
   so the manifest backend is still selected during tests. Use `override_settings` on the
   affected class.
3. **`--outline-variant` is worse than reported.** Worst case is 1.218:1 on `--surface-dim`,
   not the 1.71:1 single-surface figure. Separately, `--outline` `#757684` already meets
   3:1 across the whole ramp, so the new control-border token requires no new hex.
4. **The standalone `node:test` guard is superseded** by the Vitest suite. It must be a
   source-and-arithmetic test, not a computed-style test, because jsdom does not apply
   Tailwind output.

---

## Evidence index

| Claim | Source |
| --- | --- |
| 4.5:1 / 3:1 text thresholds, no rounding, luminance formula | W3C SC 1.4.3 Understanding |
| 3:1 for UI components and states, exemptions, boundary rule, adjacent colors | W3C SC 1.4.11 Understanding |
| All contrast figures in this document | Computed locally with the 1.4.3 formula over `globals.css` |
| `@theme` namespace-driven utility generation | <https://tailwindcss.com/docs/theme> |
| `--text-*` base + `--line-height` sub-token pattern, 13-step default scale | <https://tailwindcss.com/docs/font-size> |
| `@theme inline` resolution behavior | <https://tailwindcss.com/docs/colors> |
| Manifest storage requires `staticfiles.json` from `collectstatic`; `WHITENOISE_MANIFEST_STRICT` semantics | <https://whitenoise.readthedocs.io/en/stable/django.html> |
| `setup_test_environment` inherits `settings.DEBUG` in Django 6.1 | `backend/.venv/Lib/site-packages/django/test/utils.py`, local source |
| 4 failing tests, all `admin/css/base.css`, all in `AdminAccessControlTests` | Local run of `manage.py test mitienda.tests.AdminAccessControlTests` |
| Vitest/Playwright guidance for Next.js 16.3.4 | <https://nextjs.org/docs/app/guides/testing> |

---

## Residual open items

- **Type scale values.** This research confirms the token mechanism, not the numbers. Values
  remain those settled in `docs/designs/DESIGN.md`.
- **Elevation values.** Same: mechanism confirmed, values already settled in `DESIGN.md`.
- **`qrcode.react` exact pin.** Deferred; not in this change's scope.
- **Playwright adoption.** Deferred to a change that also introduces CI.
- **Contrast scope assumption.** Lane 1.4 states the ramp-wide reading. Narrowing it to the
  page background and card surfaces only would allow a lighter `--text-muted`; the
  ramp-wide reading is recommended.
