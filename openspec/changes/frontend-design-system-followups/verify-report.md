```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:6369ac87cce769b70b66374888541b1f83bdf2251594ad5caf199f0b8dd1cb78
verdict: fail
blockers: 0
critical_findings: 1
requirements: 12/12
scenarios: 22/25
test_command: npm run test
test_exit_code: 0
test_output_hash: sha256:b2c5666d25c7257edc68526c9f4c6c56a5e18ee4762a1508b87874a649bb0d70
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:b02ad033b96274d1e461e1586671e06d2307806a2907ba5126f7f32cc91845bb
```

# Verification Report

**Change**: frontend-design-system-followups
**Version**: N/A (no version header in either spec)
**Mode**: Standard
**Change ID**: 9aaeb979
**Spec revision**: proposal, design, tasks, apply-progress and both spec files are unmodified on disk; HEAD is `e2a093b80885a37ddad680e905f5a8c4da144a57` (tree `ae891fe3cce63ff9eec51829daee477838b55fb8`) with a clean working tree.

**Headline**: the implementation is correct. All 12 requirements are implemented, all 341 tests pass, and no acceptance criterion is unmet. The change nevertheless cannot be archived, for one reason that has nothing to do with the code: `apply-progress.md` publishes a contrast figure that is arithmetically false. That is a provably false claim in the evidence base, which the severity contract classifies as CRITICAL. The number describes a *rejected* candidate colour, so the shipped behaviour and every requirement verdict are unaffected — but a false number sitting in the artifact future verifiers trust cannot be waved through because its conclusion happens to survive.

## What was actually run

| # | Command | Exit | Result |
|---|---------|------|--------|
| 1 | `npm run test` (frontend) | 0 | 6 files, **151 passed**, 0 failed, 0 expected-fail |
| 2 | `npm run build` | 0 | compiled successfully in 842ms |
| 3 | `npm run lint` | 0 | clean |
| 4 | `npx tsc --noEmit` | 0 | clean |
| 5 | `.venv\Scripts\python.exe manage.py test` | — | **did not run** — Windows App Control blocked the binary |
| 6 | equivalent backend invocation (see below) | 0 | **188 tests, OK (skipped=1)**, 252.959s |

Backend command 6, because command 5 cannot execute on this host:

```powershell
$env:PYTHONPATH = "<repo>\backend\.venv\Lib\site-packages"
& "C:\Users\marce\AppData\Roaming\uv\python\cpython-3.12.14-windows-x86_64-none\python.exe" manage.py test --verbosity 1
```

This is the same CPython 3.12.14 the venv was built from, with the venv's own `site-packages` on `PYTHONPATH`, so the same Django test discovery, the same settings module and the same 188 tests ran. Two outputs worth recording: the run emitted `No directory at: <repo>\backend\staticfiles\`, which is positive proof that no `collectstatic` step is a prerequisite (the Backend Test Gate requirement, scenario 1); and the suite exited 0 with no `staticfiles.json` anywhere.

The build emitted one warning, unrelated to this change: `Next.js ignored package-lock.json in C:\Users\marce because it is outside the current Git repository`.

## Completeness

Counts re-derived from the files on disk, not taken from the dispatcher's claims.

| Metric | Value |
|--------|-------|
| Tasks total | 35 (`1.1`–`8.4`, contiguous) |
| Tasks complete | 35 |
| Tasks incomplete | 0 |
| Requirements total | 12 (2 two-factor-auth + 10 visual-design-system) |
| Scenarios total | 25 (8 two-factor-auth + 17 visual-design-system) |
| Scenarios fully evidenced | 22 |
| Scenarios partially evidenced | 3 (S5, S7, S12 — all three are evidence limits, not defects) |

## Spec Compliance Matrix

Statuses follow the skill's four values. Where the spec itself designates a verification method other than an automated test, that is stated in the Notes column rather than silently treated as a test.

### two-factor-auth — TOTP Verification on API Requests

| Req | Scenario | Evidence | Result |
|-----|----------|----------|--------|
| TOTP Verification on API Requests | S1 Missing TOTP code rejected | `backend/users/tests.py > test_missing_totp_code_rejected_with_totp_required` | ✅ COMPLIANT |
| TOTP Verification on API Requests | S2 Valid TOTP code accepted | `backend/users/tests.py > test_valid_totp_code_accepted` | ✅ COMPLIANT |
| TOTP Verification on API Requests | S3 2FA disabled allows access | `backend/users/tests.py > test_gate_off_allows_request_without_code` | ✅ COMPLIANT |
| TOTP Verification on API Requests | S4 Logout is exempt from the gate | `backend/users/tests.py > test_gated_user_can_logout`, `test_exempt_paths_resolve_to_logout_view`, `test_gated_user_still_gated_on_profile` | ✅ COMPLIANT |

### two-factor-auth — Global TOTP Challenge Resolution

| Req | Scenario | Evidence | Result |
|-----|----------|----------|--------|
| Global TOTP Challenge Resolution | S5 Mid-session challenge resolves outside the login route | `frontend/tests/totp-challenge.test.tsx > a 401 carrying totp_required opens the challenge on the current surface` (L215) and `> a valid code retries the rejected request and resolves the original caller` (L238) | ⚠️ PARTIAL |
| Global TOTP Challenge Resolution | S6 Incorrect code keeps the challenge open | `frontend/tests/totp-challenge.test.tsx > an incorrect code keeps the challenge open, shows an error, and establishes no session` (L264) | ✅ COMPLIANT |
| Global TOTP Challenge Resolution | S7 A gated user can always sign out | `backend/users/tests.py > test_gated_user_can_logout` (L747) | ⚠️ PARTIAL |
| Global TOTP Challenge Resolution | S8 Unaffected users see no prompt | `frontend/tests/totp-challenge.test.tsx > an unaffected user sees no prompt on any surface` (L285) | ✅ COMPLIANT |

### visual-design-system

| Req | Scenario | Evidence | Result |
|-----|----------|----------|--------|
| Typography Scale Tokens | S1 Every scale step declares a paired line height | `frontend/tests/typography-scale.test.ts` (46 assertions) | ✅ COMPLIANT |
| Typography Scale Tokens | S2 Inter renders on buttons and badges | `frontend/tests/typography-scale.test.ts > the label primitives are wired` | ✅ COMPLIANT |
| Elevation Scale Tokens | S3 Token values match the design source | `frontend/tests/elevation-scale.test.ts > the four levels are registered with the design source values` | ✅ COMPLIANT |
| Elevation Scale Tokens | S4 Mapped surfaces use the level utilities | `frontend/tests/elevation-scale.test.ts > zero stock shadow utilities survive` | ✅ COMPLIANT |
| Text Token Contrast Floor | S5 Text tokens clear 4.5:1 across the whole ramp | `frontend/tests/contrast.test.ts > Text Token Contrast Floor (SC 1.4.3)` | ✅ COMPLIANT |
| Text Token Contrast Floor | S6 The superseded muted value fails the binding surface | `frontend/tests/contrast.test.ts > the superseded muted value fails the binding surface, so the floor is sensitive` | ✅ COMPLIANT |
| Control Border Contrast Floor | S7 Control borders reach 3:1 on every surface | `frontend/tests/contrast.test.ts > Control Border Contrast Floor (SC 1.4.11)`, `frontend/tests/control-border.test.ts` | ✅ COMPLIANT |
| Control Border Contrast Floor | S8 Decorative outlines are not darkened | `frontend/tests/contrast.test.ts > the decorative outline is not darkened`, `frontend/tests/control-border.test.ts > Bucket B` | ✅ COMPLIANT |
| Theme Token Registration And Guard | S9 All six tokens are registered | `frontend/tests/theme-registration.test.ts` | ✅ COMPLIANT |
| Theme Token Registration And Guard | S10 The guard fails on a bad token | `frontend/tests/theme-registration.test.ts` + independent mutation probe (below) | ✅ COMPLIANT |
| Radius Correction At Navbar Controls | S11 Navbar controls use the button radius | Source reading + byte-diff of the `--radius-*` ramp (below). No automated test; the Frontend Test Runner requirement designates build-or-manual verification for radius. | ✅ COMPLIANT |
| Footer Focus Visibility | S12 Footer links show a focus ring | 11 source occurrences of `focus-visible:ring-3` in `frontend/app/layout.tsx` + contrast arithmetic. No rendered observation. | ⚠️ PARTIAL |
| Backend Test Gate | S13 The gate is green with no prerequisite | Backend suite exit 0, no `staticfiles/`, no `collectstatic` | ✅ COMPLIANT |
| Backend Test Gate | S14 Only the four admin-login tests are affected | `backend/mitienda/tests.py:120-121`; production `STORAGES` unchanged; `tearDown` composes | ✅ COMPLIANT |
| Frontend Test Runner | S15 Design-system assertions are source-and-arithmetic | All 6 suites parse CSS source or compute ratios; no `getComputedStyle` | ✅ COMPLIANT |
| Frontend Test Runner | S16 The suite does not claim browser verification | This report states it explicitly, and marks radius/elevation as build-or-manual | ✅ COMPLIANT |
| Dead Conditional Removal | S17 Identical branches are collapsed | `frontend/app/orders/[id]/page.tsx:349-352` | ✅ COMPLIANT |

**Compliance summary**: 22/25 scenarios fully compliant, 3/25 partially evidenced, 0 failing, 0 untested. All 12 requirements are implemented.

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

Expected-fail tests: **0 executable**, suite-wide. Both textual mentions of `it.fails` in `totp-challenge.test.tsx` (L17, L234) are inside comments describing the history of scenario 2, which W5d converted from `it.fails` to a real passing assertion.

## Independent evidence

The suite passing is not proof the guards work, so the load-bearing guards were re-proved against the real artifacts from outside the test suite.

**Theme registration guard, both directions.** The shipped function was invoked directly against mutated copies of the real `globals.css`:

| Input | `unregistered` | `dangling` |
|-------|---------------|------------|
| shipped `globals.css` | `[]` | `[]` |
| `:root` token added, no registration | `["--probe-unregistered"]` | `[]` |
| …then the registration added | `[]` | `[]` |
| registration pointing at a missing `var()` | `[]` | `["--probe-missing"]` |
| a real registration deleted | `["--tertiary"]` | `[]` |

All four mutations were confirmed to have actually altered the stylesheet. The guard names the offending token, recovers when the registration is added, catches a dangling reference, and catches a deleted registration. The allowlist holds exactly one entry, `--radius`, with a non-empty reason, and `--radius` is genuinely absent from the registration targets. All six spec tokens resolve to the expected `var()`.

**Contrast, recomputed from the token values in Python and in Node.** Worst case across the surface ramp:

| Token | Value | Worst-case ratio | Floor | Result |
|-------|-------|-----------------:|-------|--------|
| `--text-primary` | `#131b2e` | 12.233:1 | 4.5 | pass |
| `--text-secondary` | `#444653` | 6.664:1 | 4.5 | pass |
| `--text-muted` | `#5c5d72` | 4.587:1 | 4.5 | pass — and the exact value the spec names |
| superseded `--text-muted` | `#757684` | 3.198:1 | 4.5 | fails, as the spec requires |
| `--outline` (control border) | `#757684` | 3.198:1 | 3.0 | pass |
| `--outline-variant` (decorative) | `#c4c5d5` | 1.218:1 | — | deliberately not darkened |

**Typography cascade.** The custom steps do not win against the stock steps by source order, so the correction is load-bearing and worth stating precisely. In the fresh build, `.text-label-badge` is emitted at byte 29714 and `.text-label-lg` at 29782, but `.text-sm` at 29939 and `.text-xs` at 30123 — the stock steps sort *later* in the single `@layer utilities` block and therefore win at equal specificity. `frontend/components/ui/button.tsx:6` and `frontend/components/ui/badge.tsx:7` no longer stack a stock step on their base list, which is what makes the custom steps take effect. The compiled `.text-label-lg` rule is 14px/18px and `.text-label-badge` is 11px/14px, matching the design source. `globals.css` carries 12 base declarations and 12 line-height declarations, and no scale name collides with `primary`, `secondary` or `muted`.

**Radius ramp, byte-diffed.** All 7 `--radius-*` values in `globals.css` are byte-for-byte identical to their pre-change state at `51bf97e`. `Navbar.tsx` L185, L219, L238 carry `rounded-xl`; L121, L198, L206 still carry `rounded-lg`, each read directly from the file.

**Class-usage counts**, from a bracket-safe recursive walk (the naive `[]` glob silently skips `orders/[id]/page.tsx`):

| Token | Occurrences | Files | Reconciliation |
|-------|------------:|------:|----------------|
| `border-control-border` | 16 | 10 | W4's 15 + the W5b dialog |
| `border-outline-variant` | 13 | 9 | dividers, untouched |
| `ring-outline-variant` | 37 | 20 | W4's 36 + the W5b dialog |
| `shadow-level-*` | 19 | 13 | W7's 18 + the W5b dialog |

The W5b dialog contributes exactly one control border (L15), one outline ring and one level-2 shadow (L91), which accounts for each delta. The compiled stylesheet emits shadow levels 0, 1, 2 plus the hover level 1; level 3 is registered and unconsumed, which is what `elevation-scale.test.ts` asserts on purpose.

## The W5d question

The dispatch asked whether the spec actually covers tasks 8.3/8.4, which were added outside the original proposal and design. **It does, and no spec extension was needed.**

`specs/two-factor-auth/spec.md` was last modified in `db14775`, the original planning commit, before any wave of this change landed. Neither W5d commit touches a spec file. But the requirement was already there:

> `spec.md:46` — "AND submitting a valid code **retries the rejected request and restores the session**"

Retrying a rejected request necessarily means the *original caller* gets its promise settled with the replayed response — that is precisely what W5d delivered, and it is what the W5c finding was about. So W5d closed an implementation gap against a pre-existing requirement rather than introducing uncovered behaviour. The implementation now matches the clause and the clause is covered by a real passing assertion:

- `frontend/lib/api.ts:302-325` builds a resolve-only deferred, hands the handler `{ settled, replay, resolve }`, and returns `settled` from the parked caller.
- `frontend/lib/auth-context.tsx` stores the whole challenge and mounts the global dialog.
- `frontend/components/TotpChallengeDialog.tsx` calls `challenge.resolve(result)` before `onResolved()`.
- `totp-challenge.test.tsx:238` asserts the parked caller reaches `resolved` with a value equal to `PROFILE`, which is a live assertion on the original caller, not a proxy for it.

No traceability defect. Recording the answer explicitly because the question was asked.

## Issues Found

**CRITICAL** — 1

1. `apply-progress.md:1321` publishes a false contrast figure.

   ```text
   | `#00288e` - theme `--primary` | **2.60:1** | **fails** |
   ```

   The true ratio for `#00288e` on the footer surface `#1a1a1a` is **1.404:1**, recomputed twice, independently, in Python and in Node. The error is not a rounding artefact and not a token-name transcription slip: `globals.css:21` does declare `--primary: #00288e`, and `layout.tsx:38` does declare the footer as `bg-[#1a1a1a]`, so the operands are right and only the result is wrong.

   Scope, stated precisely so nobody over-reads this:
   - It changes **no** requirement verdict. The contrast requirements are decided on `--text-*` and `--outline`, whose values I recomputed and which all pass their floors.
   - It changes **no** shipped behaviour. The row evaluates `--primary` as a *rejected* focus candidate. The shipped footer focus ring is `focus-visible:ring-white` (`layout.tsx:56` and 10 sibling elements), which is **17.404:1** against `#1a1a1a` — far above the 3:1 control-focus floor.
   - The row's "fails" conclusion happens to be correct: 1.404 and 2.60 both fail 3:1.

   It is CRITICAL anyway, because the contract reserves that severity for a provably false claim and offers no "but it was inconsequential" exemption. The number matters beyond its own row: an auditor reading "2.60:1" would conclude the candidate was 87% of the way to a 3:1 floor, when it is 47% of the way — a materially different read of how much work the focus fix still needs. A false measurement in the artifact that future verifiers treat as the evidence base is exactly the failure mode this severity exists to catch.

   **Fix**: correct the single cell to `1.40:1`. No code change is required and no test needs to change.

**WARNING** — 3

1. `Footer Focus Visibility` (S12) has no rendered evidence. The eleven footer elements each carry `focus-visible:ring-3 focus-visible:ring-white`, and the ring colour clears 3:1 by 17.404:1, but nothing here observed a ring actually paint on keyboard focus. jsdom does not apply the compiled stylesheet and does not implement `:focus-visible`, so no test could have proven this. The spec's build-or-manual allowance covers radius and elevation (S16); it does not cover focus rings, so this is a genuine gap in the evidence rather than a gap in the implementation. Closing it needs one manual keyboard pass over the footer.

2. The prescribed backend command could not run. `.venv\Scripts\python.exe` is blocked by Windows App Control (`Una directiva de Control de aplicaciones bloqueó este archivo`), so `manage.py test` as specified never executed. The equivalent invocation in the table above ran the same 188 tests from the same interpreter version and the same `site-packages` and exited 0, so the backend evidence is real — but the literal command in the change's own gate is unproven on this host, and a machine with different App Control policy could behave differently.

3. S5 and S7 rest on jsdom, not a live round trip. The frontend tests drive a mocked backend, so "restores the session" and "sign-out succeeds" are proven against a simulation. No browser-to-backend `X-TOTP` exchange was observed. The backend half of S7 is covered by a real `TwoFAGateTests` case, so S7's residual gap is the frontend sign-out path under a live gate.

**SUGGESTION** — 2

1. Two operating-line budgets were exceeded, as facts, not as requirement violations — no spec requirement caps authored lines. W5c ran **502** additions against a 400 ceiling, and W5d ran **285** against a 250 ceiling. Both overshoots sit in review-heavy code paths: W5c the TOTP challenge and dialog, W5d the deferred-promise contract. Neither introduced scope beyond its wave, and neither is a defect, but both warrant attention the next time a wave is planned.

2. `Radius Correction At Navbar Controls` (S11) is the one requirement with no automated test. It is genuinely compliant — the spec designates build-or-manual verification for radius, and the three corrected plus three retained line numbers are a deterministic source read. But a nine-line source assertion would keep the three-target correction from drifting silently, and it is cheap next to the effort already spent on the other eleven requirements.

## Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| TOTP Verification on API Requests | ✅ Implemented | `authentication.py:31` exempts exactly `/api/users/logout/`; the TTL check at L64-65 sits *above* the exemption, so an expired token still cannot log out — the exemption is path-scoped, not a bypass of the other gate. `test_gated_user_still_gated_on_profile` exists specifically to fail if the exemption is ever widened. |
| Global TOTP Challenge Resolution | ✅ Implemented | Resolve-only deferred at `api.ts:302-325`; the login route keeps its own local challenge path, as the requirement demands. |
| Typography Scale Tokens | ✅ Implemented | 12 paired steps; 236 ad-hoc `text-*` usages untouched; removal of the stock step from the two base lists is what makes the cascade correction real. |
| Elevation Scale Tokens | ✅ Implemented | 4 levels registered, 19 usages, zero stock shadow utilities, level 3 registered and unconsumed. |
| Text Token Contrast Floor | ✅ Implemented | Worst case 4.587:1 on `--surface-dim`; threshold comparison applies no rounding, and 4.499 is proven to fail. |
| Control Border Contrast Floor | ✅ Implemented | Aliases `--outline` at 3.198:1; 15 control boundaries carry it; `--outline-variant` still `#c4c5d5` at 1.218:1, undarkened. |
| Theme Token Registration And Guard | ✅ Implemented | Guard proved to fail and recover in both directions against the real stylesheet, outside its own test file. |
| Radius Correction At Navbar Controls | ✅ Implemented | 3/3 corrected, 3/3 retained, ramp byte-identical to `51bf97e`. |
| Footer Focus Visibility | ⚠️ Implemented, not observed | 11/11 elements carry the ring and the colour clears 3:1 by a wide margin; no render. |
| Backend Test Gate | ✅ Implemented | Class-level override, no `DEBUG` gate, production `STORAGES` untouched, composing `tearDown`, no `collectstatic` prerequisite. |
| Frontend Test Runner | ✅ Implemented | Vitest + jsdom + RTL only; every design-system assertion is a source parse or an arithmetic computation. |
| Dead Conditional Removal | ✅ Implemented | `orders/[id]/page.tsx:349-352` is a single `cn(...)` call with no ternary; the literal appears exactly once in the file. |

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Numeric token values are normative in `docs/designs/DESIGN.md` | ✅ Yes | `typography-scale.test.ts` and `elevation-scale.test.ts` both compare against the design source and include mutations proving the comparison is live. |
| Corrections are surgical: no ramp restyling | ✅ Yes | The `--radius-*` ramp is byte-identical, proven by diff rather than assertion. |
| Registration lives in `@theme inline`, not `:root` | ✅ Yes | Asserted directly, with `--radius` allowlisted for the radius ramp, which intentionally is not registered. |
| Test-only fixes must not change production settings | ✅ Yes | The storage override is confined to the test class; `settings.py:178` is untouched. |
| Guard every correction with a mutation that proves the guard is live | ✅ Yes | `typography-scale.test.ts:279-336` and `elevation-scale.test.ts:353-400` are almost entirely anti-vacuity fixtures, including the authentic pre-correction class-list position rather than an appended token. |
| Fix the defect, do not restate it | ✅ Yes | W5d removed the `it.fails` wrapper and asserted the real behaviour instead of recording a known-broken promise as an accepted failure. |

## Verdict

**FAIL — one CRITICAL in the evidence base; the implementation itself passes.**

All 12 requirements are implemented, 341 tests pass, 22 of 25 scenarios are fully evidenced, and nothing in the code needs to change. The change is not archive-ready for one reason: `apply-progress.md:1321` states a contrast ratio of 2.60:1 where the true value is 1.404:1. Correct that single cell, re-run this verification, and the verdict flips to pass with the three warnings above attached. The SDD skill is explicit that a canonical failure carrying a critical finding is valid and persistable but not archive-ready, which is precisely the state this report records.
