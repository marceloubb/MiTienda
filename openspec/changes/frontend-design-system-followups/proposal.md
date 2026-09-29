# Proposal: Frontend Design System Follow-ups

## Intent

The nine findings deferred by the failed `frontend-vibrant-redesign` verification close here; that change stays unarchived. Values follow `research.md`, which corrects four `exploration.md` claims.

## Scope

| # | Finding | Deliverable |
|---|---|---|
| 1 | Typography MUSTs unimplemented | `--text-*` scale tokens (base + `--line-height`); primitives only |
| 2 | Elevation unimplemented | `--shadow-*` Levels 0–3, 12 sites |
| 3 | `--text-muted` fails AA | `#5c5d72` (4.587:1 worst); `#757684` fails today at 4.259 |
| 4 | Backend gate red | `@override_settings(STORAGES=…)` on `AdminAccessControlTests` |
| 5 | 6 unregistered `@theme` tokens | Register 6 + two-directional guard |
| 6 | `rounded-lg` on Navbar controls | 3 swaps to `rounded-xl`: L185, L219, L238 |
| 7 | 2FA enrollment lockout | Global `totp_required` handler + logout exemption |
| 8 | `--outline-variant` fails 1.4.11 | Control-border token re-pointing at `--outline` (3.198:1) |
| 9 | 23/44 scenarios unproven | Vitest (jsdom + RTL): guard, WCAG, 2FA tests |

Also 11 footer `:focus-visible` rings; one dead conditional deleted.

### Out of Scope

- Modifying or archiving `frontend-vibrant-redesign`.
- The 236 existing `text-*` usages; global `--outline-variant` darkening; Playwright; CI; `qrcode.react` pin; `--color-offer`; radius-ramp correction.

## Capabilities

### New Capabilities

- `visual-design-system`: tokens, typography, elevation, contrast, focus visibility. Authored in full — the parent is unarchived, so no main spec exists.

### Modified Capabilities

- `two-factor-auth`: `totp_required` must resolve from any authenticated surface; logout is exempt.

## Approach

| W | Unit | ~Lines | Risk |
|---|---|---|---|
| W1 | Vitest + WCAG suite + muted fix | 110 + lockfile | Low |
| W2 | 6 registrations + guard | 86 | Low |
| W3 | `override_settings` | 3 | Low |
| W4 | Control-border token + repoints | 25 | Med |
| W5 | 2FA continuity + tests + docs | 200–280 | High |
| W6 | Typography + primitives | 50 | Med |
| W7 | Elevation tokens + sites | 30 | Med |
| W8 | Focus rings, radius, dead code | 18 | Low |

W1 and W3 land first and green the gates. No assertion ships without its subject, so W2 never delivers the guard alone. W5 is largest and first split candidate; W1's lockfile is the only 400-line threat.

## Affected Areas

| Area | Impact |
|---|---|
| `frontend/app/globals.css` | 24 token lines |
| `frontend/tests/`, `vitest.config.ts`, `package.json` | Tests, 6 devDeps, `test` script |
| `frontend/components/ui/`, `app/layout.tsx`, `app/orders/`, `Navbar.tsx` | Font, elevation, rings, radius |
| `backend/mitienda/tests.py`, `users/authentication.py`, `frontend/lib/api.ts`, `docs/DEPLOYMENT.md` | Storage override, logout exemption, handler, docs |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Lockfile churn exceeds 400 lines | High | Generated: `size:exception` or split W1 |
| Repoint shifts 15 borders | Low | Only where the border is the sole affordance; ~25 dividers keep `--outline-variant` |
| `override_settings` vs. `tearDown` reload | Low | Verify in W3 |
| Nothing is browser-verified | High | jsdom cannot read compiled Tailwind output; say so plainly |

## Rollback Plan

Token, class, or test-scope edits only; no schema, API, or migration change. Revert any unit alone: W3 restores today's red gate, W5 today's recoverable 2FA behavior.

## Dependencies

- 6 dev-only packages (Vitest, RTL, jsdom, `vite-tsconfig-paths`).
- W1 blocks W2 and W5's tests. No CI; `npm test` runs when invoked.

## Success Criteria

- [ ] `manage.py test` and `npm run build|lint|test` all exit 0.
- [ ] The guard fails on a deliberately unregistered token, then passes.
- [ ] Text tokens ≥ 4.5:1 and the control border ≥ 3:1 on `#d2d9f4`, asserted in-suite.
- [ ] Inter renders on buttons and badges; the scale exists as tokens.
- [ ] A mid-session `totp_required` resolves outside `/login`.
