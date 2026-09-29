# Design: Frontend Design System Follow-ups

## Technical Approach

Eight work units (W1–W8) delivered as an auto-chained PR sequence. The change is token-, class-, and test-scope only: no models, no migrations, no API contract change beyond one authentication exemption. The load-bearing ideas are (a) a single seam in `frontend/lib/api.ts` that every authenticated surface already routes through, so the 2FA challenge is mounted once at the root rather than per page, and (b) proof by source parsing and arithmetic instead of by computed style, because jsdom cannot apply Tailwind's compiled output.

All values below were recomputed locally from `frontend/app/globals.css` with the SC 1.4.3 formula and reproduce `research.md` §1.3 exactly.

## Architecture Decisions

| # | Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|---|
| 1 | Logout exemption match | Exact-path `frozenset` literal + `resolve()`-backed test | `startswith('/api/users/')` prefix | A prefix exempts login, register, profile and 2FA enrollment. The literal is narrow, and the resolve test converts a wrong literal from a silent lockout into a red test. |
| 2 | Exemption scope | Wraps the TOTP block only, after the TTL check | Skip the whole `_validate_expiry_and_2fa` | TTL is a uniform session-lifecycle rule; the TOTP gate is the only rule that can close the recovery path. |
| 3 | Control-border criterion | Re-point only where the border is the element's *sole* affordance | Darken `--outline-variant`; blanket re-point | SC 1.4.11 exempts boundaries a control's own content already identifies. A blanket re-point would restyle ~25 dividers for no normative gain. |
| 4 | Contrast proof | Pure arithmetic over token values across the 7-surface ramp | Computed style in jsdom | jsdom does not apply the compiled stylesheet; a computed-style assert would be false confidence. |
| 5 | 2FA challenge mount | One dialog in `AuthProvider`; the login page's inline step is deleted | Per-page handling; keep both | The spec forbids a single-surface challenge. Removing the duplicate is the only way to guarantee no surface is left out. |
| 6 | Typography scope | 12 size + 12 line-height declarations; no weight/tracking | Add `--font-weight`/`--letter-spacing` sub-tokens | W6 is budgeted at ~50 lines. Weight/tracking would add 24 lines and the spec scenario mandates only the pair. Deferred, see Risks. |
| 7 | Elevation consumers | 12 sites; `--shadow-level-3` registered but unconsumed | Force a Level 3 consumer | The only overlay is `sileo`'s Toaster, configured by props, not Tailwind classes. An unused token is honest; a forced consumer is not. |
| 8 | W1 lockfile | `size:exception` for the lockfile only; authored W1 code stays under budget | Split W1 | A lockfile is atomic — it cannot be sliced. Splitting would produce an unbuildable intermediate commit. |

## D1 — Logout Exemption (file-level)

Constant lives in `backend/users/authentication.py` at module level, above `ExpiringTokenAuthentication`, because that is the only module that owns the gate:

```python
# Exact request paths exempt from the TOTP gate. A gated user must always be
# able to sign out; the TTL check above still applies to these endpoints.
# Every entry is asserted to resolve to users.views.LogoutView by
# TOTPExemptPathTests.test_every_exempt_path_resolves_to_logout.
TOTP_EXEMPT_PATHS = frozenset({'/api/users/logout/'})
```

In `_validate_expiry_and_2fa` (L53–71), the exemption narrows only the 2FA branch:

```python
if getattr(settings, 'DJANGO_2FA_ENFORCED', False) and request.path not in TOTP_EXEMPT_PATHS:
```

**Why this cannot silently match nothing.** Three independent guards, all in `backend/users/tests.py` (`TwoFAGateTests`):

| Test | Asserts | Catches |
|---|---|---|
| `test_exempt_paths_resolve_to_logout_view` | `django.urls.resolve(p).func.view_class is LogoutView` for every allowlist entry | A stale literal after a URLconf rename — `Resolver404` fails loudly, naming the path |
| `test_gated_user_can_logout` | Gated admin POSTs `/api/users/logout/` without `X-TOTP` → 200, token deleted | A wrong literal: the gate would still 401 |
| `test_gated_user_still_gated_on_profile` | Gated admin GETs `/api/users/profile/` → 401 `totp_required` | An over-broad allowlist |

The third test is what makes the boundary reviewable in both directions, mirroring the two-directional discipline used by the token guard in D3.

Documented assumption: `request.path` is the full decoded path with no script prefix, which holds because the project is root-deployed (WhiteNoise). The resolve test fails loudly if a sub-path deployment is ever introduced.

## D2 — Control-Border Repoint Boundary

Token: `--control-border: var(--outline)` (no new hex), registered as `--color-control-border`, generating `border-control-border`. Computed: `#757684` → 3.198:1 worst case on `#d2d9f4`.

**The rule.** Re-point a border occurrence *iff* removing it would remove the only cue that the element is a hit target. Concretely: native form controls (`input`, `select`, `textarea`) and controls whose boundary is their sole affordance (the outline `Button` variant, bordered filter chips, selectable option cards). Everything structural keeps `--outline-variant`.

**Bucket A — receives `border-control-border` (15 sites).** Each is verified in source to be a control whose border is the only affordance:

| File:Line | Element |
|---|---|
| `app/login/page.tsx:21` | `inputClass` (username, password, TOTP code) |
| `app/register/page.tsx:13` | `inputClass` |
| `app/profile/page.tsx:24, 235, 249` | `inputClass`, address input, phone input |
| `app/checkout/page.tsx:59, 397` | Text input; unselected shipping-option card |
| `app/products/page.tsx:215, 239, 259, 277` | Search input; sort `<select>`; two inactive filter-toggle branches |
| `app/page.tsx:180` | Category tile `Link` (unfilled branch) |
| `components/admin/StaffUserForm.tsx:36` | Input/select |
| `components/admin/TOTPConfirmForm.tsx:10` | Code input |
| `components/ui/button.tsx:12` | Outline button variant (`border-border`) |

**Bucket B — keeps `--outline-variant` (25 sites).** Table header/body rules (`bodega:199`, `DispatchRoutesView:196`, `OrdersDashboard:206`, `StaffUserList:123`, `InventoryView:202`), list/section separators (`cart:152`, `orders/page:333`, `profile:201`, `Navbar:252,307`, `layout:89`), card and panel boundaries (`ProductCard:70`, `page:277`, `cart:145`, `orders:446`, `orders/[id]:350,568`, `products/[id]:119`, `products:373`, `DiscrepancyPanel:267`, `StaffKpiRow:73`, `InventoryView:155`), non-interactive content frames (`InventoryView:168,175,182` KPI tiles, `TOTPSecretCard:68` QR frame, `TOTPSecretCard:100` `<p>` secret readout), non-interactive status chrome (`ui/badge.tsx:17`, `lib/order-status.tsx:20`, `page.tsx:149`), and structural primitives (`ui/card.tsx:27,86`, `ui/separator.tsx:16`).

**No change:** `border-primary` selected branches, `border-outline` (already 3.198), `border-transparent` bases, `ring-primary/40`, and the 11 `border-white/10` Navbar rules on the dark header — none of these reference `--outline-variant`.

**Correction to the proposal.** The proposal estimates ~62 border usages shift. The exhaustive enumeration above yields **15**, because most `--outline-variant` uses are dividers, not control boundaries. W4 lands at roughly 15 changed lines plus 2 token lines, not 25+.

## D3 — Vitest Suite Structure

```
frontend/
├── vitest.config.ts              # new
├── vitest.setup.ts               # new: RTL cleanup afterEach
├── tests/
│   ├── support/
│   │   ├── css-tokens.ts         # parse :root + @theme inline → { tokens, registrations }
│   │   └── contrast.ts           # WCAG 1.4.3 luminance + ratio, no rounding
│   ├── theme-registration.test.ts
│   ├── contrast.test.ts
│   └── totp-challenge.test.tsx
```

`vitest.config.ts` — minimal, jsdom only, no coverage provider (coverage reporting is not a success criterion and would add a dev dependency):

```ts
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: { environment: 'jsdom', setupFiles: ['./vitest.setup.ts'] },
});
```

`package.json`: `"test": "vitest run"`. Dev dependencies: `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `vite-tsconfig-paths` (the last is required because every test imports through the `@/*` alias declared in `tsconfig.json:21`).

**Guard design (both directions).** `checkTokenRegistration(source: string)` in `tests/support/css-tokens.ts` returns `{ unregistered: string[]; dangling: string[] }` — a pure function over a stylesheet string, so it is callable against the real file and against a mutated copy:

| Direction | Assertion | Computed baseline |
|---|---|---|
| Forward | Every `:root` token ∈ (theme `var()` targets ∪ allowlist) | 7 unregistered today: the 6 named by the spec **plus `--radius`** |
| Reverse | Every `var()` target in `@theme inline` resolves to a `:root` token or a declared `next/font` variable | 0 dangling today |

**Proving the guard fails, without polluting `globals.css`.** Two in-memory string mutations, in one test:

1. `mutate1 = realCss.replace(':root {', ':root {\n  --probe-unregistered: #000000;')` → assert `checkTokenRegistration(mutate1).unregistered` deep-equals `['--probe-unregistered']`. The failure message names the token, satisfying the spec scenario.
2. `mutate2 = mutate1.replace('@theme inline {', '@theme inline {\n  --color-probe-unregistered: var(--probe-unregistered);')` → assert `checkTokenRegistration(mutate2).unregistered` is empty.

The real stylesheet is never written; both fixtures are derived from the file read at test time, so the guard cannot drift from what ships.

**Contrast design.** Pure arithmetic over the 7-surface ramp `#faf8ff, #ffffff, #f2f3ff, #eaedff, #e2e7ff, #dae2fd, #d2d9f4`, with `--surface-dim` (`#d2d9f4`) asserted as the binding surface:

| Token | Value | Worst ratio | Threshold |
|---|---|---|---|
| `--text-primary` | `#131b2e` | 12.233 | 4.5 |
| `--text-secondary` | `#444653` | 6.664 | 4.5 |
| `--text-muted` (new) | `#5c5d72` | 4.587 | 4.5 |
| `--outline` (new `--control-border` target) | `#757684` | 3.198 | 3.0 |

**Non-rounding rule (SC 1.4.3).** Encoded three ways: (a) the threshold comparison is `ratio >= 4.5` on the unrounded float, with no `toFixed` in the comparison path; (b) a unit test on a synthetic pair computing `4.499:1` asserts it fails and `4.5:1` passes; (c) the superseded-muted case asserts `#757684` (4.259 on `#faf8ff`, 3.198 worst) fails before the change and `#5c5d72` passes after — proving the assertion is sensitive, not vacuous. A helper `parseHex` rejects any non-6-digit hex rather than defaulting, so an unparseable token fails the test instead of silently skipping.

## D4 — Token Allowlist

Computed today: **exactly one entry**.

| Allowlisted `:root` token | Reason (asserted non-empty by the test) |
|---|---|
| `--radius` | `@theme inline` registers a literal `--radius-sm`…`--radius-4xl` ramp that does not alias `var(--radius)`. Registering it would repoint the whole global radius ramp, which the spec forbids. |

**Admission rule.** A `:root` token may be allowlisted only if it has no design-system utility surface — that is, registering it would either generate a utility no component consumes, or would change a registered ramp the spec freezes. Each entry carries a reason string; the test asserts the reason is non-empty and that the token is genuinely absent from the theme, so an entry cannot be used to mask an accidental omission. Adding a token to the allowlist to make the guard green is a reviewable diff, not a silent pass.

## D5 — Typography Token Naming

Tokens take the `docs/designs/DESIGN.md` step names verbatim: `display-hero`, `headline-lg`, `headline-md`, `headline-sm`, `price-hero`, `price-card`, `body-lg`, `body-md`, `body-sm`, `label-lg`, `label-md`, `label-badge`.

**Collision analysis.** The existing color tokens are `--text-primary`, `--text-secondary`, `--text-muted`; none of the 12 step names is `primary`, `secondary`, or `muted`, so no size token shares a name with a `--color-*` text token. No step name is a bare `sm`/`md`/`lg`/`xl`, so none shadows a Tailwind default-scale step. The `--text-*` size namespace and the `--color-text-*` namespace coexist without utility collision: `--color-text-primary` generates `text-text-primary`, not `text-primary`. Verified against the 236 existing `text-*` usages — no collision.

**Declaration shape** (24 lines in `@theme inline`):

```css
  /* Typography scale - docs/designs/DESIGN.md */
  --text-display-hero: 2.25rem;                 --text-display-hero--line-height: 2.75rem;
  --text-headline-lg: 1.75rem;                  --text-headline-lg--line-height: 2.125rem;
  --text-headline-md: 1.375rem;                 --text-headline-md--line-height: 1.75rem;
  --text-headline-sm: 1.125rem;                 --text-headline-sm--line-height: 1.5rem;
  --text-price-hero: 1.5rem;                    --text-price-hero--line-height: 1.75rem;
  --text-price-card: 1.125rem;                  --text-price-card--line-height: 1.375rem;
  --text-body-lg: 1rem;                         --text-body-lg--line-height: 1.5rem;
  --text-body-md: 0.875rem;                     --text-body-md--line-height: 1.25rem;
  --text-body-sm: 0.75rem;                      --text-body-sm--line-height: 1rem;
  --text-label-lg: 0.875rem;                    --text-label-lg--line-height: 1.125rem;
  --text-label-md: 0.75rem;                     --text-label-md--line-height: 1rem;
  --text-label-badge: 0.6875rem;                --text-label-badge--line-height: 0.875rem;
```

**Consumption.** Two primitives only: `components/ui/button.tsx` → `font-label text-label-lg`; `components/ui/badge.tsx` → `font-label text-label-badge`. The other 10 steps are registered and unconsumed; wiring them is the 236-usage migration that D1 explicitly excludes.

## D6 — Elevation Site Mapping

Values fixed by `docs/designs/DESIGN.md` §"Ambient Shadow Hierarchy": Level 0 `none`; Level 1 `0px 2px 8px -2px rgba(15, 23, 42, 0.06)`; Level 2 `0px 8px 24px -4px rgba(15, 23, 42, 0.12)`; Level 3 `0px 16px 36px -6px rgba(15, 23, 42, 0.18)`. Registered as `--shadow-level-{0..3}`, generating `shadow-level-{n}`.

| Level | Sites |
|---|---|
| 0 | `components/ui/card.tsx:14` — the flat base card; delineation stays the `ring-1 ring-foreground/10` stroke |
| 1 | `components/ProductCard.tsx:70`; `app/page.tsx:277` (category square); `app/cart/page.tsx:145`; `app/orders/page.tsx:446`; `app/orders/[id]/page.tsx:251` (replaces `shadow-sm`), `:568`; `app/products/[id]/page.tsx:119`; `app/products/page.tsx:373`; `components/admin/StaffKpiRow.tsx:73` (replaces `shadow-sm`) |
| 1 (chip) | `components/admin/StatusFilterChips.tsx:83,86` — active chip branches (replace `shadow-sm`) |
| 2 | `components/admin/DiscrepancyPanel.tsx:267` — modal (replaces `shadow-2xl`) |
| 3 | Registered, no consumer (see decision 7) |

## D7 — Work-Unit Order and Budget

Order preserved: **W1 → W3 → W2 → W4 → W6 → W7 → W8 → W5**. W1 and W3 land first and green both gates; no assertion ships without its subject, so W2 never delivers the guard alone. W5 moves last so the design-system baseline is stable before the 2FA handler consumes `api.ts`.

| Unit | Content | Authored lines | PR posture |
|---|---|---|---|
| W1 | Vitest + jsdom + RTL, config, `test` script, WCAG suite, `--text-muted` fix | ~110 | `size:exception` for the lockfile only |
| W3 | `@override_settings(STORAGES=…)` on `AdminAccessControlTests` | 3 | Own PR — greening the backend gate is independently reviewable |
| W2 | 6 registrations + registration guard | ~86 | Within budget |
| W4 | `--control-border` + 15 re-points | ~17 | Within budget |
| W6 | 12 scale steps + 2 primitives | ~34 | Within budget |
| W7 | 4 shadow tokens + 12 sites | ~16 | Within budget |
| W8 | 11 footer rings, 3 radius swaps, dead conditional | ~18 | Within budget |
| W5 | Backend exemption, global handler, dialog, tests, docs | ~250 | **Split candidate** (see below) |

**W1 lockfile threat: `size:exception`, concretely.** `frontend/package-lock.json` is lockfileVersion 3 with 684 package entries across 9,958 lines. Adding `vitest` + `jsdom` + RTL + the two Vite plugins adds an estimated 90–140 transitive entries at roughly 14 lines each — **1,300–2,000 added lines**. That is an unavoidable 3–5× breach. It cannot be split (an intermediate lockfile is unbuildable, and the six devDeps are one `npm install` transaction), and the six devDeps have no production consumer, so the exception is zero-risk. The exception is scoped: the lockfile diff is declared `size:exception` with an `npm run build && npm run lint && npm run test` verification step, and the authored W1 code (`vitest.config.ts`, `vitest.setup.ts`, `tests/**`, the `--text-muted` edit) stays at ~110 lines and fully reviewable. **The budget is not exceeded silently** — it is declared at the PR.

**W5 split.** W5 is the only other unit near the ceiling. If the apply-phase forecast exceeds 400, split it as: **W5a** backend exemption + `TwoFAGateTests` additions; **W5b** `api.ts` handler + `TotpChallengeDialog` + `AuthProvider` wiring + login-page deletion; **W5c** RTL tests + `docs/DEPLOYMENT.md`. Each is independently revertible.

## Data Flow

```
2FA challenge (one path, every surface):

 any api.ts call ──▶ performFetch ──▶ 401 { code: 'totp_required' }
                                            │
                                     fetchAPI catch (existing interception point, L244)
                                            │
                        ┌───────────────────┴───────────────────┐
              no handler registered                   handler registered
              (today's behavior: rethrow)          (AuthProvider useEffect)
                        │                                       │
              caller renders                    TotpChallengeDialog opens
              its own challenge                  on <current surface>
                                                        │ user submits 6 digits
                                                 setTOTPCode(code)
                                                        │ retry() ──▶ performFetch (X-TOTP attached)
                                            ┌───────────┴───────────┐
                                          200                    401
                                            │                       │
                              resolves the ORIGINAL       clearTOTPCode(), error
                              caller's await               rendered, stays open

Sign-out (gated user, any surface):

 Navbar logout ──▶ apiLogout() ──▶ POST /api/users/logout/  ──▶ _validate_expiry_and_2fa
                                          │                    TTL check (still applies)
                                          │                    path in TOTP_EXEMPT_PATHS ──▶ skip gate
                                          └──▶ 200, token deleted, Set-Cookie clears
                                               └──▶ clearTOTPCode() (now immediate)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/app/globals.css` | Modify | 6 registrations, `--color-control-border`, 24 typography declarations, 4 shadow tokens, `--text-muted: #5c5d72` |
| `frontend/vitest.config.ts` | Create | jsdom + react + tsconfig-paths |
| `frontend/vitest.setup.ts` | Create | RTL `cleanup` |
| `frontend/tests/support/css-tokens.ts` | Create | `:root` / `@theme inline` parser + `checkTokenRegistration` |
| `frontend/tests/support/contrast.ts` | Create | SC 1.4.3 luminance, ratio, strict `parseHex` |
| `frontend/tests/theme-registration.test.ts` | Create | Both directions + the two mutation fixtures |
| `frontend/tests/contrast.test.ts` | Create | Ramp-wide text + control-border assertions, non-rounding cases |
| `frontend/tests/totp-challenge.test.tsx` | Create | RTL coverage of the global dialog and the retry contract |
| `frontend/package.json` | Modify | 6 devDeps, `"test": "vitest run"` |
| `frontend/package-lock.json` | Modify | Generated (`size:exception`) |
| `backend/mitienda/tests.py` | Modify | Class-level `@override_settings(STORAGES=…)` on `AdminAccessControlTests` |
| `backend/users/authentication.py` | Modify | `TOTP_EXEMPT_PATHS` + the narrowed 2FA condition |
| `backend/users/tests.py` | Modify | 3 new `TwoFAGateTests` cases (resolve, logout, still-gated) |
| `frontend/lib/api.ts` | Modify | `onTOTPRequired`; `fetchAPI` returns the handler's promise; `logout()` drops the code before the request |
| `frontend/components/TotpChallengeDialog.tsx` | Create | Extracted challenge UI |
| `frontend/lib/auth-context.tsx` | Modify | Registers the handler, renders the dialog |
| `frontend/app/login/page.tsx` | Modify | Delete `TOTPChallengeStep`, `needsTOTP`, `handleTOTPVerified` |
| `frontend/components/ui/button.tsx` | Modify | `border-control-border` on the outline variant; `font-label text-label-lg` |
| `frontend/components/ui/badge.tsx` | Modify | `font-label text-label-badge` |
| `frontend/components/ui/card.tsx` | Modify | `shadow-level-0` |
| `frontend/components/ProductCard.tsx`, `app/page.tsx`, `app/cart/page.tsx`, `app/orders/page.tsx`, `app/orders/[id]/page.tsx`, `app/products/page.tsx`, `app/products/[id]/page.tsx`, `components/admin/StaffKpiRow.tsx`, `components/admin/StatusFilterChips.tsx`, `components/admin/DiscrepancyPanel.tsx` | Modify | `shadow-level-1` / `shadow-level-2`; the dead conditional at `app/orders/[id]/page.tsx:349-354` collapses to a single literal |
| `frontend/app/layout.tsx` | Modify | 11 `focus-visible` rings on footer anchors |
| `frontend/components/Navbar.tsx` | Modify | L185, L219, L238 → `rounded-xl` |
| `app/checkout/page.tsx`, `app/login/page.tsx`, `app/products/page.tsx`, `app/profile/page.tsx`, `app/register/page.tsx`, `app/page.tsx`, `components/admin/StaffUserForm.tsx`, `components/admin/TOTPConfirmForm.tsx` | Modify | 15 control-border re-points |
| `docs/DEPLOYMENT.md` | Modify | 2FA enforcement and the logout exemption |
| `openspec/config.yaml` | Modify | `frontend.test_command` / `framework` become real once W1 lands |

## Interfaces / Contracts

```ts
// frontend/lib/api.ts — mirrors the existing onTokenChange contract
export type TOTPRequiredHandler = (
  retry: () => Promise<unknown>,
) => Promise<unknown>;
export function onTOTPRequired(handler: TOTPRequiredHandler): () => void;
```

```ts
// frontend/lib/api.ts — fetchAPI catch, replacing the bare rethrow at L244
if (isTOTPCodeRequired(error)) {
  if (!totpRequiredHandler) throw error;              // login route, no handler yet
  return totpRequiredHandler(() => performFetch<T>(endpoint, options));
}
```

The original caller's `await` therefore receives the retried result, so `app/login/page.tsx`'s existing `await getProfile()` resolves with the profile after the dialog succeeds — the login submit path needs no change beyond deleting the inline challenge.

Backend contract: `POST /api/users/logout/` is exempt from the TOTP gate; the TTL check and the `IsAuthenticated` permission are unchanged. The `X-TOTP` header on that endpoint is now ignored rather than required.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Source guard | `:root` ↔ `@theme inline` both directions; guard fails on a probe token then passes | `checkTokenRegistration` over the real file and two in-memory mutations |
| Arithmetic | Text tokens ≥ 4.5:1 on all 7 ramp surfaces; `--control-border` ≥ 3:1; superseded muted fails | SC 1.4.3 formula, unrounded comparison, strict hex parse |
| Component (RTL) | Dialog opens on a 401 `totp_required`; a valid code retries and resolves the original call; a bad code keeps it open; no prompt for an unaffected user | jsdom + RTL, `api.ts` fetch stubbed |
| Backend | Exempt path resolves to `LogoutView`; gated logout → 200 + token deleted; gated profile still 401 | `TwoFAGateTests` (existing `APIClient` + `HTTP_X_TOTP` style) |
| Backend gate | `manage.py test` exits 0 with no `collectstatic` | Class-level `@override_settings` |
| Build | `npm run build`, `npm run lint`, `npm run test` exit 0 | **Not** browser verification |

**Explicit verification limit.** jsdom does not apply Tailwind's compiled output and `@theme` is build-time only. Radius swaps and elevation utilities are therefore verified by build success plus manual inspection, not by computed style. The verify report must state this.

## Threat Matrix

N/A — no shell, subprocess, VCS/PR automation, or executable-file classification. Web URL dispatch (Next.js App Router, DRF `URLconf`) is framework request routing, not the automation routing this matrix targets. The only authentication-relevant boundary is the 2FA exemption, which *narrows* a gate and is covered by the three tests in D1.

## Migration / Rollout

No migration, no model changes, no feature flags. Revert per unit. Two behaviour reversions to note: reverting W5 restores today's gated-logout state (a user locked out of logout can sign out by letting the token expire); reverting W1 restores a red frontend gate with no runner.

## Spec Placement Notes (for the maintainer, not resolved here)

1. **Backend Test Gate capability.** The requirement in `specs/visual-design-system/spec.md` governs `backend/mitienda/tests.py`. It sits in a frontend capability only because no backend capability was declared. A `test-gates` capability would be the honest home, but declaring it means re-homing the requirement and re-running spec validation, which is out of scope for this phase. **Flagged, not restructured.**
2. **Archive ordering, `visual-design-system`.** `openspec/specs/visual-design-system/spec.md` does not exist — this change authors it in full. `frontend-vibrant-redesign` is deliberately unarchived and also carries a `visual-design-system` delta. If `frontend-design-system-followups` archives first, the full spec becomes the main spec and the parent's delta is then orphaned; if the parent archives first, it will overwrite with its own (failed-verify) version. **The maintainer must choose the archive order; this change does not assume one.**
3. **Archive ordering, `two-factor-auth`.** `openspec/specs/two-factor-auth/spec.md` exists (from archived `security-hardening`) with two requirements: `TOTP Enrollment` and `TOTP Verification on API Requests`. The parent's unarchived delta adds `Web Enrollment UI`, `2FA API Client`, and `Login TOTP Challenge` — none of which are in the main spec. If this change archives first, its `MODIFIED` requirement rewrites `TOTP Verification on API Requests` in place while `Login TOTP Challenge` remains absent, so the archived tree would claim the login challenge is unspecified even though the code implements it. **Flagged; the parent's delta must be carried forward in the same archive step or after it.**

## Open Questions

- [ ] **Maintainer decision required (not blocking apply):** archive order between `frontend-design-system-followups` and `frontend-vibrant-redesign`, and whether a `test-gates` capability is declared. Neither blocks W1–W8; both must be settled before `sdd-archive`.
