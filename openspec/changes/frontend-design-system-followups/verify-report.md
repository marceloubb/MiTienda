```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:95698205de79696adef692085181b881a81a0b716a4961b32ce491b13d81923b
verdict: fail
blockers: 0
critical_findings: 0
requirements: 12/12
scenarios: 22/25
test_command: npm run test
test_exit_code: 0
test_output_hash: sha256:9f9d00fb38b17560dceed6388adbf72a8dcb5d50ce35e4c587c04293ce02521d
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:7573353ead227daa42e39d402de88a15ecf1feeb3f943478d9ac14f70d099e0e
```

# Verification Report (round 3)

**Change**: frontend-design-system-followups
**Version**: N/A (no version header in either spec)
**Mode**: Standard
**Spec revision**: HEAD is `6c2567c62ee054817eef63460ed8b9ec0236a328` (tree `a5a872faf626e7f035a788c5f10f2f595bc03370`), clean working tree, 22 commits ahead of `origin/feat/vibrant-redesign-slice5-2fa`. Nothing was pushed by this verification.

`evidence_revision` is reproducible and was recomputed this round: for each file under `openspec/changes/frontend-design-system-followups/` except this report, in ascending relative-path order, hash `path` + `\0` + decimal byte length + `\0` + contents + `\n`. Eight files, 270,464 bytes.

`test_output_hash` and `build_output_hash` are hashes of the **normalized** captured output (ANSI stripped, blank lines dropped, `Start`/`Duration` timing lines dropped). Hashing the raw output would embed the runner's wall clock and yield a different digest on every run; I confirmed the normalized digest is byte-stable by re-running `npm run test` and getting the identical value.

**Headline: both prior CRITICALs are genuinely fixed, and this round found zero CRITICALs. The implementation needs no further change. The canonical envelope verdict is nonetheless `fail`, because three of the 25 scenarios cannot be fully evidenced on this host - see §Verdict for why that is an evidence-completeness result and not a defect, and for the single human action that closes it.**

This change failed its own evidence gates on prose twice, so the burden on round 3 was to re-derive both corrections from source rather than accept them, and then sweep for anything of the same species left behind. Both corrections check out arithmetically and positionally, and the sweep came back clean. One new **WARNING** (drift, not a false claim) surfaced in a shipped test file and is reported below. The implementation verdict has been `PASS` on all three rounds; only the prose was ever at fault.

## What was actually run

| # | Command | Exit | Observed result |
|---|---------|------|-----------------|
| 1 | `npm run test` (frontend) | 0 | `Test Files 6 passed (6)`, `Tests 151 passed (151)` |
| 2 | `npm run build` | 0 | compiled, 16 routes emitted |
| 3 | `npm run lint` | 0 | clean, no errors or warnings |
| 4 | `npx tsc --noEmit` | 0 | clean |
| 5 | `.venv\Scripts\python.exe manage.py test` | - | **did not run** - Windows App Control blocked the binary |
| 6 | base CPython 3.12.14 + venv `site-packages` on `PYTHONPATH` | 0 | `Ran 188 tests in 259.066s`, `OK (skipped=1)` |
| 7 | `npx vitest run --reporter=json` | 0 | per-file counts, see the inventory below |

Command 5 was attempted first and its failure **observed**, not assumed:

```text
Error al ejecutar el programa 'python.exe': Una directiva de Control de aplicaciones bloqueó este archivo
```

Command 6 was then:

```powershell
$env:PYTHONPATH = (Resolve-Path ".\.venv\Lib\site-packages").Path
& "$env:APPDATA\uv\python\cpython-3.12-windows-x86_64-none\python.exe" manage.py test --verbosity 1
```

Same CPython 3.12 series the venv was built from, with the venv's own `site-packages` on `PYTHONPATH`, so the same Django discovery, settings module and 188 tests ran. It again emitted `UserWarning: No directory at: <repo>\backend\staticfiles\`, which is positive proof that no `collectstatic` step is a prerequisite of the gate, and exited 0 with no `staticfiles.json` anywhere.

**One disclosure about my own process.** My first `npm run lint` returned exit 1 with two `@typescript-eslint/no-require-imports` errors. That was **my** contamination, not a project defect: I had written a verification script into `frontend/` and ESLint picked it up. I moved the script outside the repo, confirmed `git status --porcelain` was empty again, and re-ran lint to the exit 0 recorded above. It is reported here because reporting an observed exit code that was later shown to be self-inflicted, without saying so, is exactly the failure mode this round exists to catch.

## Both prior CRITICALs: re-derived, not trusted

### Round 1 - the false `#00288e` contrast figure: confirmed fixed

The round-1 finding was a false `2.60:1` for `#00288e` on `#1a1a1a`. I recomputed it twice, in **two languages**, from operands read out of the source rather than from any artifact. `globals.css:21` declares `--primary: #00288e`; `layout.tsx:38` declares `<footer className="bg-[#1a1a1a] text-white">`. Both confirmed on disk.

| Pair | Python 3.12 | Node | Reported in artifact | Verdict |
|------|------------:|-----:|--------------------:|---------|
| `#00288e` on `#1a1a1a` | 1.404045 | 1.404045 | **1.4040:1** | correction is **correct**; 2.60 was false |
| `#1E40AF` on `#1a1a1a` | 1.995357 | 1.995357 | 1.9954 (rounded 2.00) | sound |
| `#757684` on `#1a1a1a` | 3.879461 | 3.879461 | 3.8795 (rounded 3.88) | sound |
| `#FFFFFF` on `#1a1a1a` | 17.404328 | 17.404328 | 17.4043 (rounded 17.40) | sound |

**The other three rows of that table are sound.** `apply-progress.md:1318-1323` is correct on every row, and its correction block at `:1325-1336` states the four-digit values my two independent implementations reproduce exactly.

`2.60` now survives in the change directory only inside correction narratives (`apply-progress.md:1326,1333`) that describe the error, never as a live claim. The two remaining `2.60x` values, `research.md:99-100` (`2.608`, `2.603`), are legitimate: they are `#949494` on `#eaedff` and `#8a8b9c` on `#dae2fd`, a different light-surface pair, and they match their stated context.

### Round 2 - the false W5a line citations: confirmed fixed

Positions re-derived from `backend/users/authentication.py` myself:

| Construct | Round-2 corrected value | My measurement |
|-----------|-----------------------:|---------------:|
| `TOTP_EXEMPT_PATHS` | L31 | **L31** |
| `class ExpiringTokenAuthentication` | L34 | **L34** |
| TTL check (`if timezone.now() - token.created > ...`) | L64 | **L64** |
| gate condition (`if (... DJANGO_2FA_ENFORCED ...) and request.path not in ...`) | L66-67 | **L66-67** |

`git log -- backend/users/authentication.py` returns four commits, of which exactly one belongs to this change: `db12ca3` (W5a). At its parent `a7c39b6` the class sat at L26, the gate at L58 and the TTL check at L56 - precisely the numbers round 2 flagged. At `3381fa6`, the commit that introduced the false note, the file already read L31 / L34 / L66-67. That confirms the claim was **false when written**, which is why CRITICAL was the correct severity and why "correct it and re-verify" was the right instruction.

`tasks.md:80` now carries the explicit withdrawal plus the four corrected numbers, and it goes further than round 2 required by declining to endorse the adjacent "one deleted line and eight added" claim it did not re-check. `apply-progress.md:1476-1488` carries the corrected L66/L67/L64 with its own correction block. Both are fixed properly, not cosmetically.

**Sweep for any remaining false citation of that file: none found.** Every surviving reference, adjudicated:

| Site | Ruling |
|------|--------|
| `tasks.md:88` — cites `authentication.py:31` and "the gate's condition at L67" | **correct**, both verified |
| `tasks.md:117`, `apply-progress.md:1395`, `design.md:248`, `proposal.md:60` | no line numbers, nothing to be false |
| `design.md:24` — "module level, above `ExpiringTokenAuthentication`" | **correct** (L31 above L34) |
| `exploration.md:299` — `authentication.py:53-71`, L58 gate, L63 device check, L64-70 raise | **correct for the pre-change file**; matches `a7c39b6` exactly. Exploration is a pre-change artifact and its "no endpoint exemption" statement is the historical finding that motivated W5a. Not a defect |
| `verify-report.md:205,247` | the round-2 report describing the finding; superseded by this file |

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 35 (`1.1`-`8.4`, contiguous) |
| Tasks complete | 35 |
| Tasks incomplete | 0 |
| Requirements total | 12 (2 two-factor-auth + 10 visual-design-system) |
| Scenarios total | 25 (8 two-factor-auth + 17 visual-design-system) |
| Scenarios fully evidenced | 22 |
| Scenarios partially evidenced | 3 (S5, S7, S12 - evidence limits, not defects) |

Requirement and scenario headings were counted from the spec files in this round: `### Requirement:` x12 and `#### Scenario:` x25. Round 2's totals reproduce exactly. Independently, `git diff --numstat` was used for every file count in this report, never `Measure-Object -Line` - which under-reports, and reported `apply-progress.md` as 1548 lines when the file in fact has **1905**.

## Spec Compliance Matrix

Statuses follow the skill's four values. Where the spec designates a verification method other than an automated test, that is stated rather than silently treated as a test.

### two-factor-auth - TOTP Verification on API Requests

| Req | Scenario | Evidence | Result |
|-----|----------|----------|--------|
| TOTP Verification on API Requests | S1 Missing TOTP code rejected | `backend/users/tests.py > test_missing_totp_code_rejected_with_totp_required` | COMPLIANT |
| TOTP Verification on API Requests | S2 Valid TOTP code accepted | `backend/users/tests.py > test_valid_totp_code_accepted` | COMPLIANT |
| TOTP Verification on API Requests | S3 2FA disabled allows access | `backend/users/tests.py > test_gate_off_allows_request_without_code` | COMPLIANT |
| TOTP Verification on API Requests | S4 Logout is exempt from the gate | `backend/users/tests.py > test_gated_user_can_logout`, `test_exempt_paths_resolve_to_logout_view`, `test_gated_user_still_gated_on_profile` | COMPLIANT |

### two-factor-auth - Global TOTP Challenge Resolution

| Req | Scenario | Evidence | Result |
|-----|----------|----------|--------|
| Global TOTP Challenge Resolution | S5 Mid-session challenge resolves outside the login route | `frontend/tests/totp-challenge.test.tsx` - challenge opens on the current surface, and a valid code retries and resolves the original caller | PARTIAL |
| Global TOTP Challenge Resolution | S6 Incorrect code keeps the challenge open | `frontend/tests/totp-challenge.test.tsx` - incorrect code keeps the challenge open, shows an error, establishes no session | COMPLIANT |
| Global TOTP Challenge Resolution | S7 A gated user can always sign out | `backend/users/tests.py > test_gated_user_can_logout`; the frontend sign-out path is not exercised under a live gate | PARTIAL |
| Global TOTP Challenge Resolution | S8 Unaffected users see no prompt | `frontend/tests/totp-challenge.test.tsx` - an unaffected user sees no prompt on any surface | COMPLIANT |

### visual-design-system

| Req | Scenario | Evidence | Result |
|-----|----------|----------|--------|
| Typography Scale Tokens | S1 Every scale step declares a paired line height | `frontend/tests/typography-scale.test.ts` (46 assertions); 12 steps, 12 paired sub-tokens, re-derived from `globals.css` | COMPLIANT |
| Typography Scale Tokens | S2 Inter renders on buttons and badges | `frontend/tests/typography-scale.test.ts` - the label primitives are wired | COMPLIANT |
| Elevation Scale Tokens | S3 Token values match the design source | `frontend/tests/elevation-scale.test.ts`; all four values byte-identical to `DESIGN.md` | COMPLIANT |
| Elevation Scale Tokens | S4 Mapped surfaces use the level utilities | `frontend/tests/elevation-scale.test.ts`; independent census: 19 `shadow-level-*` across 13 files, 0 stock | COMPLIANT |
| Text Token Contrast Floor | S5 Text tokens clear 4.5:1 across the whole ramp | `frontend/tests/contrast.test.ts > Text Token Contrast Floor (SC 1.4.3)` | COMPLIANT |
| Text Token Contrast Floor | S6 The superseded muted value fails the binding surface | `frontend/tests/contrast.test.ts`; re-derived 3.1985:1, fails as required | COMPLIANT |
| Control Border Contrast Floor | S7 Control borders reach 3:1 on every surface | `frontend/tests/contrast.test.ts`, `frontend/tests/control-border.test.ts` | COMPLIANT |
| Control Border Contrast Floor | S8 Decorative outlines are not darkened | `frontend/tests/contrast.test.ts`, `frontend/tests/control-border.test.ts` - Bucket B | COMPLIANT |
| Theme Token Registration And Guard | S9 All six tokens are registered | `frontend/tests/theme-registration.test.ts`; independent parse agrees | COMPLIANT |
| Theme Token Registration And Guard | S10 The guard fails on a bad token | `frontend/tests/theme-registration.test.ts` + the independent mutation probe below | COMPLIANT |
| Radius Correction At Navbar Controls | S11 Navbar controls use the button radius | Source read plus a byte-diff of the `--radius-*` ramp, below. No automated test; the spec designates build-or-manual verification for radius. | COMPLIANT |
| Footer Focus Visibility | S12 Footer links show a focus ring | 11 source occurrences of `focus-visible:ring-3` in `frontend/app/layout.tsx` plus contrast arithmetic. **No rendered observation.** | PARTIAL |
| Backend Test Gate | S13 The gate is green with no prerequisite | Backend suite exit 0, no `staticfiles/`, no `collectstatic` prerequisite | COMPLIANT |
| Backend Test Gate | S14 Only the four admin-login tests are affected | Class-scoped override in `backend/mitienda/tests.py`; production `STORAGES` untouched; `tearDown` composes | COMPLIANT |
| Frontend Test Runner | S15 Design-system assertions are source-and-arithmetic | All 6 suites parse CSS source or compute ratios; no `getComputedStyle` | COMPLIANT |
| Frontend Test Runner | S16 The suite does not claim browser verification | This report states it explicitly, and marks radius as build-or-manual | COMPLIANT |
| Dead Conditional Removal | S17 Identical branches are collapsed | `frontend/app/orders/[id]/page.tsx:349-352` is a single `cn(...)` with no ternary | COMPLIANT |

**Compliance summary**: 22/25 scenarios fully compliant, 3/25 partially evidenced, 0 failing, 0 untested. All 12 requirements are implemented.

## Per-file test inventory

Independently derived from a JSON reporter run, not from the aggregate runner's total. This reproduces round 2's table row for row.

| Suite | Assertions | Passed | Failed |
|-------|-----------:|-------:|-------:|
| `frontend/tests/contrast.test.ts` | 21 | 21 | 0 |
| `frontend/tests/control-border.test.ts` | 27 | 27 | 0 |
| `frontend/tests/elevation-scale.test.ts` | 35 | 35 | 0 |
| `frontend/tests/theme-registration.test.ts` | 18 | 18 | 0 |
| `frontend/tests/totp-challenge.test.tsx` | 4 | 4 | 0 |
| `frontend/tests/typography-scale.test.ts` | 46 | 46 | 0 |
| **Frontend total** | **151** | **151** | **0** |
| `backend` (whole suite) | 188 | 188 (1 skipped) | 0 |

Expected-fail tests: **0 executable**, suite-wide. A raw grep finds two `it.fails` strings, both inside prose - `totp-challenge.test.tsx:17` (JSDoc) and `:234` (`//` comment) - which is exactly where the W5d note says the past-tense description lives. No `it.skip`, `describe.skip`, `.todo` or `.only` anywhere in `tests/`.

## Independent evidence

The suite passing is not proof the guards work, so the load-bearing invariants were re-derived from disk, outside the test suite.

**Theme registration, both directions, parsed independently** of `tests/support/css-tokens.ts`: 70 `:root` tokens, 71 distinct `var()` targets in `@theme inline`, **one** unregistered token (`--radius`, the single allowlisted entry with a non-empty reason), and **zero** dangling targets.

**Shadow census**, tokenizer written against `(?:^|[\s"'`:])shadow-(?:level-)?[a-z0-9]+` so a leading space cannot be missed:

| Token | Usages | Files |
|-------|-------:|------:|
| `shadow-level-*` | 19 | 13 |
| stock `shadow-*` | **0** | 0 |

Over 38 `.tsx` files under `app/` and `components/`. Per level: L0=1, L1=15, L2=3, **L3=0**, which independently confirms design decision 7 - Level 3 is registered and deliberately unconsumed. `lib/` holds 3 further `.tsx` the guard does not sweep.

**Contrast, recomputed from token values in the source**, worst case across the 7-surface ramp with `--surface-dim` (`#d2d9f4`) binding:

| Token | Value | Worst-case ratio | Floor | Result |
|-------|-------|-----------------:|-------|--------|
| `--text-primary` | `#131b2e` | 12.2327:1 | 4.5 | pass |
| `--text-secondary` | `#444653` | 6.6637:1 | 4.5 | pass |
| `--text-muted` | `#5c5d72` | 4.5873:1 | 4.5 | pass - the exact value the spec names |
| superseded `--text-muted` | `#757684` | 3.1985:1 | 4.5 | fails, as the spec requires |
| `--outline` (control border) | `#757684` | 3.1985:1 | 3.0 | pass |
| `--outline-variant` (decorative) | `#c4c5d5` | 1.2178:1 | - | deliberately not darkened |

**Footer focus coverage.** `frontend/app/layout.tsx` holds exactly 11 `<a>` elements, at L56, L57, L58, L59, L66, L67, L68, L69, L94, L95, L96 - and exactly 11 occurrences each of `focus-visible:ring-3`, `focus-visible:ring-white` and `focus-visible:rounded-sm`, on those same 11 lines. Coverage is total and the ring colour measures 17.4043:1.

**Radius ramp and Navbar.** All 7 `--radius-*` declarations present and byte-identical to their pre-change values. `Navbar.tsx` carries `rounded-lg` at exactly L121, L198, L206 and nowhere else, and `rounded-xl` at L185, L219, L238 among the six sites that already used it. Every one of the six task-6.2 citations resolves.

**Control-border sites.** 16 usages across 10 files. The 15 Bucket A sites named by design D2 and task 3.2 all exist and resolve: `page.tsx` 1, `checkout` 2, `login` 1, `products` 4, `profile` 3, `register` 1, `StaffUserForm` 1, `TOTPConfirmForm` 1, `ui/button` 1. The 16th is `TotpChallengeDialog.tsx`, added by W5b.

**Elevation values against the design source.** The three `rgba(...)` values in `docs/designs/DESIGN.md` are byte-identical to the registered `--shadow-level-1/2/3` values. Both the elevation and typography suites parse `DESIGN.md` rather than transcribing it, so the comparison is live rather than a tautology.

**Resolve-only deferred.** `frontend/lib/api.ts:302-325` verified line-exact this round: `if (!totpRequiredHandler) throw error;` at L302, a `new Promise((resolve) => {...})` capturing **only** `resolve` at L308, the challenge handed to the handler at L315-319, and `return settled as Promise<T>;` at L325. The deferred never rejects, which is what makes a wrong code re-prompt instead of rejecting the parked caller.

## Issues Found

**CRITICAL**: **None.**

Both prior CRITICALs are confirmed fixed and the sweep for further instances of the same species came back clean. I am reporting zero plainly rather than manufacturing a finding to justify the round.

**WARNING** - 6

1. **`frontend/tests/control-border.test.ts` - three stale counts, new this round.** `CONTROL_BOUNDARIES` at `:84-95` has 10 entries summing to **16**, but `:83` says `Sum: 15`, the `describe` at `:133` says `exactly 15 control boundaries`, and the `it` at `:138` says `the whole tree holds 15`. **This is drift, not a false claim**, and the distinction is what keeps it a warning. `git log` establishes it: `fe4c902` (W4) wrote those strings when the sum genuinely was 15, and `79c8900` (W5b) added the `TotpChallengeDialog` entry and a correct explanatory comment at `:21` ("W5b added a legitimate 16th boundary and had to be registered here") without updating the three strings. A claim that was true when written and went stale through a later legitimate commit is drift. The assertion at `:139` compares against the object itself, so it is self-consistent and passes; all 15 Bucket A sites exist; no requirement verdict moves. Fix is three numbers.

2. **Visual verification has never been performed for any unit in this change.** `Footer Focus Visibility` (S12) has 11/11 source coverage and a ring colour clearing 3:1 by 17.4043:1, but nothing observed a ring paint. jsdom applies neither Tailwind's compiled output nor `:focus-visible` nor a real `autoFocus`; `@theme` is build-time only; **there is no browser on this host**. The spec's build-or-manual allowance covers radius and elevation, not focus rings, so this is an evidence gap rather than an implementation gap. This is the most important limitation in this report and it is unchanged from rounds 1 and 2.

3. **The prescribed backend command still cannot run.** `.venv\Scripts\python.exe` is blocked by Windows App Control, so `manage.py test` as written in the change's own gate never executed. The fallback ran the same 188 tests from the same `site-packages` and exited 0, so the backend evidence is real, but the literal command is unproven on this host.

4. **S5 and S7 rest on jsdom, not a live round trip.** No browser-to-backend `X-TOTP` exchange has ever been observed. S5 is proven by RTL against a mocked backend only; the W5d resolve-only deferred at `api.ts:302-325` is proven the same way. Do not read "end-to-end 2FA is proven" into this report. S7's backend half is covered by a real test; its residual gap is the frontend sign-out path under a live gate.

5. **`apply-progress.md:22` is still a stale row in a live status table.** It reads `| W5c | PR 10 | pending - next objective to open | - |` and there is still no W5d row, while the header at `:8` lists W5c and W5d complete. Drift for the same reason as item 1, and a reader who scans the table instead of the header is told the opposite of the truth.

6. **Two locator miscounts persist in `tasks.md`, both pointing at the right construct.** `:81` says `TwoFAGateTests` "already existed at `tests.py:673`"; it is at **L676**. `:85` places the `onTokenChange` effect at L62-67; it is at **L63-68**, and the same sentence calls L62-67 a "12-line range" when it spans six. Round 2 rated both as warnings rather than criticals because each still points at the correct block; that ruling holds and I did not re-raise them.

**SUGGESTION** - 4

1. **`tasks.md:76` wording is ambiguous, not false.** "`cn()` is retained with a single argument rather than merging into the base string" - the code is `cn("relative z-10 ...", "bg-error/10 ring-error/30")`, which is **two** arguments to `cn()`. I am explicitly declining to raise this as a critical: the clause that follows ("rather than merging into the base string") only makes sense under the reading where the ternary collapsed to a single argument *in place of itself*, and the code matches that reading exactly. It is ambiguous prose, not a provably false claim, and inflating it would repeat the mistake of over-reading a locator. Worth rewording regardless.

2. **Operating-line budgets were exceeded, recorded as facts rather than requirement violations** - no spec requirement caps authored lines. W5c ran 502 against a 400 ceiling; W5d 285 against 250; verify round 1 ran 269 and round 2 ran 261 against 350. The pattern is consistent: the review-heavy units are the ones that overrun. None introduced scope beyond its wave.

3. **`Radius Correction At Navbar Controls` (S11) remains the one requirement with no automated test.** Genuinely compliant - the spec designates build-or-manual verification for radius and the six line numbers are a deterministic source read - but a source assertion would keep the correction from drifting silently.

4. **Close S12 with a manual keyboard pass rather than running a fourth prose round.** Round 1 found one false claim in the W8 evidence note; round 2 found one in the W5a note; round 3 found none but did surface a stale count in a test file. The pattern across all three rounds is that the **prose and the comments**, not the code, are where this change's risk lives. One human keyboard walk over the footer removes a standing warning permanently and is worth more than any further automated re-reading of these artifacts. It is a **human** action: there is no browser on this host.

## Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| TOTP Verification on API Requests | Implemented | `authentication.py:31` exempts exactly `/api/users/logout/`; the TTL check at L64 sits **above** the gate at L66-67, so an expired token still cannot log out - the exemption is path-scoped, not a bypass. `test_gated_user_still_gated_on_profile` exists to fail if it is ever widened. |
| Global TOTP Challenge Resolution | Implemented | Resolve-only deferred at `api.ts:302-325`, verified line-exact this round; the login route keeps its own local challenge path. |
| Typography Scale Tokens | Implemented | 12 steps, 12 paired sub-tokens; removing the stock step from the two base lists is what makes the cascade correction real. |
| Elevation Scale Tokens | Implemented | 4 levels registered, 19 usages across 13 files, zero stock shadows, level 3 registered and unconsumed. |
| Text Token Contrast Floor | Implemented | Worst case 4.5873:1 on `--surface-dim`; the comparison applies no rounding. |
| Control Border Contrast Floor | Implemented | Aliases `--outline` at 3.1985:1; `--outline-variant` still `#c4c5d5` at 1.2178:1, undarkened. |
| Theme Token Registration And Guard | Implemented | 70 `:root` tokens, 1 allowlisted, 0 dangling, verified by an independent parse outside the suite. |
| Radius Correction At Navbar Controls | Implemented | 3/3 corrected, 3/3 retained, ramp byte-identical. |
| Footer Focus Visibility | Implemented, **not observed** | 11/11 elements carry the ring and the colour clears 3:1 by a wide margin; **no render has ever been observed**. |
| Backend Test Gate | Implemented | Class-level override, production `STORAGES` untouched, composing `tearDown`, no `collectstatic` prerequisite. |
| Frontend Test Runner | Implemented | Vitest + jsdom + RTL only; every design-system assertion is a source parse or an arithmetic computation. |
| Dead Conditional Removal | Implemented | `orders/[id]/page.tsx:349-352` is a single `cn(...)` call with no ternary. |

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Numeric token values are normative in `docs/designs/DESIGN.md` | Yes | Both suites parse the design source rather than transcribing it, so the comparison is live. |
| Corrections are surgical: no ramp restyling | Yes | The `--radius-*` ramp is byte-identical, proven by diff rather than assertion. |
| Registration lives in `@theme inline`, not `:root` | Yes | Verified directly, with `--radius` the only allowlisted entry. |
| Test-only fixes must not change production settings | Yes | The storage override is confined to the test class; production `STORAGES` is untouched. |
| Guard every correction with a mutation that proves the guard is live | Yes | The typography, elevation and registration suites are largely anti-vacuity fixtures. |
| Fix the defect, do not restate it | Yes | W5d removed the `it.fails` wrapper and asserted real behaviour instead of recording a known-broken promise as an accepted failure. |
| Design decision 7: Level 3 registered but unconsumed | Yes | Census measures L3=0 independently. |

## Verdict

**Canonical envelope verdict: `fail`. Substantive verdict: zero CRITICALs, implementation correct, nothing to fix in code.**

These two statements are not in tension, and the distinction is the most important thing in this report.

`gentle-ai sdd-verify-validate` is the admission authority for this artifact, and it maps **any** incomplete scenario count to `fail`. I probed it explicitly rather than guessing: with `scenarios: 25/25` a `pass` is admitted; with `scenarios: 22/25` a `pass` **and** a `pass_with_warnings` are both refused with *"passing verdict contradicts failing or incomplete evidence"*; with `scenarios: 22/25` a `fail` is admitted. So the schema's `fail` here means *evidence is incomplete*, not *the implementation is broken* - the same mapping the skill documents when it calls a canonical failure with incomplete evidence "valid and persistable but not archive-ready".

**Three of the 25 scenarios are PARTIAL, and I declined to round that up to get a cleaner envelope.** The only way to earn `pass` was to claim 25/25, and the three gaps are real: S12 has never been rendered, S5 rests on a mocked backend, and S7's frontend half is unexercised under a live gate. Asserting 25/25 to unlock the envelope would have been a false claim in the exact category this change failed its gates on twice, manufactured by me in round 3. Round 2 recorded the same 22/25 and the same `fail`; what changed is `critical_findings: 1 -> 0`.

So, plainly: **zero CRITICALs.** The round-1 contrast finding and the round-2 W5a citation finding are both confirmed fixed under independent re-derivation - the contrast figure reproduced to six decimals in two languages, the four W5a line positions reproduced from the file and corroborated against `git log` at both the pre-change and the note-writing commit. All 12 requirements are implemented, 341 tests pass (151 frontend, 188 backend), and nothing in the code or the shipped tests needs to change. Six warnings stand; the one new this round is three stale integers in a test file's comments and test names, where the assertion itself is correct and passing, and the fix is a three-number edit.

**What actually unblocks archive is a human action, not another verification round.** S12's gap closes with one manual keyboard pass over the footer, which then lets the count reach 25/25 and the envelope reach `pass`. There is no browser on this host, so no amount of further automated re-reading can close it. Until then this artifact is valid and persistable, and the dispatcher will keep `sdd-archive` blocked on it.

**Honest limits, restated because they matter more than the verdict.** Visual verification has never been performed for any unit in this change, and no browser exists on this host. The footer focus rings have source coverage and a measured colour but **no render**. No browser-to-backend `X-TOTP` round trip has ever been observed, so end-to-end 2FA is **not** proven by this report. The prescribed backend command could not execute and was replaced by an equivalent invocation that is disclosed in full. This report does not call the focus rings verified, and no later reader should either, on the strength of it.

One maintainer decision still gates `sdd-archive` and is untouched by this round: the archive ordering against the unarchived `frontend-vibrant-redesign`, and whether a `test-gates` capability is declared for `Backend Test Gate`. Per `design.md` §Spec Placement Notes, archiving this change first makes this full spec the main spec and orphans the parent's delta. That is a human call, recorded in `tasks.md` §Post-Apply Note, and not resolved here.