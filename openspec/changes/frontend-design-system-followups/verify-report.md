```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:cef1aa577cf8b9b315b64521634163f162202da8c28e6d9c87502bda1c477e7f
verdict: fail
blockers: 0
critical_findings: 1
requirements: 12/12
scenarios: 22/25
test_command: npm run test
test_exit_code: 0
test_output_hash: sha256:ae98a3156e2dcc5a47ff4ba29d12b623f368e7b355678046a13df9f224848e7a
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:d84d13e734f5e12569441ee4d8bbd1d9bdbbb7eec828c4716c9f66e1b49f3edb
```

# Verification Report (round 2)

**Change**: frontend-design-system-followups
**Version**: N/A (no version header in either spec)
**Mode**: Standard
**Change ID**: 9aaeb979
**Spec revision**: proposal, design, tasks, apply-progress and both spec files are unmodified on disk; HEAD is `92b459134830244aebba49a264e11af8eb883883` (tree `ae891fe3cce63ff9eec51829daee477838b55fb8`) with a clean working tree. HEAD is 21 commits ahead of `origin/feat/vibrant-redesign-slice5-2fa`; nothing was pushed by this verification.

`evidence_revision` is reproducible: for each file under `openspec/changes/frontend-design-system-followups/` except this report, in ascending relative-path order, hash `path` + `\0` + decimal byte length + `\0` + contents + `\n`. Eight files are covered.

**Headline**: the round-1 CRITICAL is genuinely fixed, and I re-derived the corrected figure twice to confirm it. But the same pass that verified the correction was obliged to re-verify the artifacts, and it found a second instance of the identical defect species in a different wave: `tasks.md:80` asserts that three line citations "resolved exactly" when all three are the **pre-change** line numbers of the very commit that note describes. The implementation is still correct and no requirement verdict moves. The change is not archive-ready, because the evidence base contains a provably false verification claim.

## What was actually run

| # | Command | Exit | Result |
|---|---------|------|--------|
| 1 | `npm run test` (frontend) | 0 | 6 files, **151 passed**, 0 failed, 0 expected-fail |
| 2 | `npm run build` | 0 | compiled successfully, Next.js 16.3.6 |
| 3 | `npm run lint` | 0 | clean |
| 4 | `npx tsc --noEmit` | 0 | clean |
| 5 | `.venv\Scripts\python.exe manage.py test` | - | **did not run** - Windows App Control blocked the binary |
| 6 | equivalent backend invocation (below) | 0 | **188 tests, OK (skipped=1)**, 255.563s |

Commands 1-4 were captured sequentially, each output hashed independently. Command 5 was attempted first and observed failing, exactly as in round 1, before falling back:

```powershell
$env:PYTHONPATH = (Resolve-Path ".\.venv\Lib\site-packages").Path
& "C:\Users\marce\AppData\Roaming\uv\python\cpython-3.12-windows-x86_64-none\python.exe" manage.py test --verbosity 1
```

This is the same CPython 3.12 series the venv was built from, with the venv's own `site-packages` on `PYTHONPATH`, so the same Django discovery, the same settings module and the same 188 tests ran. The interpreter path differs from round 1's (`cpython-3.12.14-...`); both are 3.12. The run again emitted `No directory at: <repo>\backend\staticfiles\`, which is positive proof that no `collectstatic` step is a prerequisite, and the suite exited 0 with no `staticfiles.json` anywhere.

## Round-1 CRITICAL: re-verified fixed

The round-1 finding was a false `2.60:1` for `#00288e` on `#1a1a1a`. I did not take the correction on trust.

Recomputed independently in Node and in Python, from the operands read out of the source:

| Pair | Ratio (Node) | Ratio (Python) |
|------|-------------:|---------------:|
| `#00288e` on `#1a1a1a` | 1.404045 | 1.404045 |
| `#1E40AF` on `#1a1a1a` | 1.995357 | 1.995357 |
| `#757684` on `#1a1a1a` | 3.879461 | 3.879461 |
| `#FFFFFF` on `#1a1a1a` | 17.404328 | 17.404328 |

Both corrected cells now read correctly: `tasks.md:74` carries `1.40:1` inline with the note "corrected 2026-09-30 by verify", and the `apply-progress.md` correction rows carry `1.4040:1`. A grep of the whole change directory for the false figure returns no live claim. The two remaining `2.60x` values, at `research.md:99-100`, are `2.608` and `2.603` and they are **legitimate**: they are measurements of a different light-surface pair, independently recomputed above as `#757684` on `#1a1a1a` = 3.879 and neighbours, and they match their stated context.

**Verdict on the round-1 finding: confirmed fixed. The correction is real, not cosmetic.**

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

Requirement and scenario headings were counted from the spec files in this round, not carried over: `### Requirement:` x12 and `#### Scenario:` x25.

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
| Typography Scale Tokens | S1 Every scale step declares a paired line height | `frontend/tests/typography-scale.test.ts` (46 assertions) | COMPLIANT |
| Typography Scale Tokens | S2 Inter renders on buttons and badges | `frontend/tests/typography-scale.test.ts` - the label primitives are wired | COMPLIANT |
| Elevation Scale Tokens | S3 Token values match the design source | `frontend/tests/elevation-scale.test.ts` - the four levels are registered with the design source values | COMPLIANT |
| Elevation Scale Tokens | S4 Mapped surfaces use the level utilities | `frontend/tests/elevation-scale.test.ts` - zero stock shadow utilities survive | COMPLIANT |
| Text Token Contrast Floor | S5 Text tokens clear 4.5:1 across the whole ramp | `frontend/tests/contrast.test.ts > Text Token Contrast Floor (SC 1.4.3)` | COMPLIANT |
| Text Token Contrast Floor | S6 The superseded muted value fails the binding surface | `frontend/tests/contrast.test.ts` - the superseded muted value fails the binding surface | COMPLIANT |
| Control Border Contrast Floor | S7 Control borders reach 3:1 on every surface | `frontend/tests/contrast.test.ts`, `frontend/tests/control-border.test.ts` | COMPLIANT |
| Control Border Contrast Floor | S8 Decorative outlines are not darkened | `frontend/tests/contrast.test.ts`, `frontend/tests/control-border.test.ts` - Bucket B | COMPLIANT |
| Theme Token Registration And Guard | S9 All six tokens are registered | `frontend/tests/theme-registration.test.ts` | COMPLIANT |
| Theme Token Registration And Guard | S10 The guard fails on a bad token | `frontend/tests/theme-registration.test.ts` + the independent mutation probe below | COMPLIANT |
| Radius Correction At Navbar Controls | S11 Navbar controls use the button radius | Source read plus a byte-diff of the `--radius-*` ramp, below. No automated test; the spec designates build-or-manual verification for radius. | COMPLIANT |
| Footer Focus Visibility | S12 Footer links show a focus ring | 11 source occurrences of `focus-visible:ring-3` in `frontend/app/layout.tsx` plus contrast arithmetic. No rendered observation. | PARTIAL |
| Backend Test Gate | S13 The gate is green with no prerequisite | Backend suite exit 0, no `staticfiles/`, no `collectstatic` prerequisite | COMPLIANT |
| Backend Test Gate | S14 Only the four admin-login tests are affected | Class-scoped override in `backend/mitienda/tests.py`; production `STORAGES` untouched; `tearDown` composes | COMPLIANT |
| Frontend Test Runner | S15 Design-system assertions are source-and-arithmetic | All 6 suites parse CSS source or compute ratios; no `getComputedStyle` | COMPLIANT |
| Frontend Test Runner | S16 The suite does not claim browser verification | This report states it explicitly, and marks radius as build-or-manual | COMPLIANT |
| Dead Conditional Removal | S17 Identical branches are collapsed | `frontend/app/orders/[id]/page.tsx:349-352` is a single `cn(...)` with no ternary | COMPLIANT |

**Compliance summary**: 22/25 scenarios fully compliant, 3/25 partially evidenced, 0 failing, 0 untested. All 12 requirements are implemented. S13 stays COMPLIANT for the same reason round 1 gave: the prescribed interpreter is blocked, that condition is disclosed in full, and the fallback ran the same suite from the same `site-packages`.

## Per-file test inventory

Independently derived from a JSON reporter run, not from the aggregate runner's total.

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

Expected-fail tests: **0 executable**, suite-wide.

## Independent evidence

The suite passing is not proof the guards work, so the load-bearing guards were re-proved against the real artifacts from outside the test suite.

**Theme registration guard, both directions.** The shipped function was invoked directly, via `vite-node`, against mutated copies of the real `globals.css`:

| Input | `unregistered` | `dangling` |
|-------|---------------|------------|
| shipped `globals.css` | `[]` | `[]` |
| `:root` token added, no registration | `["--probe-unregistered"]` | `[]` |
| ...then the registration added | `[]` | `[]` |
| registration pointing at a missing `var()` | `[]` | `["--probe-missing"]` |
| a real registration deleted | `["--on-tertiary-container"]` | `[]` |

All five inputs were confirmed to have actually altered the stylesheet before the guard was run. The guard names the offending token, recovers when the registration is added, catches a dangling reference, and catches a deleted registration. The allowlist holds exactly one entry, `--radius`, with a non-empty reason, and `--radius` is genuinely absent from the registration targets.

**Shadow census.** A first pass of this census was wrong and is recorded as such: the tokenizer failed to consume the leading space before a class name, so all 19 `shadow-level-*` usages were misreported as 19 stock shadows. Re-run correctly, against all 38 `.tsx` files under `app/` and `components/`:

| Token | Usages | Files |
|-------|-------:|------:|
| `shadow-level-*` | 19 | 13 |
| stock `shadow-*` | **0** | 0 |

This matches the tree-wide invariant `elevation-scale.test.ts` enforces, and confirms the W5b dialog's contribution of one level-2 shadow. The `lib/` directory holds 3 further `.tsx` files, which the guard deliberately does not sweep; including them the walk visits 41 files.

**Contrast, recomputed from the token values in Python and in Node.** Worst case across the surface ramp:

| Token | Value | Worst-case ratio | Floor | Result |
|-------|-------|-----------------:|-------|--------|
| `--text-primary` | `#131b2e` | 12.2327:1 | 4.5 | pass |
| `--text-secondary` | `#444653` | 6.6637:1 | 4.5 | pass |
| `--text-muted` | `#5c5d72` | 4.5873:1 | 4.5 | pass - the exact value the spec names |
| superseded `--text-muted` | `#757684` | 3.198:1 | 4.5 | fails, as the spec requires |
| `--outline` (control border) | `#757684` | 3.198:1 | 3.0 | pass |
| `--outline-variant` (decorative) | `#c4c5d5` | 1.2178:1 | - | deliberately not darkened |

**Footer focus coverage.** `frontend/app/layout.tsx` holds exactly 11 `<a>` elements and exactly 11 occurrences each of `focus-visible:ring-3`, `focus-visible:rounded-sm` and `focus-visible:ring-white`, at L56-59, L66-69 and L94-96. Coverage is total, measured rather than assumed from the task's count.

**Radius ramp, byte-diffed.** All 7 `--radius-*` declarations in `globals.css` are byte-for-byte identical to their pre-change state. `Navbar.tsx` L185, L219 and L238 carry `rounded-xl`; L121, L198 and L206 still carry `rounded-lg`, each read directly from the file.

## Issues Found

**CRITICAL** - 1

1. `tasks.md:80` (task 7.1) asserts that three line citations resolved exactly, and all three are wrong.

   The note claims:

   ```text
   **All three citations resolved exactly**: `ExpiringTokenAuthentication` is at L26,
   the gate condition is at L58, and the TTL check is at L56 - so "the TTL check stays
   outside the exemption" describes the code as written, not a change to make.
   ```

   The cited positions, measured on the current file:

   | Construct | Claimed | Actual at HEAD |
   |-----------|--------:|---------------:|
   | `class ExpiringTokenAuthentication` | L26 | **L34** |
   | the gate condition | L58 | **L66-67** |
   | the TTL check | L56 | **L64** |

   These are not drift. `backend/users/authentication.py` has been modified exactly once in this change, by `db12ca3` (W5a) itself, and never since. L26, L58 and L56 are the positions the file occupied at its **parent**, `a7c39b6`, verified directly. W5a added an eight-line comment block and the `frozenset` constant above the class, and split the one-line gate into a two-line condition, which is what moved everything down by eight. So the note cites the file as it was *before* the very edit it is describing.

   That makes this provably false, and false **when written** - the claim was introduced by `3381fa6`, after `db12ca3`, and the file has not moved since. The same three numbers are repeated at `apply-progress.md:1476`, `1478` and `1479`, so the false citations are not confined to one cell.

   It is worse than a wrong locator, because the note's own inference rests on them. The claim is that the citation resolves, **and therefore** the TTL check is already outside the exemption, so no change is needed. The conclusion is true - I verified it independently below - but it is not supported by the evidence the note offers. A verification note that cites the wrong file and then reasons from the citation has not performed the check it claims to have performed.

   Scope, stated precisely so nobody over-reads this:

   - It changes **no** requirement verdict. The structural claim is true: the TTL check at L63-64 raises `AuthenticationFailed('Token expirado')` **before** the gate at L66-67, and `request.path not in TOTP_EXEMPT_PATHS` narrows only the 2FA branch, so an expired token still cannot log out. The exemption is path-scoped, not a bypass.
   - It changes **no** shipped behaviour. Nothing outside the docs mentions those line numbers.
   - Round 1's own report cited the same check correctly, at "L64-65", which is the value this report confirms. The correct numbers were therefore already available on disk.

   It is CRITICAL because the severity contract reserves that level for a provably false claim. This one is not a number that happens to be inconsequential; it is an explicit assertion that a check was performed and passed, when the cited evidence shows it was not.

   **Fix**: correct the three numbers in `tasks.md:80` to L34, L66-67 and L64, and the three repeats in `apply-progress.md:1476-1479`. No code change and no test change.

**WARNING** - 5

1. `Footer Focus Visibility` (S12) has no rendered evidence. All 11 elements carry `focus-visible:ring-3 focus-visible:ring-white`, and the ring colour clears 3:1 by 17.404:1, but nothing observed a ring actually paint on keyboard focus. jsdom does not apply the compiled stylesheet and does not implement `:focus-visible`, so no test could have proven this. The spec's build-or-manual allowance covers radius and elevation, not focus rings, so this is a gap in the evidence rather than in the implementation. Closing it needs one manual keyboard pass over the footer.

2. The prescribed backend command still cannot run. `.venv\Scripts\python.exe` is blocked by Windows App Control, so `manage.py test` as specified never executed. The fallback ran the same 188 tests from the same `site-packages` and exited 0, so the backend evidence is real, but the literal command in the change's own gate is unproven on this host. Unchanged from round 1, and disclosed there in the same terms.

3. S5 and S7 rest on jsdom, not a live round trip. The frontend tests drive a mocked backend, so "restores the session" and "sign-out succeeds" are proven against a simulation. No browser-to-backend `X-TOTP` exchange was observed. S7's backend half is covered by a real test, so its residual gap is the frontend sign-out path under a live gate.

4. Citation drift in the W5a and W5b notes, beyond the CRITICAL. `tasks.md:81` states `TwoFAGateTests` "already existed at `tests.py:673`"; it is at L676, and was at L676 in `3381fa6` when the note was written, so that locator is simply miscounted. `tasks.md:82` says "`L56-70` and `L244` both resolved exactly" - L244 is exact, and L56-70 brackets the `onTokenChange` construct (doc comment L60-64, function L65-70) though it opens four lines early on the type alias. `tasks.md:85` places the `onTokenChange` effect at L62-67; it is L63-68, and the same sentence calls L62-67 a "12-line range" when it spans six. None of these changes a verdict: each still points at the right construct, which is why they are warnings and not criticals. `tasks.md:34` additionally carries prescriptive line numbers for task 1.9 that were never exact (`L120/L133/L147/L156/L166/L170` against actual `L121/L144/L158/L167/L177/L181`), but the file is unchanged since W3 and a task's instruction pointer drifting is ordinary maintenance.

   The distinction I applied is worth stating, because it is the line between warning and critical here: a note that was **true when written and went stale** through later legitimate commits is drift, and a note that was **false when written** is a false claim. Only the second is CRITICAL. On that test, `apply-progress.md:22` - which still reads `| W5c | PR 10 | pending - next objective to open |` and has no W5d row at all - is drift, not a false claim: that row was accurate before W5c landed, and the same file's header at L8 lists W5c and W5d complete. It is nonetheless a stale row in a live status table and should be refreshed, because a reader who scans the table instead of the header is told the opposite of the truth.

5. Two of round 1's critical-defect candidates were withdrawn on re-check, and I am recording that rather than quietly dropping them. `tasks.md:82` and `tasks.md:85` both look like false citations at a glance. On inspection the cited lines fall inside or immediately adjacent to the correct blocks, and 7.6 discloses its own imprecision in the same sentence. Inflating them to criticals would have made this report noisier and less accurate, not stricter.

**SUGGESTION** - 3

1. Three operating-line budgets were exceeded, recorded as facts rather than as requirement violations - no spec requirement caps authored lines. W5c ran **502** additions against a 400 ceiling; W5d ran **285** against a 250 ceiling; the round-1 verify report added **269** against the same 250 ceiling, independently confirmed from `git show --numstat 92b4591` (3 files, 267 insertions, 2 deletions). None introduced scope beyond its wave and none is a defect, but the pattern is consistent enough to name: the review-heavy units are the ones that overrun.

2. `Radius Correction At Navbar Controls` (S11) is the one requirement with no automated test. It is genuinely compliant - the spec designates build-or-manual verification for radius, and the three corrected plus three retained line numbers are a deterministic source read - but a nine-line source assertion would keep the correction from drifting silently, and it is cheap next to the effort already spent on the other eleven requirements.

3. The scope of the next verification should be bounded. Round 1 found one false claim in the W8 evidence note. Round 2 found one in the W5a note. Both were in the *evidence prose*, never in the code. A third round that only re-reads prose has a poor return on effort compared with closing S12 with a manual keyboard pass, which would remove a standing warning permanently.

## Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| TOTP Verification on API Requests | Implemented | `authentication.py:31` exempts exactly `/api/users/logout/`; the TTL check at L63-64 sits **above** the gate at L66-67, so an expired token still cannot log out - the exemption is path-scoped, not a bypass. `test_gated_user_still_gated_on_profile` exists to fail if the exemption is ever widened. |
| Global TOTP Challenge Resolution | Implemented | Resolve-only deferred at `api.ts:302-325`, verified line-exact in this round; the login route keeps its own local challenge path. |
| Typography Scale Tokens | Implemented | 12 paired steps; removing the stock step from the two base lists is what makes the cascade correction real. |
| Elevation Scale Tokens | Implemented | 4 levels registered, 19 usages across 13 files, zero stock shadow utilities, level 3 registered and unconsumed. |
| Text Token Contrast Floor | Implemented | Worst case 4.5873:1 on `--surface-dim`; the comparison applies no rounding. |
| Control Border Contrast Floor | Implemented | Aliases `--outline` at 3.198:1; `--outline-variant` still `#c4c5d5` at 1.2178:1, undarkened. |
| Theme Token Registration And Guard | Implemented | Proved to fail and recover in both directions against the real stylesheet, outside its own test file. |
| Radius Correction At Navbar Controls | Implemented | 3/3 corrected, 3/3 retained, ramp byte-identical. |
| Footer Focus Visibility | Implemented, not observed | 11/11 elements carry the ring and the colour clears 3:1 by a wide margin; no render. |
| Backend Test Gate | Implemented | Class-level override, production `STORAGES` untouched, composing `tearDown`, no `collectstatic` prerequisite. |
| Frontend Test Runner | Implemented | Vitest + jsdom + RTL only; every design-system assertion is a source parse or an arithmetic computation. |
| Dead Conditional Removal | Implemented | `orders/[id]/page.tsx:349-352` is a single `cn(...)` call with no ternary. |

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Numeric token values are normative in `docs/designs/DESIGN.md` | Yes | Typography and elevation suites both compare against the design source and include mutations proving the comparison is live. |
| Corrections are surgical: no ramp restyling | Yes | The `--radius-*` ramp is byte-identical, proven by diff rather than assertion. |
| Registration lives in `@theme inline`, not `:root` | Yes | Asserted directly, with `--radius` allowlisted for the radius ramp, which intentionally is not registered. |
| Test-only fixes must not change production settings | Yes | The storage override is confined to the test class; production `STORAGES` is untouched. |
| Guard every correction with a mutation that proves the guard is live | Yes | The typography and elevation suites are largely anti-vacuity fixtures, and the registration guard was re-proved here from outside the suite. |
| Fix the defect, do not restate it | Yes | W5d removed the `it.fails` wrapper and asserted the real behaviour instead of recording a known-broken promise as an accepted failure. |

## Verdict

**FAIL - one CRITICAL in the evidence base; the implementation itself passes.**

The round-1 CRITICAL is confirmed genuinely fixed, and I re-derived the corrected figure twice to be sure. All 12 requirements are implemented, 341 tests pass, 22 of 25 scenarios are fully evidenced, and nothing in the code needs to change.

The change is still not archive-ready, for one reason. `tasks.md:80` states that three citations "resolved exactly" when all three are the pre-change line numbers of the commit that note describes, and three repeats of those numbers sit in `apply-progress.md:1476-1479`. The structural claim the note supports is nonetheless true, and I verified it independently rather than inheriting it. Correct the six numbers, re-run this verification, and the verdict flips to pass with the five warnings attached.

The correction is a text-only fix of the same shape as the one this round was asked to re-verify, which is worth naming plainly: the first re-verification of a corrected artifact found a second uncorrected claim in the same category. The pattern across both rounds is that the prose evidence, not the code, is where this change's risk lives. The skill is explicit that a canonical failure carrying a critical finding is valid and persistable but not archive-ready, which is precisely the state this report records.
