# Apply Progress: Frontend Design System Follow-ups

**Artifact store**: hybrid (this file + Engram `sdd/frontend-design-system-followups/apply-progress`)
**Mode**: Standard (`strict_tdd: false` in `openspec/config.yaml`; no test runner existed before this unit)
**Branch**: `feat/vibrant-redesign-slice5-2fa`
**Chain strategy**: `stacked-to-main`

## Status: W1, W3, W2, W4, W6 and W7 complete (W6 including the cascade correction); W8 next, W5-W5c pending

| Unit | PR | State | Commit |
|---|---|---|---|
| W1 | PR 1 | **done** | `9ef73b9` |
| W3 | PR 2 | **done** | `877b6c1` |
| — | off-plan | **done** | `0fa0ae1` |
| W2 | PR 3 | **done** | `beb7d1f` |
| W4 | PR 4 | **done** | `fe4c902` |
| W6 | PR 5 | **implemented and verified — uncommitted, awaiting the orchestrator's commit and `settle`** | — |
| W7 | PR 6 | **implemented and verified — uncommitted, awaiting the orchestrator's commit and `settle`** | — |
| W8 | PR 7 | pending — **next objective to open** | — |
| W5a/W5b/W5c | PR 8–10 | pending | — |

W1 and W3 both landed. W3 (task 1.9, the Django `STORAGES` override) was
implemented **outside** the attempt cycle: it was committed without a
`begin` / `settle` pair, so the runtime ledger never saw it. The objective
blocked on `maintainer_decision` was **W1's**, and it was reset with
`--objective-relation independent` because W1 *passed* — it only exceeded its
2200-line budget, and 3,750 of the 4,012 changed lines were the already
approved lockfile `size:exception`. The budget was mis-dimensioned, not the
work.

Consequence: the tree at reset time (`55a5f68`) already contained W3's fix,
so re-opening a W3 objective would have started with the fix present and
measured ~0 changed lines — an objective that cannot fail is worse than none.
W3 is recorded here as landed, and W2 was therefore the next objective to open:
the first unit in design order whose code was absent from the tree. **W2 has now
been implemented and verified; the orchestrator owns its commit and settle.**

`0fa0ae1` is **off-plan work**. It is not in `tasks.md`, has no task number, no
spec requirement, and no forecast row. It removed the four
`@next/next/no-img-element` warnings that W1's evidence below records as open,
and fixed an LCP regression the migration itself introduced. It is logged here
so the record is complete rather than flattering.

## Completed Tasks

- [x] 1.1 Six devDeps + `"test": "vitest run"` in `frontend/package.json`
- [x] 1.2 `npm install` regenerated `frontend/package-lock.json` (`size:exception`)
- [x] 1.3 `frontend/vitest.config.ts` — jsdom, `@vitejs/plugin-react`, `vite-tsconfig-paths`, no coverage provider
- [x] 1.4 `frontend/vitest.setup.ts` — RTL `cleanup` in `afterEach`
- [x] 1.5 `frontend/tests/support/contrast.ts` — SC 1.4.3 luminance + ratio, strict `parseHex`
- [x] 1.6 `frontend/tests/contrast.test.ts` — ramp-wide text and control-border floors
- [x] 1.7 `frontend/app/globals.css:15` — `--text-muted: #757684` → `#5c5d72`
- [x] 1.8 `openspec/config.yaml:17-18` — real `test_command` and `framework`
- [x] 2.1 `frontend/tests/support/css-tokens.ts` — `:root` / `@theme inline` parser and `checkTokenRegistration`
- [x] 2.2 `frontend/tests/theme-registration.test.ts` — two-directional guard
- [x] 2.3 Single-entry `--radius` allowlist with reason, plus the assertions that it cannot mask an omission
- [x] 2.4 `frontend/app/globals.css` — the 6 registrations (`+6/−0`)
- [x] 2.5 The in-memory mutation fixtures that prove the guard fails (three, not two)
- [x] 3.1 `frontend/app/globals.css:69` `--control-border: var(--outline)` and `:126` `--color-control-border: var(--control-border)`
- [x] 3.2 The 15 Bucket A boundaries re-pointed, per file: checkout 2, login 1, home 1, products 4, profile 3, register 1, `StaffUserForm` 1, `TOTPConfirmForm` 1, `ui/button` 1
- [x] 3.3 No Bucket B site touched, proven by absence from the diff and by a RED-proven tree-wide guard
- [x] 4.1 `frontend/app/globals.css` `@theme inline` — the 12 scale steps as 24 declarations, `+24/−0` plus a 7-line block comment
- [x] 4.2 `frontend/components/ui/button.tsx:6` and `frontend/components/ui/badge.tsx:7` — `font-label` plus the matching scale step, one line each
- [x] 5.1 `frontend/app/globals.css` `@theme inline` — the 4 elevation levels, `+4/−0` plus a 4-line block comment
- [x] 5.2 The 18 elevation sites across 12 files — 14 stock shadows converted, 4 levels added to surfaces that had none

## Files Changed

| File | Action | Change |
|------|--------|--------|
| `frontend/package.json` | Modified | `"test": "vitest run"`, 6 devDeps |
| `frontend/package-lock.json` | Modified | Generated; **+2820/−930** (`size:exception`) |
| `frontend/vitest.config.ts` | Created | 13 lines |
| `frontend/vitest.setup.ts` | Created | 8 lines |
| `frontend/tests/support/contrast.ts` | Created | 42 lines |
| `frontend/tests/contrast.test.ts` | Created | 182 lines |
| `frontend/app/globals.css` | Modified | Line 15 only (+1/−1) |
| `openspec/config.yaml` | Modified | Lines 17–18 only (+2/−2) |

Authored lines excluding the lockfile: **262**. The review budget is 400, so W1 fits the budget on its own; the lockfile is the declared `size:exception`.

## W2 Files Changed (PR 3 — tasks 2.1–2.5)

| File | Action | Change |
|------|--------|--------|
| `frontend/tests/support/css-tokens.ts` | Created | 144 lines — scoped `:root` / `@theme inline` parser, `checkTokenRegistration`, `registrationTargets`, `readRootToken`, `FONT_VARIABLES`, `REGISTRATION_ALLOWLIST` |
| `frontend/tests/theme-registration.test.ts` | Created | 155 lines — 18 tests across forward, reverse, allowlist and sensitivity |
| `frontend/app/globals.css` | Modified | 6 registrations only, `+6/−0` |
| `frontend/tests/contrast.test.ts` | Modified | `+18/−16` — the inline whole-file `readRootToken` regex is replaced by the shared scoped parser (W1 deviation 5) |

**Authored changed lines for W2: 339** (144 + 155 + 6 + 34). Under the 400
budget, but 3.9× the ~86 forecast. See Deviation 11.

## Verification Results

All three commands were run from `frontend/` and observed directly.

| Command | Exit | Observed |
|---|---|---|
| `npm run build` | 0 | Compiled successfully in 1456ms; TypeScript finished in 4.1s; 17 routes generated |
| `npm run lint` | 0 | **0 errors, 4 warnings** — exactly the 4 known pre-existing `@next/next/no-img-element` warnings (`app/cart/page.tsx:157`, `app/checkout/page.tsx:594`, `app/products/[id]/page.tsx:226`, `components/ProductCard.tsx:82`). No new warning from any W1 file. |
| `npm run test` | 0 | **1 test file passed, 21 tests passed** |

The four warnings recorded above were **real when W1 was verified** and are
**no longer open**: `0fa0ae1` removed all four. The W1 row is left unedited
because it is a historical record of that unit's state, not a live claim.

## W2 Verification Results (PR 3)

All commands run from `frontend/` and observed directly on the shipped state.

| Command | Exit | Observed |
|---|---|---|
| `npm run test theme-registration` | 0 | **1 test file passed, 18 tests passed** in 1.08s |
| `npm run test` | 0 | **2 test files passed, 39 tests passed** in 1.44s (W1's 21 + W2's 18; no regression) |
| `npm run lint` | 0 | **0 errors, 0 warnings.** ESLint printed nothing at all. No `@next/next/no-img-element` reintroduced. |
| `npm run build` | 0 | Compiled successfully in 1021ms; TypeScript finished in 2.0s; 16 routes. The only warning is the pre-existing `turbopack.root` one, unrelated to this unit. |

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm run test` → exit 0, 21/21 passed in 1.48s |
| Runtime harness command/scenario and exact result | **Not performed.** The forecast's harness is `npm run dev` with a visual legibility check on `/products` and `/cart`, which needs a browser this environment does not provide. The token swap is a pure `:root` value change with no markup change, and its automated gate is the contrast arithmetic. **Open item for `sdd-verify`.** |
| Rollback boundary | Revert `frontend/tests/contrast.test.ts`, `frontend/tests/support/contrast.ts`, `frontend/vitest.config.ts`, `frontend/vitest.setup.ts`, `frontend/package.json`, `frontend/package-lock.json`, the single line `frontend/app/globals.css:15`, and `openspec/config.yaml:17-18`. No other unit touches any of these files, so the revert removes nothing unrelated. It restores a red frontend gate with no runner. |

## W3 Evidence (task 1.9 — landed outside the attempt cycle)

Root cause: `STORAGES['staticfiles']` is `CompressedManifestStaticFilesStorage`
(`backend/mitienda/settings.py:184`) and is deliberately **not** gated on
`DEBUG`, so the four tests rendering the admin login template through
`{% static %}` needed a `staticfiles.json` only `collectstatic` produces and
raised `ValueError: Missing staticfiles manifest entry for
'admin/css/base.css'`. The container never hit this because its CMD runs
`collectstatic` first — a harness defect, not a product defect. In Django 6.1
`setup_test_environment` *inherits* `settings.DEBUG` rather than forcing it
`False`, and `settings.py:42` defaults it to `False`, so a DEBUG gate would
have changed nothing.

| Evidence | Value |
|---|---|
| Focused test command and exact result | `.venv\Scripts\python.exe manage.py test mitienda` → exit 0, 18 tests, OK |
| Full-suite confirmation | 185 tests, `OK (skipped=1)`, run after deleting `backend/staticfiles/` to prove there is no `collectstatic` prerequisite |
| Runtime harness command/scenario and exact result | **N/A** — per `tasks.md:87`, the suite is the harness for this unit. The boundary being repaired *is* the gate. |
| Rollback boundary | Revert `backend/mitienda/tests.py:120` (decorator + docstring), +12/−1. Nothing else depends on it. |
| Production impact | None. `settings.py` is byte-identical to `main`; STORAGES selection stays `DEBUG`-independent by design. |

## Off-plan Evidence (`0fa0ae1` — not in `tasks.md`)

Migrated four `<img>` to `<Image fill sizes>` and added a single-host
`images.remotePatterns`. `search` is **deliberately omitted**: Next 16 compares
it with strict string equality (`match-remote-pattern.js:46-50`) and every
Unsplash URL carries a query string, so the documented `search: ""` example
would have 400'd the entire catalog. The pattern is one hostname, not a
wildcard, to avoid an open image proxy in front of a public deployment.

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm run lint` → exit 0, **0 errors, 0 warnings**; `npm run build` → exit 0, 16 routes, TypeScript clean; `npm test` → 21/21 |
| Runtime harness command/scenario and exact result | Not performed — no browser available. Same jsdom limit recorded below. |
| Rollback boundary | Revert all five files **together** (`next.config.ts`, `ProductCard.tsx`, `app/cart/page.tsx`, `app/checkout/page.tsx`, `app/products/[id]/page.tsx`). `next.config.ts` is load-bearing for the four components; a partial revert leaves images either 400ing or orphaned. |
| Defect found and fixed during review | The migration made the product-detail hero **lazy** (`<img>` defaults to eager, `<Image>` to lazy) — self-defeating for a warning whose text is "could result in slower LCP". Fixed with `preload`; `priority` is deprecated in Next 16. Not set on `ProductCard`: a grid has several viewport-dependent LCP candidates, where lazy is correct. |

## Guard Sensitivity — Proven, Not Asserted

The suite reads its token values out of `app/globals.css` at test time rather than hardcoding the design's table, so the assertions are wired to shipped source.

**RED proof, observed:** `frontend/app/globals.css:15` was temporarily reverted to `--text-muted: #757684` and the suite re-run. Result: **4 failed | 17 passed (21)** — `--text-muted reaches 4.5:1 on every ramp surface`, `--text-muted is worst on the binding surface`, `--text-muted is the value the spec names`, and `the superseded muted value fails the binding surface`. The file was restored and the suite returned to 21/21.

## W2 Evidence (PR 3 — tasks 2.1–2.5)

Six `:root` tokens shipped with no `@theme inline` registration, so they
generated no Tailwind utility at all. The omission was invisible: the
stylesheet is valid CSS, the build is green, and the tokens are dead. W2
registers them and installs a two-directional guard that fails loudly next time.

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm run test theme-registration` → exit 0, **18/18 passed** in 1.08s |
| Full-suite confirmation | `npm run test` → exit 0, **2 files / 39 tests passed** (W1's 21 + W2's 18) |
| Lint / build | `npm run lint` → exit 0, 0 errors 0 warnings. `npm run build` → exit 0, 16 routes, TypeScript clean. |
| Runtime harness command/scenario and exact result | **Not performed.** The forecast's harness is `npm run dev` with "no visual delta expected", and the expected delta is genuinely none: the six new registrations emit utilities (`bg-tertiary`, `text-on-tertiary`, `bg-surface-dim`, …) that no component references, and the registered `--radius-*` ramp is byte-identical (asserted, not eyeballed). No browser is available here. **Open item for `sdd-verify`.** |
| Rollback boundary | Revert the 6 registration lines in `frontend/app/globals.css`, and delete `frontend/tests/theme-registration.test.ts` and `frontend/tests/support/css-tokens.ts`. **One correction to `tasks.md:88`:** `frontend/tests/contrast.test.ts` must be in the boundary too, because it now imports `readRootToken` from `css-tokens.ts`. Reverting `css-tokens.ts` alone leaves the contrast suite unresolvable. Reverting all four together restores W1's state exactly and removes nothing unrelated. |

> **Correction (gatekeeper, post-apply).** An earlier draft of this row ended with
> "no other unit touches any of these files". **That was false.**
> `frontend/app/globals.css` is one of the four, and `tasks.md:43` (W4),
> `tasks.md:49` (W6) and `tasks.md:51` (W7) each add declarations to that same
> file. The correct claim is narrower: **no other unit touches these files *at
> these lines*.** The revert is therefore **line-scoped** on `globals.css` — a
> whole-file checkout would silently drop W4's `--control-border`, W6's 24
> typography declarations and W7's 4 shadow tokens. The three test files are
> exclusive to this unit and may be deleted wholesale.
>
> **Citation retracted.** An earlier draft added: "The same false sentence also
> appears in W1's row at `tasks.md:86`." A search for `no other unit` across
> `tasks.md` returns **zero hits**, so that sentence is not in `tasks.md` at all —
> the cross-reference was wrong and is withdrawn rather than left standing as an
> unconfirmable claim. W1's row is unaffected by this retraction.

### Guard Sensitivity — RED-proven on the real stylesheet, not asserted

Both runs edited `frontend/app/globals.css` on disk, were observed, and the
file was then restored to the exact pre-run SHA-256
(`4F32FF42DBDEF44F49D895723441321337E39EEA256396CC197289AC9E868BEF`).

**RED 1 — a registration is removed.** Deleting
`--color-on-tertiary-container: var(--on-tertiary-container);` from
`@theme inline`:

```
 ❯ tests/theme-registration.test.ts (18 tests | 4 failed) 21ms
     × the stylesheet that ships has no unregistered token 10ms
     × --on-tertiary-container is registered in @theme inline 1ms
     × a :root token with no registration is reported by name 1ms
     × registering that same token makes the guard pass again 1ms

 FAIL  tests/theme-registration.test.ts > forward: every :root token is registered or allowlisted > the stylesheet that ships has no unregistered token
AssertionError: unregistered :root tokens in app/globals.css: --on-tertiary-container: expected [ '--on-tertiary-container' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "--on-tertiary-container",
+ ]

 Test Files  1 failed (1)
      Tests  4 failed | 14 passed (18)
```

The failure message **names the token**, which is what the spec scenario
requires. The reverse direction stayed green, correctly: removing a
registration orphans a `:root` token, it does not dangle a reference.

**RED 2 — a `:root` token is declared with no registration.** Adding
`--probe-unregistered: #000000;` to `:root`:

```
 ❯ tests/theme-registration.test.ts (18 tests | 1 failed) 16ms
     × the stylesheet that ships has no unregistered token 7ms

 FAIL  tests/theme-registration.test.ts > forward: every :root token is registered or allowlisted > the stylesheet that ships has no unregistered token
AssertionError: unregistered :root tokens in app/globals.css: --probe-unregistered: expected [ '--probe-unregistered' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "--probe-unregistered",
+ ]

 Test Files  1 failed (1)
      Tests  1 failed | 17 passed (18)
```

**Scenario, second half, on disk.** Adding
`--color-probe-unregistered: var(--probe-unregistered);` to `@theme inline`
turned the forward guard **green** — `the stylesheet that ships has no
unregistered token` was no longer among the failures. That is the spec's "the
guard passes again once the registration is added", proven against the file
that ships rather than only in memory.

**Restored and green.** `npm run test theme-registration` → **18 passed (18)**
after the SHA-256 restore, with no `probe` token left in the file.

**Reverse direction, also proven red.** Task 2.5 names two in-memory
fixtures; W2 adds a third because the `dangling` array would otherwise never
have been observed non-empty, which is the same "never seen failing" hole:

```ts
const withDangling = GLOBALS_CSS.replace(
  '@theme inline {',
  '@theme inline {\n  --color-probe-dangling: var(--probe-missing);',
);
// → checkTokenRegistration(withDangling).dangling deep-equals ['--probe-missing']
```

### Inherited from W1

Contrast figures recomputed locally with the SC 1.4.3 formula and confirmed identical to `design.md` §D3:

| Token | Value | Worst ratio | On | Threshold |
|---|---|---|---|---|
| `--text-primary` | `#131b2e` | 12.233 | `#d2d9f4` | 4.5 |
| `--text-secondary` | `#444653` | 6.664 | `#d2d9f4` | 4.5 |
| `--text-muted` | `#5c5d72` | 4.587 | `#d2d9f4` | 4.5 |
| `--outline` | `#757684` | 3.198 | `#d2d9f4` | 3.0 |
| `--outline-variant` | `#c4c5d5` | 1.218 | `#d2d9f4` | decorative, no floor |

## W4 Files Changed (PR 4 — tasks 3.1–3.3)

| File | Action | Change |
|------|--------|--------|
| `frontend/app/globals.css` | Modified | `+4/−0` — `--control-border` at L69 (with a 2-line SC 1.4.11 comment) and `--color-control-border` at L126 |
| `frontend/app/checkout/page.tsx` | Modified | 2 Bucket A re-points (L60, L398) |
| `frontend/app/products/page.tsx` | Modified | 4 Bucket A re-points (L215, L239, L259, L277) |
| `frontend/app/profile/page.tsx` | Modified | 3 Bucket A re-points (L24, L235, L249) |
| `frontend/app/login/page.tsx` | Modified | 1 Bucket A re-point (L21) |
| `frontend/app/register/page.tsx` | Modified | 1 Bucket A re-point (L13) |
| `frontend/app/page.tsx` | Modified | 1 Bucket A re-point (L180) |
| `frontend/components/admin/StaffUserForm.tsx` | Modified | 1 Bucket A re-point (L36) |
| `frontend/components/admin/TOTPConfirmForm.tsx` | Modified | 1 Bucket A re-point (L10) |
| `frontend/components/ui/button.tsx` | Modified | 1 Bucket A re-point (L12, outline variant `border-border`) |
| `frontend/tests/control-border.test.ts` | **Created** | 159 lines, 26 tests — the task 3.3 guard |
| `frontend/tests/contrast.test.ts` | Modified | `+1/−1` — one comment that W4 falsified (Deviation 14) |

**Authored changed lines for W4: 195**, decomposed exactly under Deviation 15
(30 for the 15 class re-points counted `+15/−15`, 4 `globals.css`, 2
`contrast.test.ts`, 159 the new guard). Against a ~17 forecast that is **11.5×**,
well outside the 2.4×–3.9× band W1–W3 recorded, because the forecast counted only
production lines and task 3.3 is a negative constraint that only a guard can carry.
It still lands under the 200 attempt ceiling, with 5 lines of headroom.

## W4 Verification Results (PR 4)

All commands run from `frontend/` and observed directly.

| Command | Exit | Observed |
|---|---|---|
| `npm run test` | 0 | **3 test files passed, 65 tests passed** in 1.50s (W1's 21 + W2's 18 + W4's 26; no regression) |
| `npm run test control-border` | 0 | **1 test file passed, 26 tests passed** |
| `npm run lint` | 0 | **0 errors, 0 warnings.** ESLint printed no diagnostics. |
| `npm run build` | 0 | Compiled successfully in 414ms; TypeScript finished in 1834ms; **16 routes**, byte-identical route table to W2's build |

## W4 Evidence (PR 4 — tasks 3.1–3.3)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm run test` → exit 0, **65/65 passed** (baseline 39/39, +26 new, 0 regressed) |
| Lint / build | `npm run lint` → exit 0, 0 errors 0 warnings. `npm run build` → exit 0, 16 routes, TypeScript clean. |
| Runtime harness command/scenario and exact result | **Not performed.** The forecast's harness is `npm run dev` with "control borders visible on `/login`, `/checkout`, `/profile`", and **this environment has no browser**, so the claim is not made. What *is* proven mechanically: `--control-border` resolves to `#757684`, the same value the 3.198:1 worst-case assertion in `contrast.test.ts` already floors, and all 15 re-points resolve to a utility that Tailwind now emits (`--color-control-border` is registered, so the forward and reverse guards in `theme-registration.test.ts` both stay green — 18/18). jsdom cannot apply the compiled stylesheet, so no rendered border was observed. **Open item for `sdd-verify`.** |
| Rollback boundary | Revert the 15 class lines and the 4 `frontend/app/globals.css` lines, revert the one comment line in `frontend/tests/contrast.test.ts`, and delete `frontend/tests/control-border.test.ts`. **Two corrections to the `tasks.md:89` row, both now applied there:** (1) the forecast row reads `~17` against a measured **195**; (2) the boundary omits `frontend/tests/contrast.test.ts`, which W4 touched at `+1/−1`. The `globals.css` revert must be **line-scoped** (`:root` after `--outline-variant`, and `@theme inline` after `--color-outline-variant`); a whole-file checkout would also drop W6's 24 typography declarations and W7's 4 shadow tokens, which are not in the tree yet but are cited against the same file. |

### The 15 / 25 boundary, measured rather than asserted

The unit's real failure mode is not line count: a blanket repoint would build
green, lint green and read as deliberate. So the counts were measured, and one of
them caught a real defect mid-implementation.

**Blast radius, measured — not the 29 `--outline-variant` sites an earlier draft
claimed.** Across `.tsx` in `app/`, `components/` and `lib/` at HEAD there are
**65** class occurrences that a naive `outline-variant → control-border` rename
would reach: **27** `border-outline-variant`, **2** `border-border`
(`components/ui/badge.tsx:17` and `components/ui/button.tsx:12`, both reaching the
same `#c4c5d5` through `--border`), and **36** `ring-outline-variant`. No line
carries both a `border-outline-variant` and a `ring-outline-variant`, so the three
populations are disjoint. The headline "29" counted only the first two and
understated the ring population by 36.

**Bucket A: exactly 15, confirmed by per-file class-token counts.**

| File | `border-control-border` | Sites |
|---|---|---|
| `app/products/page.tsx` | 4 | L215 search input, L239 sort `<select>`, L259 + L277 inactive filter toggles |
| `app/profile/page.tsx` | 3 | L24 `inputClass`, L235 city, L249 postal code |
| `app/checkout/page.tsx` | 2 | L60 text input, L398 unselected shipping-option card |
| `app/login/page.tsx` | 1 | L21 `inputClass` (username, password, TOTP) |
| `app/register/page.tsx` | 1 | L13 `inputClass` |
| `app/page.tsx` | 1 | L180 category tile, unfilled branch |
| `components/admin/StaffUserForm.tsx` | 1 | L36 input/select |
| `components/admin/TOTPConfirmForm.tsx` | 1 | L10 code input |
| `components/ui/button.tsx` | 1 | L12 outline variant |
| **Total** | **15** | |

**The count caught a miss.** Of the 15 Bucket A sites, **14** were
`border-outline-variant` and **one** — `components/ui/button.tsx:12` — was
`border-border`. A `replaceAll` on the literal `border border-outline-variant`
matched only **13** of those 14: `app/checkout/page.tsx:398` is a bare ternary arm
(`: "border-outline-variant hover:bg-surface-container-low"`) with no preceding
`border` token, so the pair did not match it. The per-file count read `checkout: 1`
where `2` was expected, and the site was fixed.

**The invisible scenario is a presence-only grep, not the `replaceAll`.** A grep for
`border-outline-variant` across the diff would have reported **13 removals** —
exactly what the `replaceAll` produced, so it would have looked consistent. It would
still have passed, because nothing in a presence-only grep reconciles 13 against
task 3.2's 15-site per-file breakdown. **13 is itself the signal**; the check that
was missing is the one comparing the number to the forecast. That is the argument
for the guard, and it is why the guard counts per file rather than tree-wide.

**Bucket B: nothing touched, proven three ways.** *(Corrected enumeration. An
earlier draft of proof 1 named 18 Bucket B files, claimed 16 absent, and listed
`app/checkout/page.tsx` as one of the two that appeared. `checkout` holds **zero**
Bucket B boundaries — no `tasks.md:45` citation resolves to it — so it was never a
candidate. Proofs 2 and 3 are the operative proof and neither depended on this
enumeration.)*

1. **By absence from the diff.** `git diff --name-only` lists 11 modified files.
   Building the Bucket B file set from the **22** files that `tasks.md:45` actually
   cites, **19 do not appear in the diff at all**:

   `app/bodega/page.tsx`, `app/cart/page.tsx`, `app/layout.tsx`,
   `app/orders/[id]/page.tsx`, `app/orders/page.tsx`,
   `app/products/[id]/page.tsx`, `components/Navbar.tsx`,
   `components/ProductCard.tsx`, `components/admin/DiscrepancyPanel.tsx`,
   `components/admin/DispatchRoutesView.tsx`, `components/admin/InventoryView.tsx`,
   `components/admin/OrdersDashboard.tsx`, `components/admin/StaffKpiRow.tsx`,
   `components/admin/StaffUserList.tsx`, `components/admin/TOTPSecretCard.tsx`,
   `components/ui/badge.tsx`, `components/ui/card.tsx`,
   `components/ui/separator.tsx`, `lib/order-status.tsx`.

   The **three** that do appear are all Bucket A files, and each was checked at its
   Bucket B site rather than assumed:

   | File | Bucket B citation | State after W4 |
   |---|---|---|
   | `app/profile/page.tsx` | `profile:201` | untouched — `border-t border-outline-variant` still there |
   | `app/page.tsx` | `page:277` | **untouched** — `ring-1 ring-outline-variant` still there |
   | `app/products/page.tsx` | `products:373` | **untouched** — `ring-1 ring-outline-variant` still there |

   `page:277` and `products:373` were **not** named in the earlier draft. They are
   the two likeliest places an accidental repoint would land: W4 edited both files,
   and in each one a Bucket A re-point and a `ring-outline-variant` sit in the same
   component, 97 lines apart in `app/page.tsx` (L180 → L277) and 96 in
   `app/products/page.tsx` (L277 → L373). A reviewer reading the old proof 1 would
   have concluded they were never candidates at all.

2. **By token count.** Across every `.tsx` in `app/`, `components/` and `lib/`:
   `border-control-border` = **15**, `border-outline-variant` = **13**,
   `border-border` = **1** (`components/ui/badge.tsx:17`). Before W4 the same sweep
   read 0 / 27 / 2. 27 − 14 = 13 and 2 − 1 = 1, so every removed
   `border-outline-variant` has a named Bucket A replacement and nothing else moved.
3. **By a non-`border` sweep.** There are **36** `ring-outline-variant` usages
   across `.tsx` in `app/`, `components/` and `lib/`, **identical at HEAD** — W4
   moved none of them. A `sed s/outline-variant/control-border/` would have caught
   all 36 plus `ring-border`. The count of any non-`border` `*-control-border` utility
   is **0**.

### Guard Sensitivity — RED-proven on the real file, not asserted

`frontend/tests/control-border.test.ts` pins the Bucket A sites as per-file class
counts and sweeps the whole tree. Two in-memory fixtures (W2's discipline) plus one
on-disk RED run:

**In memory.** A blanket repoint of `app/orders/page.tsx` and a reversion of
`app/login/page.tsx` are both derived from the files at test time, both assert
first that the mutation did what it claims, and both assert the tree sweep no
longer matches. Neither fixture writes the real stylesheet.

**On disk — RED observed.** `app/orders/page.tsx:333`
(`border-t border-outline-variant`, a Bucket B section divider) was repointed to
`border-control-border` and the suite re-run:

```
 Test Files  1 failed (1)
      Tests  2 failed | 24 passed (26)

 FAIL  tests/control-border.test.ts > Bucket A: exactly 15 control boundaries carry the token (task 3.2) > the whole
tree holds 15 and no other file holds one
AssertionError: expected { 'app/checkout/page.tsx': 2, …(9) } to deeply equal { 'app/checkout/page.tsx': 2, …(8) }
- Expected
+ Received
@@ -1,8 +1,9 @@
  {
    "app/checkout/page.tsx": 2,
    "app/login/page.tsx": 1,
+   "app/orders/page.tsx": 1,
    "app/page.tsx": 1,
    "app/products/page.tsx": 4,
    "app/profile/page.tsx": 3,
    "app/register/page.tsx": 1,
    "components/admin/StaffUserForm.tsx": 1,

 FAIL  tests/control-border.test.ts > Bucket B: dividers keep --outline-variant (task 3.3) > app/orders/page.tsx keeps
its 1 × border-outline-variant boundaries
AssertionError: app/orders/page.tsx must keep border-outline-variant: expected +0 to be 1 // Object.is equality
- Expected
+ Received
- 1
+ 0
```

Both directions fired and **both name the offending file**: the divider entry
went to zero, and the tree sweep gained a tenth file. The other 24 tests stayed
green, which is correct — only the two assertions that own the changed site
should move.

**Restored and green.** `app/orders/page.tsx` was restored to its exact pre-run
SHA-256 `226886AA9473A23F8EDBA40DC6CD7E62EACD7133D3BAAAD178039654DB5D0EFC`,
re-verified after the restore, and `git diff -- app/orders/page.tsx` is empty.
`app/globals.css` (`B44C454A…`) and `app/profile/page.tsx` (`5F3A7660…`) were
checksummed before and after the RED run and are unchanged.
`npm run test` returned to **65 passed (65)**.

### W4 Citation Drift — Bucket B is not the 25 sites the task describes

`tasks.md:45` and design §D2 both call Bucket B "the 25 dividers" and both list the
same sites. Reconciling that list against the code, one citation at a time.

**Counting units, declared once.** An **entry** is one comma-separated item as
`tasks.md:45` writes it; some entries carry more than one line number. A **line
reference** is one `(file, line)` pair. The list holds **27 entries / 33 line
references** (5 + 6 + 11 + 5 + 3 + 3 by category). Every figure below names its unit.

| Entry (as `tasks.md:45` writes it) | Line refs | What is actually there |
|---|---|---|
| `bodega:199` | 1 | real `border-b border-outline-variant` table rule |
| `DispatchRoutesView:196` | 1 | real table rule |
| `OrdersDashboard:206` | 1 | real table rule |
| `StaffUserList:123` | 1 | real table rule |
| `InventoryView:202` | 1 | real table rule |
| `cart:152` | 1 | **off by one** — the class is at **L153**, a real `border-b border-outline-variant` |
| `orders/page:333` | 1 | real `border-t border-outline-variant` |
| `profile:201` | 1 | real `border-t border-outline-variant` |
| `Navbar:252, 307` | 2 | `border-t border-white/10` ×2 — `--white`, never referenced `--outline-variant`; design §D2's own "No change" paragraph says so |
| `layout:89` | 1 | `border-t border-[#3a3a3a]` — an arbitrary hex |
| `ProductCard:70` | 1 | **off by one** — the class is at **L71** |
| `page:277` | 1 | a **ring**: `ring-1 ring-outline-variant` |
| `cart:145` | 1 | resolves to no boundary at all — `<div className="md:col-span-2">` |
| `orders:446` | 1 | a **ring**: `ring-1 ring-outline-variant` |
| `orders/[id]:350, 568` | 2 | L568 is a **ring** (`ring-1 ring-outline-variant`); L350 is `"…rounded-xl p-3 ring-1"` inside the dead conditional task 6.3 collapses, with no `--outline-variant` in either arm |
| `products/[id]:119` | 1 | **off by one** — the class is at **L120** and is `ring-1 ring-border` |
| `products:373` | 1 | a **ring**: `ring-1 ring-outline-variant` |
| `DiscrepancyPanel:267` | 1 | a **ring**: `ring-1 ring-outline-variant` |
| `StaffKpiRow:73` | 1 | a **ring**: `ring-1 ring-outline-variant/60` |
| `InventoryView:155` | 1 | a **ring**: `ring-outline-variant/70` |
| `InventoryView:168, 175, 182` | 3 | real `border border-outline-variant` KPI-tile frames |
| `TOTPSecretCard:68, 100` | 2 | real `border border-outline-variant` ×2 |
| `ui/badge.tsx:17` | 1 | `border-border` — reaches the same `#c4c5d5` hex through `--border`, not `--outline-variant` |
| `lib/order-status.tsx:20` | 1 | `"border-transparent bg-stock/10 text-stock"` — a status→className **map entry**, no boundary at all |
| `page.tsx:149` | 1 | `border-on-primary/30` — `--on-primary`, not `--outline-variant` |
| `ui/card.tsx:27, 86` | 2 | L27 is the CardHeader class list, where `.border-b]:pb-(--card-spacing)` is an **arbitrary variant selector**, not a `border-*` class; L86 is `"flex items-center rounded-b-2xl border-t bg-muted/50 p-(--card-spacing)"` — `border-t` with **no colour**, so it inherits `currentColor` |
| `ui/separator.tsx:16` | 1 | `"shrink-0 bg-border data-horizontal:h-px …"` — `bg-border` is a **background**, not a border utility |
| **Total** | **33** | **27 entries** |

> **Corrected enumeration.** An earlier draft carried 8 rows summing to 29 line
> references while the headline claimed 33 / 27. Four citations appeared in no row at
> all: `lib/order-status.tsx:20`, `ui/card.tsx:27`, `ui/card.tsx:86` and
> `ui/separator.tsx:16`. The drift is real and **larger** than the earlier draft
> reported. The table above now accounts for every one of the 33 line references,
> and the three off-by-one citations are labelled uniformly — the earlier draft
> silently corrected `cart:152` to `L153` in the text while explicitly flagging
> `ProductCard:70` and `products/[id]:119`, giving one defect two treatments.

**The figures that replace the earlier draft's three inconsistent counts.** Each
quantity is stated once, in one unit:

| Quantity | Figure | Unit |
|---|---|---|
| Line references resolving to a `border-*` boundary carrying `#c4c5d5` | **14** | line references — 13 `border-outline-variant` + 1 `border-border` (`ui/badge.tsx:17`, via `--border: #c4c5d5` at `globals.css:19`) |
| Line references that are **not** a `border-*` on `#c4c5d5` | **19** | line references — 33 − 14, of which 8 are `--outline-variant` rings and 11 carry no `--outline-variant` class in any form |
| Citations carrying no `--outline-variant` class in any form | **12** | line references, across **9 of the 27 entries** — the 11 above plus `ui/badge.tsx:17`, which reaches the value through `--border` instead |
| Real `ring-outline-variant` sites in the list | **8** | line references — `ProductCard:71`, `page:277`, `orders:446`, `orders/[id]:568`, `products:373`, `DiscrepancyPanel:267`, `StaffKpiRow:73`, `InventoryView:155` |

The earlier draft asserted "only **14** … the other **13**", then "**15** of which
resolve to no `--outline-variant` border" in Deviation 13, and `tasks.md:45` carries
a third "**15** of them resolve to no `--outline-variant` class at all". All three
counted the same population in three different units. The reconciled figures are
**14 / 19 / 12** in line references, above.

**The guard covers all of them anyway.** The tree sweep does not enumerate Bucket
B — it asserts that `border-control-border` appears in exactly nine files, at
exactly 15 counts, and nowhere else. A repoint at *any* Bucket B citation, ring
included, lands in a tenth file and fails. That is why the drift above does not
need fixing before W4 can land; it does need correcting in the artifact text
before `sdd-verify` reads the requirement literally.

## W6 Files Changed (PR 5 — tasks 4.1–4.2)

| File | Action | Change |
|------|--------|--------|
| `frontend/app/globals.css` | Modified | `+33/−0` — 24 declarations (`--text-{step}` and `--text-{step}--line-height` for the 12 steps) plus a 7-line block comment and 2 blank lines |
| `frontend/components/ui/button.tsx` | Modified | `+1/−1` — the base class list at L6 gains `font-label text-label-lg` and loses the competing `text-sm` (one line rewritten, so `numstat` counts `+1/−1` regardless of the token count) |
| `frontend/components/ui/badge.tsx` | Modified | `+1/−1` — the base class list at L7 gains `font-label text-label-badge` and loses the competing `text-xs` (one line rewritten) |
| `frontend/tests/typography-scale.test.ts` | **Created** | 337 lines, 46 tests — the task 4.1 and 4.2 guard, including the cascade guard added by the correction |

**Authored changed lines for W6: 374** (37 tracked + 337 new), against the 250
attempt ceiling and a ~34 forecast — **11×**. This **exceeds the 250 attempt
ceiling** and needs a `size:exception` against the attempt ledger; it still fits
the 400 review budget with 26 lines to spare, so the PR itself needs no
exception. The overrun is the same structural cause W4 named: the forecast
counts production lines, and every one of W6's acceptance criteria is an
*absence* claim that only a guard can carry. The cascade correction added 129
lines to the guard, which is the cost of proving a negative that neither the
build nor the browser-side harness can see.

Decomposition, additions and deletions both counted per the 400-line policy:

| Component | Authored lines |
|---|---|
| 24 token declarations | 24 |
| 7-line block comment + 2 blank lines in `globals.css` | 9 |
| 2 primitive class lines, counted `+1/−1` each | 4 |
| `frontend/tests/typography-scale.test.ts` | 337 |
| **Total** | **374** |

## W6 Verification Results (PR 5)

All three commands run from `frontend/` and observed directly on the shipped state.

| Command | Exit | Observed |
|---|---|---|
| `npm run test` | 0 | **4 test files passed, 111 tests passed** in 1.73s — W4's 65 plus W6's 46, **0 regressed** |
| `npm run test typography-scale` | 0 | **1 test file passed, 46 tests passed** — 41 from the original W6 guard plus 5 added by the cascade correction |
| `npm run test control-border` | 0 | **1 test file passed, 26 tests passed** — W4's guard is unmoved by W6's `button.tsx` edit, exactly as its line-number-free pinning was designed to allow |
| `npm run build` | 0 | Re-run after the cascade correction: **Compiled successfully in 1295ms**, 0 errors, 0 warnings |
| `npm run lint` | 0 | **0 errors, 0 warnings.** ESLint printed no diagnostics. |
| Cascade proof, post-correction | 0 | Fresh `.next/static/chunks/0yfsfwnj-zg0b.css` read after the rebuild. `.text-label-lg` 30279 and `.text-label-badge` 30211 are now the **only** font-size utilities on the two primitives' base lists, verified against source. `.text-xs` 30620 and `.text-[0.8rem]` 30712 both out-sort `.text-label-lg`, so the `size="xs"` and `size="sm"` variants still override. See the Cascade Finding's Resolution subsection. |

The build emitted one environment warning — `Next.js ignored package-lock.json in
C:\Users\marce because it is outside the current Git repository`. That file is
**84 bytes, created 2026-09-13**, two weeks before this unit, and lives outside
the repository. It is not a W6 regression and no W6 file is involved.

## W6 Evidence (PR 5 — tasks 4.1–4.2)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm run test` → exit 0, **111/111 passed** (baseline 65/65, +46 new, 0 regressed) |
| Lint / build | `npm run lint` → exit 0, 0 errors 0 warnings. `npm run build` → exit 0, TypeScript clean, re-run green after the cascade correction. |
| Runtime harness command/scenario and exact result | **N/A — no browser exists in this environment, and the compiled production stylesheet was read instead of pretending otherwise.** `@theme` is build-time and jsdom applies no compiled output, so `npm run dev` is the only thing that could show Inter actually painting, and it is not available. **This is not a nil-delta claim**: see §W6 Compiled-Output Evidence and §W6 Cascade Finding, both measured from `.next/static/chunks/*.css` after the build. **Open item for `sdd-verify`.** |
| Rollback boundary | Delete `frontend/tests/typography-scale.test.ts`; revert the one class line in `frontend/components/ui/button.tsx` and the one in `frontend/components/ui/badge.tsx`; and remove the 24 declarations in `frontend/app/globals.css` **line-scoped** — the block between `--font-label: var(--font-inter);` and `--color-sidebar-ring: var(--sidebar-ring);`. **A whole-file checkout of `globals.css` is unsafe**: it would also drop W4's `--control-border` pair at `:root` and `@theme inline`, and W7's 4 shadow tokens, which are cited against the same file. The block comment travels with the 24 declarations; nothing else in the file does. |

### The collision check, and what it was compared against

**0 collisions, out of 12 step names.** Two comparisons, both measured on the
shipped file, neither assumed:

1. **Against the `:root` declarations.** `globals.css` contains exactly three
   declarations whose name starts `--text-` in `:root`: `--text-primary`,
   `--text-secondary`, `--text-muted`. All 12 step names were checked against
   that set; none is in it.
2. **Against the `@theme inline` registrations that emit the colliding
   utilities.** Those three tokens reach the app as `text-primary`,
   `text-secondary` and `text-muted` through `--color-text-primary`,
   `--color-text-secondary` and `--color-text-muted`. Had a scale step been
   registered as `--text-primary`, it would land in Tailwind's *font-size*
   namespace and repaint a colour utility the app already renders — the failure
   the AC names. The 12 step names, read back out of the file, are exactly
   `display-hero, headline-lg, headline-md, headline-sm, price-hero, price-card,
   body-lg, body-md, body-sm, label-lg, label-md, label-badge` — disjoint.

Also measured, because a paired sub-token can exist and still be unreachable:
**0 of the 24 registrations alias a `var()`**, and 12 base steps have 12
sub-tokens with **0 unpaired and 0 orphaned**. The `var()`-free property is what
keeps W2's two-directional guard untouched by this unit, and it is asserted.

### W6 Count Corrections — the "236" does not reproduce

The carry-forward figure **236** could not be reproduced on the current tree
under any definition I tried. Every number below is measured, and the counting
unit is named, per W4's evidence discipline. Unit: **class-token occurrences**
(tokens extracted from string literals in the 40 `.tsx` files under `app/`,
`components/` and `lib/`) or **raw regex matches over file text**, as stated.

| Definition | Measured |
|---|---|
| stock Tailwind size steps, class-token occurrences (`text-xs\|sm\|base\|lg\|xl\|2xl…9xl`) | **273** |
| the same, raw regex over file text | **284** |
| the same, `app/` only, class-token occurrences | **196** |
| the same, `app/` only, raw regex | **206** |
| any `text-*` token, class-token occurrences | **784** |
| design-scale steps (`text-<step>`) | **2**, both added by W6 |

None of these is 236, so **I do not restate 236 as a measured fact.** The
correction matters for the AC, though, because the AC is not a count — it is
"this change MUST NOT require replacing the ad-hoc `text-*` usages". What is
verifiable, and verified: the diff modifies **three** files, and in the two
`.tsx` files it changes **one line each**, adding two class tokens and
**removing or altering no pre-existing `text-*` token**. The stock size-step
count is **273 before and 273 after** W6, because `text-label-lg` and
`text-label-badge` are design-scale steps, not stock steps. The guard asserts
this negatively: `text-label-lg`, `text-label-badge` and `font-label` each reach
exactly the files `tasks.md:50` names, and no third file.

`spec.md:13` and `tasks.md:50` both carry "236". Neither is load-bearing, and
neither is verifiable as written, so **they should be corrected before
`sdd-verify` reads the requirement literally** — the same treatment
`tasks.md:45` already received under §W4 Citation Drift.

### W6 Compiled-Output Evidence — read from the build, not asserted

`@theme` is build-time, so the honest substitute for a browser is the
stylesheet the build actually produced. Read from
`.next/static/chunks/1lmb99bmo3i9n.css` (66,908 bytes) after the green build:

| Selector | Compiled declaration | Verdict |
|---|---|---|
| `.font-label` | `font-family:var(--font-inter)` | emitted |
| `.text-label-lg` | `font-size:14px;line-height:var(--tw-leading,18px)` | emitted, **paired in one rule** |
| `.text-label-badge` | `font-size:11px;line-height:var(--tw-leading,14px)` | emitted, **paired in one rule** |

The pairing is the direct proof of the AC: the utility carries `font-size` and
`line-height` in the **same** rule, so nothing is inherited. A base token without
its sub-token emits `line-height` absent, which is the silent inheritance the
requirement forbids.

`--text-label-lg:14px` and `--text-label-badge:11px` are the only scale variables
in the output, and `--text-display-hero`, `--text-body-sm` and `--text-label-md`
are **not** — because Tailwind tree-shakes the theme to the utilities that are
used, and no component consumes those three yet. That is correct behaviour, not a
missing registration: all 24 are present in the source, which is what the guard
parses.

**Inter really is the primitive's font.** Every `font-family` declaration in the
compiled stylesheet, in order: `html{font-family:var(--font-jakarta)}` at offset
11812, then `.font-heading` at 29693, `.font-label` at 29739, `.font-mono` at
29781, after the `@font-face` blocks for both families. `!important` appears on
**no** `font-family` declaration. The button and badge carry `.font-label` and
neither `.font-sans` nor `.font-heading`, so Jakarta Sans reaches them only by
inheritance from `html` — and an inherited value always loses to a matching
declaration on the element. The Inter woff2 subsets are in the build output.
This is the scenario's THEN clause met, from the build artifact.

### W6 Cascade Finding — the scale step is out-cascaded on both primitives

**This is a real finding, not a failure of either task, and it needs a maintainer
decision before the design intent is actually reached.** Task 4.2 says *add*
`font-label text-label-lg` / `text-label-badge`; the primitives already carried
`text-sm` and `text-xs`. Both are `font-size` utilities, so they compete. All
six competing utilities sit in the **same `@layer utilities`** with identical
specificity, which means compiled source order decides. Measured offsets in the
production stylesheet:

| offset | utility | declaration |
|---|---|---|
| 30109 | `.text-label-badge` | `font-size:11px;line-height:var(--tw-leading,14px)` |
| 30177 | `.text-label-lg` | `font-size:14px;line-height:var(--tw-leading,18px)` |
| **30334** | **`.text-sm`** | `font-size:var(--text-sm);line-height:var(--tw-leading,var(--text-sm--line-height))` |
| **30518** | **`.text-xs`** | `font-size:var(--text-xs);line-height:var(--tw-leading,var(--text-xs--line-height))` |

`text-sm` and `text-xs` come **later**, so they win on both primitives:

| Primitive | Renders | Design source says | Delta |
|---|---|---|---|
| `ui/button.tsx` | `text-sm` → 14px / 20px | `label-lg` → 14px / **18px** | size identical; **line height stays 20px, not 18px** |
| `ui/badge.tsx` | `text-xs` → 12px / 16px | `label-badge` → **11px / 14px** | **badge text does not shrink to 11px; line height stays 16px, not 14px** |

**The AC is met regardless.** Scenario "Inter renders on buttons and badges"
asks that *the Inter font primitive applies and Plus Jakarta Sans does not* —
`font-label` is emitted, unopposed, and §W6 Compiled-Output Evidence proves the
cascade for it. Font *size* is a different claim the scenario never makes. Task
4.1's AC, "every scale step declares a paired line height", is met and proven at
the compiled-CSS level.

**The design intent is not reached**, and I did not fix it, because every fix is
a decision the task did not authorise: removing `text-sm` / `text-xs` from the two
base class lists changes primitive geometry the task never mentions, and the
`size` variants (`xs`, `sm`) set their own `text-*` independently. Choosing
between "delete the stock step" and "move the scale step after it" is a
maintainer call. See Open Items.

#### Resolution — maintainer decision: delete the stock step (2026-09-29)

The maintainer resolved the fork in favour of **deleting the stock step** from
the two base class lists. Rationale for rejecting the alternative: *moving* the
scale step after `text-sm`/`text-xs` in the cascade is not expressible in
Tailwind v4. Utility order inside `@layer utilities` is decided by the framework
alphabetically, not by declaration order in the stylesheet, so there is no
author-side lever that reorders it. Deleting the competitor is the only fix
that is actually available.

Measured before/after on the production stylesheet, rebuilt from scratch:

| utility | offset before | offset after |
|---|---|---|
| `.text-label-badge` | 30109 | 30211 |
| `.text-label-lg` | 30177 | 30279 |
| `.text-xs` | 30518 | 30620 |
| `.text-[0.8rem]` | 30610 | 30712 |

The relative order is unchanged, which is the point: the fix removes the
competitor rather than reordering anything. Post-fix state:

| Primitive | Base list now carries | Renders | Design source | Status |
|---|---|---|---|---|
| `ui/button.tsx` | `text-label-lg` only | 14px / 18px | `label-lg` → 14px / 18px | **reached** (line height was 20px) |
| `ui/badge.tsx` | `text-label-badge` only | 11px / 14px | `label-badge` → 11px / 14px | **reached** (was 12px / 16px) |

**The `size` variants are unaffected, and this was verified rather than assumed.**
This was the open risk in the original finding. `button.tsx` carries two size
variants that set their own `font-size`, and both must still override the base:

| Variant | Utility | offset | Base `text-label-lg` | Winner |
|---|---|---|---|---|
| `size="xs"` | `text-xs` | 30620 | 30279 | `text-xs` — variant still wins |
| `size="sm"` | `text-[0.8rem]` | 30712 | 30279 | `text-[0.8rem]` — variant still wins |

Arbitrary-value steps sort **after every named step** (the full measured order
is `.text-2xl` 29923 · `.text-3xl` 30018 · `.text-base` 30113 ·
`.text-label-badge` 30211 · `.text-label-lg` 30279 · `.text-lg` 30344 ·
`.text-sm` 30436 · `.text-xl` 30528 · `.text-xs` 30620 · `.text-[0.8rem]`
30712 · `.text-[10px]` 30746 · `.text-[11px]` 30776), so both variants
out-sort the base step and need no change. Neither variant is exercised by the
current app — `text-[0.8rem]` is emitted only because the variant is declared —
so this is a static cascade argument, not an observed render. Stated as such.

**Consequence to be aware of:** the primitives now own their size, and a
consumer writing `<Button className="text-base">` will silently get 14px,
because `text-base` (30113) out-sorts nothing here. That trap predates this
correction — with `text-sm` in the base list a consumer's `text-base` already
lost to 30436 — so this is not a regression, but it is now the only size on the
element and therefore the more likely thing for a future consumer to trip on.
The durable escape is a `size` variant, not a utility override.

### Guard Sensitivity — RED-proven on the real stylesheet, not asserted

Both runs edited `frontend/app/globals.css` on disk, were observed, and the file
was restored to the exact pre-run SHA-256
`6B54F9DA39B22F2FD565C472DDEB4F9765919494800E4BFDA168563844D555D6`
(287 lines) after each.

**RED 1 — a line-height sub-token is deleted.** Removing
`--text-label-badge--line-height: 14px;`:

```
AssertionError: --text-label-badge--line-height is not registered, so its
  utility inherits a line-height: expected undefined to be '14px'
 Test Files  1 failed (1)
      Tests  2 failed | 40 passed (42)
```

**RED 2 — a value is unit-converted, not changed.** `--text-label-lg: 14px` →
`0.875rem` — numerically identical, so no runtime check could ever catch it:

```
AssertionError: expected '0.875rem' to be '14px' // Object.is equality
 Test Files  1 failed (1)
      Tests  2 failed | 40 passed (42)
```

RED 2 is why the suite parses `docs/designs/DESIGN.md` instead of transcribing a
value table. W1's deviation 3 argued the same point for contrast values; the same
argument holds for sizes, and here it catches a change that is invisible by
construction.

Three **in-memory** fixtures also prove sensitivity without touching disk: the
missing sub-token, a step renamed to a reserved colour name (`--text-primary`),
and the rescaled value. The real stylesheet is never written by the suite.

**One test was written, found vacuous, and removed.** `no two --text-*`
`registrations claim the same utility name` could never fail:
`parseStylesheet` returns a `Map`, so a duplicated declaration key is collapsed
before any caller sees it, and the assertion iterated already-unique keys. A test
that cannot fail is worse than no test — it advertises coverage that does not
exist. Removed before the unit closed; the file is 208 lines, not 219.

## Deviations from Design

1. **`@vitejs/plugin-react` pinned to `^5.2.0`, not the latest `^6.1.1`.** v6 declares `peerOptional @rolldown/plugin-babel`, which pulls `@babel/plugin-transform-runtime@8` and its `peer @babel/core@^8`, while `shadcn@4.21.0` requires `@babel/core@^7`. `npm install` fails with `ERESOLVE`. v5.2.0 has no Babel peer and supports Vite 8. The design named the package, not the major.
2. **`vitest` pinned to `^4.1.11`, not the latest `5.0.2`.** v5 declares `peerOptional @types/node@^22 || >=24`; the project already declares `@types/node@^20`. v4 accepts `^20.0.0 || ^22 || >=24`. Bumping an existing devDep was judged out of W1's scope, so the runner was pinned down instead of the manifest up.
3. **The contrast suite reads `app/globals.css` at runtime** instead of hardcoding the §D3 value table. Required, not optional: with hardcoded values, reverting `globals.css:15` would leave the suite green and the spec scenario "the contrast test fails" would be unprovable. The §D3 figures are still asserted, as `toBeCloseTo` checks and an exact `--text-muted` identity check.
4. **`import.meta.url` is unusable here.** Under the jsdom environment Vitest serves test modules over `http:`, so `fileURLToPath` throws `The URL must be of scheme file`. The suite reads via `resolve(process.cwd(), …)` instead, documented in-file.
5. **A small inline `readRootToken` reader lived in `contrast.test.ts`** rather than `tests/support/css-tokens.ts`, because that file belonged to W2. **Resolved by W2:** the reader now lives in `css-tokens.ts` and `contrast.test.ts` calls it. See Deviation 9 for the rollback-boundary consequence.
6. **Authored lines are 262, above the ~110 forecast** (the test file is 182). Still under the 400 budget, so no `size:exception` is needed for authored code.
7. **The lockfile exceeded the forecast band.** Forecast said 1,300–2,000 added lines; actual is **+2820/−930 = 3,750 changed lines**, net growth 1,890. The forecast band matched net growth, not the additions+deletions count that the 400-line policy actually measures. The declared `size:exception` covers it either way, but the PR should quote 3,750.
8. **Two non-fatal Vite notices on `npm run test`**, both left in place deliberately:
   - `vitest.config.ts` uses ESM syntax in a file loaded as CommonJS. Fixing it as suggested would mean adding `"type": "module"` to `package.json`, which changes how Next.js loads its own config. Out of scope and risky.
   - `vite-tsconfig-paths` is now redundant with Vite's native `resolve.tsconfigPaths`. The devDep and the plugin are explicitly required by task 1.1 and design §D3, so they stay.
9. **W2 deviation — `frontend/tests/contrast.test.ts` is now inside the rollback boundary.** W1 deviation 5 left an inline whole-file `readRootToken` regex in the contrast suite because `tests/support/css-tokens.ts` belonged to W2. W2 folded it in, so the contrast suite and the registration guard read `:root` through one scoped parser and cannot drift. The cost is that the boundary named at `tasks.md:88` is incomplete: `css-tokens.ts` is now load-bearing for `contrast.test.ts`. All four files must be reverted together.
10. **W2 deviation — three in-memory fixtures, not the two task 2.5 names.** Added `--color-probe-dangling: var(--probe-missing)` so the reverse direction is observed failing rather than only asserted to be empty. Purely additive; both named fixtures are unchanged.
11. **W2 deviation — 339 authored lines against a ~86 forecast (3.9×).** The parser is 144 lines and the suite 155. Roughly 45 of the parser's lines and 40 of the suite's are docblocks explaining why the allowlist and the reverse direction exist, which the repo's artifact style asks for. It lands under the 400 budget so no `size:exception` is needed, but the forecast under-counted the guard's cost by a wide margin. W1 over-ran 2.4×; W2 over-ran 3.9×. The forecast table in §"Per Work Unit" should be corrected before PR 3 opens, not after.
12. **W2 discovery — the in-memory fixture is name-coupled to the real stylesheet.** During RED 2's second half, the on-disk probe `--probe-unregistered` was still present while the fixture test ran, so `withUnregistered` re-derived an already-registered probe and the fixture failed with `expected [] to deeply equal [ '--probe-unregistered' ]`. This is a fixture collision, not a guard defect, and it failed **loudly** rather than passing vacuously — the intended behaviour. It only occurs while a probe is mid-flight in the real file, which never ships. Not changed.
13. **W4 deviation — task 3.3's Bucket B list does not describe the code, and the "25" is wrong.** Documented in full under §W4 Citation Drift: the list names **27 entries / 33 line references**; of those 33 line references, **14** resolve to a `border-*` boundary carrying `#c4c5d5` and **19** do not; **8** are `ring-outline-variant` rather than a border, and **12 line references across 9 entries** carry no `--outline-variant` class in any form. The negative constraint was implemented as a tree-wide sweep instead of a per-citation list, which is strictly stronger and immune to the drift, but **the artifact text should be corrected before `sdd-verify`** — a verifier reading `tasks.md:45` literally will not find 25 dividers.
14. **W4 deviation — one line of `frontend/tests/contrast.test.ts` is in W4's diff.** Its comment read "`--control-border` re-points at this value in a later work unit", which W4 made false. Rewritten to "`--control-border` re-points at this value; this suite floors the target". The constant itself is unchanged and still correct: `readRootToken` returns the raw value, so the suite must floor `--outline` (the hex) rather than `--control-border` (a `var()` alias) — which is exactly the point of the new token. Costs `+1/−1` and expands the rollback boundary named at `tasks.md:89`.
15. **W4 deviation — 195 authored lines against a ~17 forecast (11.5×).** The exact decomposition, since an earlier gloss here said "the other 178" and that figure accounted for only 163:

   | Component | Authored lines |
   |---|---|
   | 15 Bucket A class re-points, counted as `+15/−15` | 30 |
   | `frontend/app/globals.css` — 2 declarations plus a 2-line SC 1.4.11 comment | 4 |
   | `frontend/tests/contrast.test.ts` — one falsified comment, `+1/−1` | 2 |
   | `frontend/tests/control-border.test.ts` — new guard | 159 |
   | **Total** | **195** |

   The forecast's ~17 counted the 15 class lines and the 2 token declarations **once
   each**; the review budget counts additions *and* deletions, so the same 15 class
   lines are 30. Production work is otherwise faithful to the forecast: 15 class
   re-points, 2 declarations, no unplanned source edit. This is far outside the
   2.4×–3.9× band W1–W3 recorded, and the reason is structural rather than sloppy:
   **the forecast counts only production lines, and a negative constraint is worth
   zero lines in a production-line forecast.** If W6–W8 carry similar negative
   constraints (W8's "the radius ramp MUST NOT be altered" is one), their forecasts
   need the same correction before they are opened. 195 is under the 200 attempt
   ceiling, so no `size:exception` is required.
16. **W4 deviation — a factual claim in `frontend/tests/control-border.test.ts:18` is wrong.** The comment reads "`components/ui/button.tsx:6`, three lines above the site task 3.2 cites". Task 3.2 cites `button.tsx:12`; `12 − 6 = 6`, so it is **six** lines above, not three. The guard's *reasoning* is unaffected — the point is that sites are pinned as per-file class counts rather than line numbers, precisely so W6's correct edit to `button.tsx:6` cannot break the guard. Only the arithmetic in the comment is wrong. **Not fixed in this re-run:** the prompt's "do not change any source file" boundary is explicit, and a one-word comment correction is not worth widening the W4 diff by a `+1/−1` while the attempt sits at 195 of 200. Carried to Open Items for the orchestrator.

17. **W6 deviation — 245 authored lines against a ~34 forecast (7.2×), and the overrun is the guard, not the work.** The 24 declarations and 2 class re-points are 37 changed lines, which is the forecast almost exactly once deletions are counted. The other 208 are `frontend/tests/typography-scale.test.ts`. W4's deviation 15 predicted this: *"a negative constraint is worth zero lines in a production-line forecast"*, and both of W6's acceptance criteria are negative claims — a missing `--line-height` sub-token and a step name colliding with a colour token are both invisible at runtime, both keep the build green, and neither is checkable by reading the diff. 27 of the 41 tests are two `it.each` blocks over the 12 steps, one assertion per step per AC, so a failure names the exact step. 245 lands under the 250 attempt ceiling and well under the 400 review budget, so no `size:exception` is needed. The W6 row in `tasks.md` now carries the measured figure, as W2's and W4's rows already do.
    - **SUPERSEDED by deviation 20 (cascade correction, 2026-09-29).** The 245-line figure and the "under the 250 attempt ceiling" conclusion were true when measured and are retained as the historical record. W6 now stands at **374 authored lines** and therefore **exceeds the 250 attempt ceiling**; the guard absorbed the 129 extra lines. The 400 review budget still holds, with 26 lines to spare.
18. **W6 deviation — the carry-forward "236 ad-hoc `text-*` usages" is not reproducible and is not restated as fact.** Measured figures and counting units are in §W6 Count Corrections; six definitions were tried and the nearest are 196 and 273 class-token occurrences. W4 failed its gate on exactly this class of error, so the figure is corrected rather than repeated. The AC itself is unaffected and is verified a different way: the diff touches one line in each `.tsx` file, adds two class tokens, and alters no pre-existing `text-*` token. `spec.md:13` and `tasks.md:50` still carry 236 and should be corrected before verify.
19. **W6 discovery — the label scale step is out-cascaded on both primitives, so the design's sizes are not reached.** `text-sm` (compiled offset 30334) and `text-xs` (30518) both sort **after** `text-label-lg` (30177) and `text-label-badge` (30109) in the same `@layer utilities`, so the pre-existing stock steps win. The badge renders at 12px/16px where the design source says 11px/14px, and the button's line height stays 20px where `label-lg` says 18px. The AC still passes — the scenario is about the *font primitive*, and `.font-label` is emitted unopposed — but the intent is not delivered. **RESOLVED 2026-09-29 by maintainer decision - the stock step was deleted from both base class lists**, so the design's 14px/18px and 11px/14px are now actually reached, and both `size` variants were verified to keep overriding the base. See the Resolution subsection of the Cascade Finding. This is the kind of thing only a compiled-CSS read catches: `npm run test` and `npm run build` were both green with the tokens present *and* inert.
20. **W6 correction - the fix exceeds task 4.2's literal instruction, and the guard had a vacuity trap.** Task 4.2 says *add* `font-label text-label-lg` / `text-label-badge`. The correction also **removes** `text-sm` and `text-xs`, which the task never mentions - so W6's diff is now wider than its task text, deliberately, on maintainer authority. Two things were nearly got wrong and are recorded so they are not got wrong twice:
    - **A naive guard would have passed vacuously.** The obvious classifier - "is `text-X` a font-size utility?" via `registrations.has('--text-X')` - returns **false for `text-sm`, `text-xs` and `text-lg`**, because this stylesheet does not re-declare Tailwind's built-in text tokens; they arrive from the default theme. A guard built that way would report the pre-correction base lists as clean and stay green forever. The shipped classifier inverts the test: a `text-*` token is a **colour** utility iff `--color-X` *is* locally registered (true for `--color-primary-foreground` at `globals.css:188` and `--color-muted-foreground` at `:184`), and everything else `text-*` counts as a competing size. Fail-safe polarity: an unrecognised token counts against the design, not for it.
    - **The `size` variants are the real regression risk, not the base lists.** `button.tsx` sets `font-size` independently in `size="xs"` (`text-xs`) and `size="sm"` (`text-[0.8rem]`). Deleting the base competitor is only safe because both out-sort `text-label-lg`; had the scale step sorted *after* them, the correction would have silently frozen every small button to 14px. The guard pins the property the correction depends on. Neither variant is exercised by the current app, so this is a cascade argument over measured offsets, not an observed render. Original measurement in §W6 Cascade Finding; the decision is in Open Items. This is the kind of thing only a compiled-CSS read catches: `npm run test` and `npm run build` are both green with the tokens present *and* inert.

## W7 Files Changed (PR 6 — tasks 5.1–5.2)

| File | Action | Change |
|------|--------|--------|
| `frontend/app/globals.css` | Modified | `+17/−0` — the 4 `--shadow-level-*` declarations with a 4-line block comment, plus `@source not "../tests";` with a 6-line comment (see §W7 Test-Directory Content Scan) |
| `frontend/app/page.tsx` | Modified | `+2/−2` — L179 `shadow-sm`, L180 `hover:shadow-sm` → `shadow-level-1` |
| `frontend/app/products/page.tsx` | Modified | `+4/−4` — two filter-toggle pairs, L258/259 and L276/277 |
| `frontend/app/orders/[id]/page.tsx` | Modified | `+2/−2` — L251 order card, L278 timeline step dot |
| `frontend/app/orders/page.tsx` | Modified | `+1/−1` — L121 active status chip |
| `frontend/app/cart/page.tsx` | Modified | `+1/−1` — L146 container **gains** `shadow-level-1` |
| `frontend/app/products/[id]/page.tsx` | Modified | `+1/−1` — L120 `bg-card` surface **gains** `shadow-level-1` |
| `frontend/components/ProductCard.tsx` | Modified | `+1/−1` — L71 root **gains** `shadow-level-1` |
| `frontend/components/ui/card.tsx` | Modified | `+1/−1` — L14 base **gains** `shadow-level-0` |
| `frontend/components/Navbar.tsx` | Modified | `+1/−1` — L115 `shadow-lg` → `shadow-level-2` |
| `frontend/components/admin/DiscrepancyPanel.tsx` | Modified | `+1/−1` — L267 `shadow-2xl` → `shadow-level-2` |
| `frontend/components/admin/StaffKpiRow.tsx` | Modified | `+1/−1` — L73 `shadow-sm` → `shadow-level-1` |
| `frontend/components/admin/StatusFilterChips.tsx` | Modified | `+2/−2` — L83, L86 |
| `frontend/tests/elevation-scale.test.ts` | **Created** | 395 lines, 34 tests — the task 5.1 and 5.2 guard |

**Authored changed lines for W7: 446** (17 `globals.css` + 34 class lines + 395
new guard), against a **~16** forecast — **28×**. This **exceeds the 400 review
budget by 46** and the 250 attempt ceiling, so unlike W1–W6 it needs a
`size:exception` against the *review* budget, not only the attempt ledger.
W4 deviation 15 predicted this exactly: *"a negative constraint is worth zero
lines in a production-line forecast"*, and W7's AC is nothing but a negative
claim. The production half of the diff — 51 lines — is within any sane budget.

## W7 Verification Results (PR 6)

All four commands run from `frontend/` and observed directly, in the order
tasks.md names them, **on the shipped state after both Task 5.1 and Task 5.2
and after the `@source not` correction**.

| Command | Exit | Observed |
|---|---|---|
| `npm run test elevation-scale` | 0 | **1 test file passed, 34 tests passed** in 1.21s |
| `npm run test` | 0 | **5 test files passed, 145 tests passed** in 2.11s — W6's 111 plus W7's 34, **0 regressed** |
| `npm run build` | 0 | **Compiled successfully** (757ms / 489ms / 872ms across three runs); TypeScript finished in 1.87s; **17 routes** |
| `npm run lint` | 0 | **0 errors, 0 warnings.** ESLint printed no diagnostics. |

The build emitted the one environment warning already recorded under W6 — Next
ignored `C:\Users\marce\package-lock.json`, which lives outside the repository
and is not a W7 file.

The build was run **three times** and the output is **deterministic**: the same
stylesheet hash `0tx0p9w3y3gc3.css` and the same 66,327 bytes every time. The
third of those was a verification probe (§W7 Cascade Order) whose only
temporary change was removing one line, and `app/globals.css` was restored to
its original SHA-256 before the final build.

## W7 Evidence (PR 6 — tasks 5.1–5.2)

Design source: `docs/designs/DESIGN.md` §"Ambient Shadow Hierarchy", lines
190–194. The four values registered in `@theme inline`, verbatim, units
unreformatted:

| Token | Value | Design consumers | Consumed by |
|---|---|---|---|
| `--shadow-level-0` | `none` | flat background plane, 1px border only | `components/ui/card.tsx:14` |
| `--shadow-level-1` | `0px 2px 8px -2px rgba(15, 23, 42, 0.06)` | product grids, category squares | 13 sites |
| `--shadow-level-2` | `0px 8px 24px -4px rgba(15, 23, 42, 0.12)` | bottom sheets, sticky bars, modals | `Navbar.tsx:115`, `DiscrepancyPanel.tsx:267` |
| `--shadow-level-3` | `0px 16px 36px -6px rgba(15, 23, 42, 0.18)` | toasts, undo pills, cart drawers | **none — registered ahead of use** |

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm run test elevation-scale` → exit 0, **34/34 passed** in 1.30s |
| Full-suite confirmation | `npm run test` → exit 0, **5 files / 145 tests passed** (baseline 111/111, +34 new, 0 regressed) |
| Lint / build | `npm run lint` → exit 0, 0 errors 0 warnings. `npm run build` → exit 0, 17 routes, TypeScript clean. |
| Runtime harness command/scenario and exact result | **NOT PERFORMED — no browser is available in this environment, and nothing here is a substitute for one.** The forecast's harness is `npm run dev` with "elevation inspected manually on `/` and `/cart`". That needs a browser this environment does not have. The compiled production stylesheet was read instead, and that is real evidence about *emission* — **it is not evidence about paint.** Nothing in this unit observed a rendered shadow, a computed style, or a pixel. **Open item for `sdd-verify`.** |
| Rollback boundary | Revert the 4 declarations **and** the `@source not "../tests";` line in `frontend/app/globals.css` — the shadow block is line-scoped between `--font-label: var(--font-inter);` and `--color-sidebar-ring: var(--sidebar-ring);`, and a whole-file checkout also drops W4's `--control-border` pair and W6's 24 typography declarations. Revert the 18 class lines across 11 `.tsx` files, and delete `frontend/tests/elevation-scale.test.ts`. **Keep the `@source not` line even when reverting only the shadows**: it is the correction in §W7 Test-Directory Content Scan and is not part of the elevation scale. |
| Usage count, measured | **14 stock → 18 level.** 14 pre-existing `shadow-*` usages converted 1:1, 4 surfaces that carried no shadow given a level, 12 files. Pinned as per-file counts in the guard, never as line numbers. |
| Design's Level-1 `#F1F5F9` stroke | **Deliberately not added.** The design pairs Level 1 with a 1px `#F1F5F9` stroke, and the 13 Level-1 surfaces already carry `border-control-border` or `ring-outline-variant` from W4. Repointing them is W4's contract, not this unit's; the guard asserts nothing about stroke colour. |

### W7 Cascade Invariant — why the guard is a negative claim

In Tailwind v4 every `shadow-*` utility lands in the same `@layer utilities`
with identical specificity, so the compiled stylesheet decides the winner by
sorting the namespace **alphabetically**:

```
shadow-2xl  <  shadow-level-0..3  <  shadow-lg  <  shadow-sm
```

Every stock Tailwind shadow out-sorts the custom level tokens. A surviving
`shadow-sm` does not "win sometimes" — it wins unconditionally, and a
`shadow-level-1` on the same element is dead markup. Markup order cannot
express a preference and no author-side reordering exists, which is the same
wall W6 hit in the `text-` namespace. **The only available fix is the one W6
applied to the font primitives: delete the competitor.** So the invariant is:

> Every `shadow-*` utility anywhere in `frontend/app` and `frontend/components`
> must be a `shadow-level-*` token. **Zero stock shadows.**

That is an *absence* claim, and absence claims are invisible at runtime: the
build is green, lint is clean, and the surface simply keeps its stock
elevation. 14 of them were shipping. Hence a tree-wide guard rather than a
per-site assertion.

### Guard Sensitivity — RED-proven on the real tree, not asserted

The guard was run **before** Task 3's migration and observed failing against
the shipped sources. Verbatim, 16 of 34 tests failed:

```
 ❯ tests/elevation-scale.test.ts (34 tests | 16 failed) 45ms
     × the whole tree holds 18 shadow usages and every one is a level token 9ms
     × app/cart/page.tsx holds 1 level shadows 1ms
     × app/orders/[id]/page.tsx holds 2 level shadows 1ms
     × app/orders/page.tsx holds 1 level shadows 1ms
     × app/page.tsx holds 2 level shadows 1ms
     × app/products/[id]/page.tsx holds 1 level shadows 1ms
     × app/products/page.tsx holds 4 level shadows 1ms
     × components/Navbar.tsx holds 1 level shadows 1ms
     × components/ProductCard.tsx holds 1 level shadows 1ms
     × components/admin/DiscrepancyPanel.tsx holds 1 level shadows 1ms
     × components/admin/StaffKpiRow.tsx holds 1 level shadows 0ms
     × components/admin/StatusFilterChips.tsx holds 2 level shadows 1ms
     × components/ui/card.tsx holds 1 level shadows 1ms
     × the per-file counts and the tree-wide total agree 5ms
     × no stock Tailwind shadow utility is referenced by any source file 12ms
     × a stock shadow reintroduced at a real site is visible to the sweep 1ms

 FAIL  tests/elevation-scale.test.ts > zero stock shadow utilities survive (task 5.2) > no stock Tailwind shadow utility is referenced by any source file
AssertionError: stock shadows out-sort every shadow-level-* token in the compiled @layer utilities, so each utility below silently overrides its level:
  app/orders/[id]/page.tsx:251 — shadow-sm
  app/orders/[id]/page.tsx:278 — shadow-sm
  app/orders/page.tsx:121 — shadow-sm
  app/page.tsx:179 — shadow-sm
  app/page.tsx:180 — hover:shadow-sm
  app/products/page.tsx:258 — shadow-sm
  app/products/page.tsx:259 — hover:shadow-sm
  app/products/page.tsx:276 — shadow-sm
  app/products/page.tsx:277 — hover:shadow-sm
  components/admin/DiscrepancyPanel.tsx:267 — shadow-2xl
  components/admin/StaffKpiRow.tsx:73 — shadow-sm
  components/admin/StatusFilterChips.tsx:83 — shadow-sm
  components/admin/StatusFilterChips.tsx:86 — shadow-sm
  components/Navbar.tsx:115 — shadow-lg: expected [ …(14) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "  app/orders/[id]/page.tsx:251 — shadow-sm",
+   "  app/orders/[id]/page.tsx:278 — shadow-sm",
+   "  app/orders/page.tsx:121 — shadow-sm",
+   "  app/page.tsx:179 — shadow-sm",
+   "  app/page.tsx:180 — hover:shadow-sm",
+   "  app/products/page.tsx:258 — shadow-sm",
+   "  app/products/page.tsx:259 — hover:shadow-sm",
+   "  app/products/page.tsx:276 — shadow-sm",
+   "  app/products/page.tsx:277 — hover:shadow-sm",
+   "  components/admin/DiscrepancyPanel.tsx:267 — shadow-2xl",
+   "  components/admin/StaffKpiRow.tsx:73 — shadow-sm",
+   "  components/admin/StatusFilterChips.tsx:83 — shadow-sm",
+   "  components/admin/StatusFilterChips.tsx:86 — shadow-sm",
+   "  components/Navbar.tsx:115 — shadow-lg",
+ ]

 Test Files  1 failed (1)
      Tests  16 failed | 18 passed (34)
```

All **14** stock usages were named with file and line, including the two in
`app/orders/[id]/page.tsx` the task had omitted and the `Navbar.tsx` one the
task had not listed.

**Brackets — the walk was verified, not trusted.** `app/orders/[id]/` and
`app/products/[id]/` hold literal square brackets in their directory names. A
walk that builds a glob per directory lets the glob engine read `[id]` as a
character class, matches nothing, and the guard passes **vacuously** over the
one file holding two of the migrated sites. The shipped walk is
`readdirSync(dir, { withFileTypes: true })` recursing on `entry.name`, so each
segment reaches the filesystem as a literal string, and the guard asserts the
bracket files are in the discovered set and that the walk found **37** `.tsx`
files. The previous orchestrator survey made exactly this mistake; the count
assertion is what makes a future regression of it loud rather than silent.

**In-memory fixtures** additionally prove the extractor is not vacuous: a stock
shadow is found with its line, a variant of one is found with the prefix kept
(`hover:shadow-sm`, `md:shadow-lg`), a level token and a *variant* of a level
token are not reported, an arbitrary value `shadow-[0_0_0_1px_rgb(0_0_0_/_0.1)]`
is read whole rather than truncated, a `shadow-sm` in a comment is not counted,
and a stock shadow reintroduced at `Navbar.tsx:115` is caught by the real
sweep. The real files are never written by the suite.

### W7 Compiled-Output Evidence — read from the build, not asserted

Read from `.next/static/chunks/0tx0p9w3y3gc3.css` (**66,327 bytes**) after the
green build. Every rule in the stylesheet whose selector mentions "shadow":

| offset | selector | `--tw-shadow` |
|---|---|---|
| 33506 | `.shadow-level-0` | `none` |
| 33673 | `.shadow-level-1` | `0px 2px 8px -2px var(--tw-shadow-color,#0f172a0f)` |
| 33885 | `.shadow-level-2` | `0px 8px 24px -4px var(--tw-shadow-color,#0f172a1f)` |
| 43396 | `.hover\:shadow-level-1:hover` | `0px 2px 8px -2px var(--tw-shadow-color,#0f172a0f)` |

**Emitted source order: 33506 → 33673 → 33885**, so the level rules occupy a
contiguous block and the `hover:` variant sits later, in Tailwind's separate
hover section. The rgba values survived compilation byte-for-byte in
`#0f172a0f` / `#0f172a1f` hex-alpha form, which is the same colour, not a
reformulation.

**`shadow-level-3` is registered but ABSENT from the shipped stylesheet.**
That is correct behaviour, not a missing registration: Tailwind tree-shakes the
theme to the utilities that are consumed, and nothing consumes Level 3. W6
recorded the same property for `--text-display-hero`, `--text-body-sm` and
`--text-label-md`. **The AC for task 5.1 — "Token values match the design
source" — is met at the source level, where the guard reads them; the
compiled-stylesheet claim that all four levels appear cannot be made against the
shipped stylesheet, and this artifact does not make it.** See the probe below for
proof that the value compiles correctly when something references it. The
values are asserted against `docs/designs/DESIGN.md` by
`frontend/tests/elevation-scale.test.ts`, which parses the design source rather
than transcribing a table.

**No stock shadow rule survives in the stylesheet at all** — no `.shadow-sm`,
`.shadow-lg`, `.shadow-2xl`, `.shadow`, or arbitrary-value shadow. That is
stronger than the task asked, and it is the *result* of §W7 Test-Directory
Content Scan, not of the migration alone.

### W7 Cascade Order — proven from two real builds, not reasoned

The task's core argument is that stock shadows out-sort the level tokens, and
that claim is now **measured rather than asserted**. Two builds were taken from
the same source, differing only in the presence of the one-line `@source not
"../tests";` directive, and every emitted shadow rule was located by byte offset:

| offset | selector | origin |
|---|---|---|
| 34072 | `.shadow` | stock — test literal |
| 34320 | `.shadow-2xl` | stock — `DiscrepancyPanel` test literal |
| 34529 | `.shadow-\[0_0_0_1px_red\]` | stock — arbitrary-value test literal |
| 34738 | `.shadow-\[0_0_0_1px_rgb\(0_0_0_\/_0\.1\)\]` | stock — arbitrary-value test literal |
| **34970** | **`.shadow-level-0`** | registered by this unit |
| **35137** | **`.shadow-level-1`** | registered by this unit |
| **35349** | **`.shadow-level-2`** | registered by this unit |
| **35562** | **`.shadow-level-3`** | registered by this unit, unconsumed |
| 35776 | `.shadow-lg` | stock — `Navbar` test literal |
| 36032 | `.shadow-sm` | stock — test literal |
| 45581 | `.hover\:shadow-level-1:hover` | registered by this unit |
| 45806 | `.hover\:shadow-sm:hover` | stock — test literal |
| 53495 | `.md\:shadow-lg` | stock — test literal |
| 53776 | `.md\:group-hover\:shadow-lg:is(:where(.group):hover *)` | stock — test literal |

(offsets from `.next/static/chunks/2p2-2tc3lhodv.css`, **69,358 bytes**, built
with the directive removed; the shipped build is `0tx0p9w3y3gc3.css`, **66,327
bytes**)

**The order is alphabetical, and it confirms the hazard exactly as predicted:**
`.shadow-sm` at **36032** lands **895 bytes after** `.shadow-level-1` at
**35137**. Equal specificity, same `@layer utilities`, so the later rule wins —
unconditionally. `.shadow-lg` (35776) likewise post-dates every level token.
`.shadow-level-3` at 35562 carries
`0px 16px 36px -6px var(--tw-shadow-color,#0f172a2e)`, proving the registered
value compiles byte-for-byte and is not dropped for being unconsumed in the
*theme* — it is only absent from the shipped stylesheet because the test-scan
exclusion removes the sole reference that would have kept it alive.

**Both builds are reproducible and the probe is reversible.** The directive was
removed, built, measured, and restored; `app/globals.css` returns to
SHA-256 `385CD3F8…B477CB6` and the rebuild reproduces `0tx0p9w3y3gc3.css` at
66,327 bytes exactly. Nothing in the shipped tree is a probe artifact.

### W7 Test-Directory Content Scan — a defect this unit introduced and then fixed

The first build after the migration still emitted `.shadow-sm`, `.shadow-lg`,
`.shadow-2xl`, `.shadow`, `.hover\:shadow-sm:hover`, `.md\:shadow-lg`,
`.md\:group-hover\:shadow-lg` and two arbitrary-value shadow rules — **from no
`.tsx` at all**. Tailwind v4's automatic content detection scans the whole
project outside `.gitignore`, which includes `frontend/tests/**`, so the
guard's own fixture strings and its own docblock examples were being compiled
into the production stylesheet as dead CSS.

That is a self-inflicted defect with two bad edges: the shipped stylesheet grew
3,031 bytes of rules no element can match, and — worse — it destroyed the
evidence this unit depends on. A reviewer grepping the built CSS for
`shadow-sm` would find it, and could not tell whether a real component still
used it.

Fixed with one line, `@source not "../tests";` after the `@import`s. The
before/after is measured above, not estimated: **10 shadow-related rules and 3
display rules removed, 69,358 → 66,327 bytes.** The 10 were 9 stock rules
(`.shadow`, `.shadow-2xl`, both arbitrary-value rules, `.shadow-lg`,
`.shadow-sm`, `.hover\:shadow-sm:hover`, `.md\:shadow-lg`,
`.md\:group-hover\:shadow-lg`) plus the unconsumed `.shadow-level-3`; the 3
display rules were `.inline`, `.invisible` and `.table`, which a pre-existing
test file was also injecting. **None of the 13 is referenced by any `.tsx` in
`app/` or `components/`** — the guard's clean 34/34 is the proof, and the build
stayed green throughout with an unchanged route table.

An earlier revision of this section claimed a "739 → 726 emitted selectors"
count. **That figure has been removed because it could not be reproduced** —
neither top-level rule counts (118 before, 118 after), total braces (852), nor
comma-split selector tokens yield it under any standard definition. The
byte deltas and the named 13 selectors above are reproducible and are what the
section now rests on.

**This is a project-level configuration change, not an elevation change, and
it is the one edit in this unit that a reviewer should look at hardest.** It
is a net removal of dead CSS and it makes the compiled stylesheet an honest
record of the app, but it also means **any class literal that appears only in
a test file no longer emits a utility.** No such dependency exists today —
every class the app renders is in a `.tsx`. If the orchestrator prefers to
revert it, the alternative is to split the guard's fixture strings so
Tailwind's raw-text scanner cannot see them, which is strictly worse: it leaves
the same landmine for the next test file.

### W7 Citation Drift — the 12-site map did not describe the code

Task 5.2 named 12 sites. Measured against the tree, the map was wrong in five
distinct ways. Counting units are declared once, as in §W4 Citation Drift: a
**citation** is one `(file, line)` pair as the task writes it.

| Defect | Count | Detail |
|---|---|---|
| Citations that resolved as written | **4** | `StaffKpiRow:73`, `StatusFilterChips:83`, `StatusFilterChips:86`, `DiscrepancyPanel:267` |
| Citations off by one | **3** | `ProductCard:70` → the class is at **L71**; `cart:145` → the surface is at **L146**; `products/[id]:119` → the surface is at **L120** |
| Citations naming a non-surface | **5** | `page:277`, `orders:446`, `orders/[id]:568`, `products:373` are all `ring-1 ring-outline-variant` — Bucket B rings from task 3.3, not shadows. `cart:145` and `products/[id]:119` name the line *above* the surface: a `md:col-span-2` grid wrapper and a `<Skeleton>` |
| Real `shadow-*` usages omitted from the task | **4** | `app/page.tsx:179` + `:180`, `app/products/page.tsx:258/259/276/277` (the four "ring" citations were standing in for these), `Navbar.tsx:115` (`shadow-lg`), and `orders/page.tsx:121` |

**The two `cart` / `products/[id]` off-by-one citations were the dangerous
ones.** The task's line numbers pointed at a `md:col-span-2` wrapper and a
`<Skeleton>`. Applying the map literally would have put a card shadow on a
layout grid and on a loading placeholder, and the guard's per-file counts
would have been written to match the wrong element.

**Root cause, stated rather than guessed.** Eight of the twelve citations are
Bucket B ring citations imported from task 3.3. The map was assembled from
the *boundary* list rather than measured from `shadow-*`, so it inherited that
list's off-by-one drift and never saw the two `orders/[id]` shadows at all. The
corrected map is a measurement; the original was a transcription.

**Corrected final site list: 18 sites across 12 files**, in the `tasks.md:5.2`
table. 14 converted 1:1, 4 added to surfaces that had no shadow
(`ProductCard:71`, `cart/page.tsx:146`, `products/[id]/page.tsx:120`,
`ui/card.tsx:14`).

**Two judgment calls, both orchestrator decisions, applied as given:**

1. **`Navbar.tsx:115` → Level 2 by maintainer decision.** The navbar also
   carries a hardcoded `bg-[#1a1a1a]`, left **untouched** — this change is
   elevation only, and repointing a background belongs to a unit that names it.
2. **`orders/[id]:278` → Level 1, not Level 0.** The 32px timeline step dot is
   a circle, not a surface. Level 0 is `none`, so it would have had no
   separation from the timeline rail at all. It takes Level 1 because it sits
   *inside* the Level 1 card at L251 and its shadow exists to separate it from
   that rail; a level above its container would be incoherent.

### W7 Unmeasured-usage sweep — nothing else was found

The guard scans all 37 `.tsx` files under `app/` and `components/`, so its
clean result is itself the sweep: **after the migration, zero stock `shadow-*`
usages exist anywhere in those two trees**, and the level usage count is
exactly 18 with the per-file split pinned. `lib/` was **not** swept — the task
scoped the invariant to `app/` and `components/` — but it holds **3** `.tsx`
files and a full-tree grep finds **zero** `shadow-*` in any of them, so the
omission is currently harmless. `lib/` is a plausible future home for a
shadowed primitive; extending the walk to it is a one-line change if the
orchestrator wants the boundary widened.

21. **W7 deviation — task 5.2's 12-site map does not describe the code, and 18 sites were migrated.** Only 4 of the 12 citations resolved as written; 3 were off by one; 5 named a non-surface; and 4 real `shadow-*` usages were omitted, two of them in `app/orders/[id]/page.tsx`. Root cause: eight of the twelve citations are Bucket B ring citations imported from task 3.3, so the map was transcribed from the boundary list rather than measured from `shadow-*`. Full reconciliation under §W7 Citation Drift. **Two of the citations would have caused visible damage if applied literally** — `cart:145` is a `md:col-span-2` grid wrapper and `products/[id]:119` is a `<Skeleton>`; both would have received a card shadow. `Navbar.tsx:115` was not in the task at all.
22. **W7 deviation — 446 authored lines against a ~16 forecast (28×), and this time the 400 review budget is breached.** 51 lines are production (17 `globals.css`, 34 class lines across 11 `.tsx`) and 395 is the new guard. W4 deviation 15 predicted this exactly: *"a negative constraint is worth zero lines in a production-line forecast."* Unlike W1–W6, W7 exceeds both the 250 attempt ceiling **and** the 400 review budget, by 46. **This needs a `size:exception` against the review budget, not only the attempt ledger.** The `tasks.md` forecast row has been corrected.
23. **W7 deviation — one line of project configuration was changed, outside the elevation scope.** `@source not "../tests";` in `frontend/app/globals.css`. Tailwind v4's automatic content detection scans `frontend/tests/**`, so the new guard's own fixture strings and docblock examples were being compiled into the production stylesheet as dead CSS — 9 stock shadow rules, 3 display rules, **3,031 bytes**, from no `.tsx`. The migration alone would have left the compiled-CSS evidence this unit depends on unreadable. Full before/after accounting under §W7 Test-Directory Content Scan, measured across two real builds: **69,358 → 66,327 bytes**, all 13 removed rules named, none referenced by any `.tsx`. **This is a project-level change, not an elevation change**, and the orchestrator should confirm it. Its standing consequence: a class literal that appears **only** in a test file no longer emits a utility. No such dependency exists today.
24. **W7 discovery — `--shadow-level-3` is registered but never emitted into the shipped stylesheet, so the compiled CSS cannot evidence it on its own.** Tailwind tree-shakes the theme to the utilities actually consumed, and nothing consumes Level 3. Measured, not assumed: in the shipped build `0tx0p9w3y3gc3.css` only `shadow-level-0/1/2` are present; in a probe build with `@source not "../tests"` removed, `.shadow-level-3` appears at offset 35562 carrying `0px 16px 36px -6px var(--tw-shadow-color,#0f172a2e)` — byte-identical to the design source. W6 recorded the same behaviour for `--text-display-hero`, `--text-body-sm` and `--text-label-md`. **A verify report claiming all four levels appear in the shipped CSS is wrong**, and this artifact does not make that claim; it makes the narrower, provable one.

## Verification Limits (carried forward)

jsdom does not apply Tailwind's compiled output and `@theme` is build-time only. Nothing in this unit is browser verification. The radius swaps and elevation utilities in W6–W8 remain proven by build success plus manual inspection, never by computed style. Every verify report must restate this.

**W6 extended this rather than escaping it.** Reading the compiled production stylesheet is still not browser verification — it proves which declarations were *emitted* and in what order, not what a user sees painted. It is strictly more than a green build, and it is what caught the cascade finding in §W6 Cascade Finding, which `npm run test` and `npm run build` both passed straight through. The `npm run dev` harness stays `N/A` for the reason already recorded: no browser is available, and no artifact in this repository may stand in for one.

## Open Items for the Orchestrator

- **Stage the new file before settling.** `frontend/tests/control-border.test.ts` is **untracked**, and this attempt's untracked exclusion covers only the 8 `openspec/changes/frontend-design-system-followups/**` planning artifacts. The new test therefore changes the untracked inventory, and a `settle` may reject the attempt as `untracked inventory changed` — the same condition W2 hit. `git add frontend/tests/control-border.test.ts` before settling so the measurement sees it as part of W4's diff. **This is now load-bearing twice:** the file is 159 of W4's 195 changed lines, so staging it changes the measured total, not just its classification.
- **The `npm run dev` visual harness was not performed for W1, W2 or W4**; all three need a browser. For W4 the expected delta is a real, user-visible one — 15 control boundaries darken from `#c4c5d5` (1.218:1) to `#757684` (3.198:1) — so unlike W1 and W2 this is **not** a nil-delta claim that a build can stand in for. `sdd-verify` should treat the visual check on `/login`, `/checkout` and `/profile` as genuinely open, not discharged by the 65/65 suite.
- `openspec/changes/frontend-design-system-followups/` is still **untracked**. The prior SDD phases wrote those planning lines but never committed them. They were deliberately excluded from the W1 commit to keep the work unit focused; committing them belongs to a separate docs commit.
- Design §"Spec Placement Notes" archive-order questions remain open and untouched, as instructed. `frontend-vibrant-redesign` was not modified.
- `tasks.md:88`'s W2 rollback boundary is incomplete — it omits `frontend/tests/contrast.test.ts`. Corrected in `tasks.md` alongside the measured line count; see deviation 9.
- **`tasks.md:89`'s W4 row is now corrected**, matching the treatment W2's row already received at `tasks.md:88`: the authored-lines cell reads the measured **195** (decomposed under Deviation 15) instead of the `~17` forecast, and the rollback-boundary cell now names `frontend/tests/control-border.test.ts` and `frontend/tests/contrast.test.ts`. Nothing about W4 is deferred.
- **`frontend/tests/control-border.test.ts:18` contains one wrong word — deferred, not fixed.** It says `button.tsx:6` is "three lines above" the site task 3.2 cites; task 3.2 cites `button.tsx:12`, so it is **six** lines above. This re-run's brief forbids touching source files, and the attempt is at 195 of 200, so the correction is left for the orchestrator. It is a comment only — the guard's behaviour and all 65 tests are unaffected. See deviation 16.
- **W8's radius-ramp line reference moved again.** Tasks 2.3 (`tasks.md:40`) and 6.2 (`tasks.md:54`) both cite `frontend/app/globals.css:150-156`; W2's registrations moved it to 156–162 and **W4's two declarations moved it to 160–166** (measured on disk: `--radius-sm` at L160 through `--radius-4xl` at L166). The values are byte-identical and still asserted by the W2 suite; only the line numbers were stale. **Both citations are now corrected to `:160-166`** — note the earlier revision of this item said only task 6.2 needed it, which understated the defect: task 2.3's own text carried the same stale range. W6 and W7 will move it again, so the durable fix is to cite the ramp by content (`--radius-sm`…`--radius-4xl` inside `@theme inline`) rather than by line.
- **`tasks.md:44` cites `app/checkout/page.tsx:59, 397`; the sites are at L60 and L398.** Noted inline on the task. Every other Bucket A citation in the change resolved exactly.
- **`tasks.md:45`'s "25 Bucket B dividers" does not exist as enumerated.** 27 entries / 33 line references; of the 33, **14** are `border-*` boundaries on the `#c4c5d5` value and **19** are not, and **12 line references across 9 entries** carry no `--outline-variant` class in any form. Full reconciliation, citation by citation, under §W4 Citation Drift. The code is correct; the artifact text is not.
- **Stage the new W6 file before settling.** `frontend/tests/typography-scale.test.ts` is **untracked**, and it is **208 of W6's 245 changed lines** — so staging it changes the measured total, not just its classification. W4 hit the same wall with `control-border.test.ts` and the same `untracked inventory changed` rejection. `git add frontend/tests/typography-scale.test.ts` before settling.
- **RESOLVED 2026-09-29 - `text-label-lg` / `text-label-badge` are no longer out-cascaded.** The maintainer chose *deleting the stock step* over *moving the scale step after it*, because the second is not expressible: Tailwind v4 orders `@layer utilities` alphabetically by class name and offers no author-side reordering lever. `text-sm` was removed from `ui/button.tsx` and `text-xs` from `ui/badge.tsx`; the design's 14px/18px and 11px/14px are now reached, and the `size="xs"` / `size="sm"` variants were verified to still out-sort the base step. A guard now fails if either base list regains a competing font-size utility. Before/after offsets in the Cascade Finding's Resolution subsection.
- **The `npm run dev` visual harness remains unperformed for W1, W2, W4 and W6.** For W6 the expected delta is **not** nil: Inter is newly applied to every button and badge, and the font-size question in §W6 Cascade Finding is exactly the kind only a browser settles. A green 111/111 suite plus a green build is **not** a substitute, and nothing in this artifact should be read as one.
- **"236" appears in `spec.md:13` and `tasks.md:50` and is not reproducible.** Six counting definitions were measured and none yields 236; see §W6 Count Corrections for the figures and their units. Correct both before `sdd-verify` reads the requirement literally.
- **The `--radius-*` ramp line span has now moved four times** (`150-156` → `156-162` after W2 → `160-166` after W4 → `193-199` after W6), and W7 will move it again. `tasks.md`'s two citations no longer name a line span at all — they name the tokens `--radius-sm`…`--radius-4xl` inside `@theme inline`, which is the durable form. **This is now applied, not deferred.**
- **W4's open item on `frontend/tests/control-border.test.ts:18` is now harmless in practice** but still wrong: it says `button.tsx:6` is "three lines above" the site task 3.2 cites, and `12 − 6 = 6`. W6 edited `button.tsx:6` as instructed and the guard passed regardless, which is the point the comment is making. One word remains wrong in a comment; the orchestrator may fold it into the next unit that touches that file.
- **Stage the new W7 file before settling.** `frontend/tests/elevation-scale.test.ts` is **untracked**, and it is **395 of W7's 446 changed lines** — so staging it changes the measured total, not just its classification, exactly as W4's and W6's new test files did. W2, W4 and W6 each hit the `untracked inventory changed` rejection for this reason. `git add frontend/tests/elevation-scale.test.ts` before settling.
- **W7 needs a `size:exception` against the 400 review budget**, not only the attempt ledger: 446 authored lines against a ~16 forecast is 28× and breaches the 400 budget by 46. This is the first unit where the *review* budget is at risk rather than only the attempt ceiling. See deviation 22 and the corrected `tasks.md` forecast row.
- **W7 needs a maintainer decision on `@source not "../tests";`.** It is a project-level content-scan change wearing an elevation diff, and the orchestrator should confirm it rather than inherit it. See deviation 23 for the before/after accounting and for the standing consequence (a class literal that appears only in a test file no longer emits a utility).
- **W7 visual verification is outstanding and cannot be closed in this environment.** No browser is available, so nothing in this unit observed a rendered shadow, a computed style, or a pixel. The compiled stylesheet is evidence about *emission*, not *paint*. `sdd-verify` should either run the `npm run dev` harness against `/`, `/cart` and a product page, or record the gap explicitly. This is now the fourth unit carrying that item.
- **W7's Level-3 compiled-CSS claim is unprovable as the task wrote it.** Task 5.1 asked for confirmation that the built stylesheet contains `.shadow-level-0..3`; it cannot, because nothing consumes Level 3 and Tailwind tree-shakes it. Proven from a probe build that `.shadow-level-3` does compile, at offset 35562, carrying the design's exact value. See deviation 24 and §W7 Cascade Order. **What the shipped stylesheet proves is `shadow-level-0/1/2` plus `hover:shadow-level-1`, and that zero stock shadow rules survive. A verify report must not claim all four levels appear in the shipped CSS.**
- **An unreproducible number was removed from this artifact rather than shipped.** An earlier revision recorded the `@source not` fix as "739 → 726 emitted selectors". No standard counting method reproduces either figure — top-level rules, total braces and comma-split selector tokens all disagree. The named 13 removed rules and the 69,358 → 66,327 byte deltas are reproducible and are what the section now rests on. **No figure in this artifact should be treated as verified unless it can be re-measured from the tree.**
- **The W7 guard's `baseCounts` helper was folded into a stronger assertion.** An earlier revision pinned the per-file counts with a `Record` equality test that duplicated the `it.each` map. It is replaced by one test that proves the map's values sum to the tree total *and* that no file outside the map holds a level token — strictly more coverage, fewer lines. The map itself is unchanged, so no `tasks.md` citation moves.
