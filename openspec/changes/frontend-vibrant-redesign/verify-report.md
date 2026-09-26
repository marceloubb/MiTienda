```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:5c5519fc7eec24f8a18d73e3ee89ab97307695438144d49a85afa75762dd5995
verdict: fail
blockers: 0
critical_findings: 3
requirements: 6/19
scenarios: 18/44
test_command: .venv\Scripts\python.exe manage.py test
test_exit_code: 1
test_output_hash: sha256:e280d2cd282e67261ee59b752f4c55e73c811c6f24ff8a0d9824c0c3e775b3c9
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:623cb059e4902ab790bcfb600be25f9b253c0a8b4ae58b6c7d4ac3e6bbbefdcc
```

## Verification Report

**Change**: frontend-vibrant-redesign
**Version**: N/A (no spec version field in any of the five specs)
**Mode**: Standard (no Strict TDD runner, no frontend test runner)
**Branch**: `feat/vibrant-redesign-slice5-2fa` @ `8e515dd` (clean tree, tracks origin)

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 23 |
| Tasks complete | 23 |
| Tasks incomplete | 0 |
| Requirements (from specs) | 19 |
| Scenarios (from specs) | 44 |

Requirement/scenario totals are counted from the retrieved specs (`### Requirement:` / `#### Scenario:` headings): visual-design-system 6/9, order-event-history 4/8, order-state-machine 2/10, order-tracking 4/8, two-factor-auth 3/9.

### Build & Tests Execution

**Build**: PASS — exit 0
```text
$ npm run build   (workdir frontend/)
▲ Next.js 16.3.6 (Turbopack)
✓ Compiled successfully in 490ms
  Running TypeScript ...
  Finished TypeScript in 1866ms ...
Route (app)
┌ ƒ /            ├ ƒ /admin/2fa     ├ ƒ /cart        ├ ƒ /orders
├ ƒ /_not-found  ├ ƒ /admin/orders  ├ ƒ /checkout    ├ ƒ /orders/[id]
├ ƒ /admin       ├ ƒ /admin/staff   ├ ƒ /despacho    ├ ƒ /products
├ ƒ /bodega      ├ ƒ /login         ├ ƒ /profile     ├ ƒ /products/[id]
                                                    └ ƒ /register
```
16 routes emitted, including the new `/admin/2fa` and `/orders/[id]`. TypeScript completed with no errors.

**Lint**: PASS — exit 0
```text
$ npm run lint   (workdir frontend/)
C:\...\frontend\app\cart\page.tsx            157:23  warning  @next/next/no-img-element
C:\...\frontend\app\checkout\page.tsx       594:19  warning  @next/next/no-img-element
C:\...\frontend\app\products\[id]\page.tsx  226:13  warning  @next/next/no-img-element
C:\...\frontend\components\ProductCard.tsx    82:11  warning  @next/next/no-img-element
✖ 4 problems (0 errors, 4 warnings)
```
Zero errors. The 4 warnings are the documented pre-existing baseline, at exactly the documented files and lines, none in a file touched by slices 1.4/5.

**Tests**: FAIL — 4 errors, 1 skipped, 180 of 185 passed. Exit 1.
```text
$ .venv\Scripts\python.exe manage.py test   (workdir backend/)
Found 185 test(s).
System check identified no issues (0 silenced).
UserWarning: No directory at: C:\Users\marce\Documents\workspace\MiTienda\backend\staticfiles\
EEE.E............................................................................s..
Ran 185 tests in 260.233s
FAILED (errors=4, skipped=1)

ERROR: test_allowlist_unset_permits_access (mitienda.tests.AdminAccessControlTests.test_allowlist_unset_permits_access)
ERROR: test_allowlisted_ip_allowed (mitienda.tests.AdminAccessControlTests.test_allowlisted_ip_allowed)
ERROR: test_custom_admin_url_routes_admin (mitienda.tests.AdminAccessControlTests.test_custom_admin_url_routes_admin)
ERROR: test_default_admin_url (mitienda.tests.AdminAccessControlTests.test_default_admin_url)

  File "...\django\contrib\staticfiles\storage.py", line 601, in stored_name
    raise ValueError(
ValueError: Missing staticfiles manifest entry for 'admin/css/base.css'
```

**Change-scoped backend suites (both green)**:
```text
$ .venv\Scripts\python.exe manage.py test orders
Found 80 test(s). Ran 80 tests in 186.466s — OK (skipped=1)

$ .venv\Scripts\python.exe manage.py test users
Found 76 test(s). Ran 76 tests in 70.472s — OK
```

**Coverage**: ➖ Not available. The project has no coverage tooling, and no frontend test runner at all (verified: `package.json` exposes only `dev`, `build`, `start`, `lint`; no `jest`, `vitest`, `@playwright/test`, `cypress`, or `@testing-library` in dependencies or devDependencies).

### Spec Compliance Matrix

Runtime-proven scenarios come only from the passing Django suites. The 23 frontend scenarios are UNTESTED by construction — see "Verification Evidence Gap" below.

#### order-event-history (4 req / 8 scen) — backend, runtime-proven
| Requirement | Scenario | Test | Result |
|---|---|---|---|
| OrderEvent Model | Event stores exact transition data | `orders/tests.py > test_event_stores_exact_transition_data` | ✅ COMPLIANT |
| OrderEvent Model | Timestamps not client-controlled | `orders/tests.py > test_fabricated_client_timestamp_is_ignored` | ✅ COMPLIANT |
| Initial Event on Creation | New order starts with created event | `orders/tests.py > test_create_from_cart_appends_created_event` | ✅ COMPLIANT |
| Initial Event on Creation | Legacy orders backfilled | `orders/tests.py > test_legacy_order_gets_backfilled_created_event` | ✅ COMPLIANT |
| Events Appended on Transitions | Forward advance appends event | `orders/tests.py > test_advance_appends_advanced_event` | ✅ COMPLIANT |
| Events Appended on Transitions | Rejected transition appends nothing | `orders/tests.py > test_rejected_advance_appends_nothing` | ✅ COMPLIANT |
| Event Trail Exposed in Detail | Customer detail carries full timeline | `orders/tests.py > test_delivered_order_payload_has_five_ascending_events` | ✅ COMPLIANT |
| Event Trail Exposed in Detail | No cross-user event leakage | `orders/tests.py > test_cross_user_order_detail_returns_404_without_events` | ✅ COMPLIANT |

#### order-state-machine (2 req / 10 scen) — backend, runtime-proven
| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Transitions Append Timestamped Events | Advance appends advanced event | `orders/tests.py > test_advance_appends_advanced_event` | ✅ COMPLIANT |
| Transitions Append Timestamped Events | Discrepancy flag appends event | `orders/tests.py > test_discrepancy_appends_event_from_prior_status` | ✅ COMPLIANT |
| Transitions Append Timestamped Events | Resolve appends event | `orders/tests.py > test_resolve_appends_resolved_event_to_restored_status` | ✅ COMPLIANT |
| Transitions Append Timestamped Events | Rejected advance appends nothing | `orders/tests.py > test_rejected_advance_appends_nothing` | ✅ COMPLIANT |
| Admin Cancel with Stock Restore | Admin cancels pending order | `orders/tests.py > test_admin_cancels_pending_restores_stock`, `test_cancel_appends_cancelled_event_with_prior_status` | ✅ COMPLIANT |
| Admin Cancel with Stock Restore | Admin cancels shipped order | `orders/tests.py > test_admin_cancels_shipped_restores_stock`, `test_cancel_appends_cancelled_event_with_prior_status` | ✅ COMPLIANT |
| Admin Cancel with Stock Restore | Admin cancels discrepancy order | `orders/tests.py > test_admin_cancels_discrepancy_order_restores_stock`, `test_cancel_of_discrepancy_order_records_discrepancy_source` | ✅ COMPLIANT |
| Admin Cancel with Stock Restore | Non-admin cannot cancel | `orders/tests.py > test_non_admin_cancel_denied`, `test_non_admin_cancel_appends_nothing` | ✅ COMPLIANT |
| Admin Cancel with Stock Restore | Cannot cancel delivered order | `orders/tests.py > test_cannot_cancel_delivered_order`, `test_cancel_delivered_appends_nothing` | ✅ COMPLIANT |
| Admin Cancel with Stock Restore | Cannot cancel already cancelled order | `orders/tests.py > test_cannot_cancel_cancelled_order` | ✅ COMPLIANT |

#### two-factor-auth (3 req / 9 scen) — mixed
| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Web Enrollment UI | Admin enrolls and confirms | (none found) — static: `TwoFAEnrollView.tsx:93-100`, `TOTPConfirmForm.tsx:35-38` | ❌ UNTESTED |
| Web Enrollment UI | Invalid confirmation code rejected | (none found) — static: `TOTPConfirmForm.tsx:39-44` | ❌ UNTESTED |
| Web Enrollment UI | Repeated enrollment blocked | (none found) — static: `TwoFAEnrollView.tsx:36-40`; backend 400 proven by `users/tests.py > test_enroll_rejects_when_confirmed_device_exists` | ❌ UNTESTED |
| Web Enrollment UI | Non-admin blocked | (none found) — static: `RequireRole.tsx:39-46` | ❌ UNTESTED |
| 2FA API Client | Enroll returns device material | `users/tests.py > test_enroll_then_confirm_activates_device` (proves the 201 body the client mirrors; the client function itself is unverified) | ⚠️ PARTIAL |
| 2FA API Client | Confirm surfaces invalid-code error | `users/tests.py > test_confirmation_with_bad_code_blocks_activation` (same boundary) | ⚠️ PARTIAL |
| Login TOTP Challenge | Gated session prompts for code | (none found) — static: `login/page.tsx:157-165` | ❌ UNTESTED |
| Login TOTP Challenge | Wrong code keeps challenge open | (none found) — static: `login/page.tsx:57-63` | ❌ UNTESTED |
| Login TOTP Challenge | Unaffected users skip the challenge | (none found) — static: `login/page.tsx:158-161` | ❌ UNTESTED |

#### order-tracking (4 req / 8 scen) — frontend, unverified
| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Tracking Route with 5-Step Timeline | Delivered order shows five reached steps | (none found) — static: `app/orders/[id]/page.tsx` `DeliveryTimeline` | ❌ UNTESTED |
| Tracking Route with 5-Step Timeline | In-flight order shows partial timeline | (none found) — static: same | ❌ UNTESTED |
| Tracking Route with 5-Step Timeline | Foreign order not visible | backend 404 proven by `orders/tests.py > test_cross_user_order_detail_returns_404_without_events`; the `router.replace("/orders")` is unverified | ⚠️ PARTIAL |
| Delivered Detail | Delivered detail rendered fully | (none found) — static: `DeliveredDetail` | ❌ UNTESTED |
| Delivered Detail | Re-buy skips inactive products | (none found) — static: `RebuyButton.handleRebuy` | ❌ UNTESTED |
| Delivered Detail | Re-buy adds all items | (none found) — static: same | ❌ UNTESTED |
| Non-Happy-Path Status Rendering | Cancelled order stops the timeline | (none found) — static: terminal marker block | ❌ UNTESTED |
| Explicitly Cut Tracking Features | No fabricated tracking data | (none found) — static: no ETA/map/courier/tax/review/coupon symbol in the file | ❌ UNTESTED |

#### visual-design-system (6 req / 9 scen) — frontend, unverified
| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Global Design Tokens | Token ramp swapped app-wide | (none found) — static: `globals.css:7-155`; see CRITICAL-2 | ❌ UNTESTED |
| Global Design Tokens | No zoom-blocking viewport | (none found) — static: no `user-scalable`/`maximum-scale` anywhere in `app/` or `components/` | ❌ UNTESTED |
| Semantic Token Mapping | Offer and stock semantics preserved | (none found) — static: `ProductCard.tsx:53-76` | ❌ UNTESTED |
| Semantic Token Mapping | Status badges keep tints | (none found) — static: `lib/order-status.tsx` shipped→`bg-stock/10 text-stock`, delivered→`bg-stock text-white` | ❌ UNTESTED |
| Typography via next/font | Fonts swapped with no flash | (none found) — static: Geist absent, PJS+Inter loaded; see CRITICAL-3 | ❌ UNTESTED |
| Radius and Elevation Scale | Radius applied per component class | (none found) — static: card/button/badge ramp correct; see WARNING-2 | ❌ UNTESTED |
| Lucide Icon Mapping | Icons render from lucide | (none found) — static: `lib/icons.ts` has all 8 mappings; no webfont request | ❌ UNTESTED |
| Desktop-First with Sober Accessibility | Focus rings visible on all controls | (none found) — static: base `Button` variant supplies `focus-visible:ring-3` for all 48 usages; 11 pre-existing footer links lack it (SUGGESTION-4) | ❌ UNTESTED |
| Desktop-First with Sober Accessibility | Contrast preserved after swap | (none found) — computed: see WARNING-1 | ❌ UNTESTED |

**Compliance summary**: 18/44 scenarios compliant (all backend), 3/44 partial, 23/44 untested.

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|---|---|---|
| order-event-history: OrderEvent Model | ✅ Implemented | `models.py` `OrderEvent` with `related_name='events'`, `from_status` nullable, `timestamp default=timezone.now, editable=False`, `Meta ordering=['timestamp','id']` + `(order,timestamp)` index. Append-only (no update/delete path in `views.py`). |
| order-state-machine: Transitions append events | ✅ Implemented | 5 append sites inside the pre-existing `transaction.atomic()` blocks, all after the 403/400 guard returns. |
| order-event-history: Event trail exposed | ✅ Implemented | `OrderEventSerializer` + `events` on `OrderSerializer` (inherited by `StaffOrderSerializer`); user-scoped queryset yields 404 cross-user. |
| order-tracking: 5-step timeline | ✅ Implemented (unverified) | Exact spec labels; timestamps sourced only from `order.events`, never `updated_at` (D4 held). Future steps render "Pendiente" with no timestamp. |
| order-tracking: foreign order | ✅ Implemented (unverified) | `app/orders/[id]/page.tsx` catches `APIError` 404 → `router.replace("/orders")`. |
| order-tracking: delivered detail + re-buy | ✅ Implemented (unverified) | items/shipping/payment/total rendered; re-buy adds per item and reports skipped names via `sileo.info`. |
| order-tracking: cut features | ✅ Implemented (unverified) | No courier, ETA, map, tax document, review, or coupon symbol present in the route. |
| two-factor-auth: enrollment UI | ✅ Implemented (unverified) | `/admin/2fa` → `TwoFAEnrollView` → `TOTPSecretCard` + `TOTPConfirmForm`. QR + full Base32 + 6-digit input. Backup codes correctly absent per spec. |
| two-factor-auth: API client | ✅ Implemented (unverified) | `enroll2FA()` → POST `/users/2fa/enroll/`; `confirm2FA(deviceId, code)` → POST `/users/2fa/confirm/`, both via `fetchAPI`, errors as `APIError`. |
| two-factor-auth: login challenge | ✅ Implemented (unverified) | `apiLogin` → `getProfile()` probe → `isTOTPCodeRequired` → challenge. `login(profile)` is reached only after a successful probe or a successful challenge, so no role-based rendering precedes the second factor. `X-TOTP` is withheld from `/users/login/` and `/users/register/` via `NO_TOTP_HEADER_ENDPOINTS`. |
| visual-design-system: tokens | ⚠️ Incomplete | See CRITICAL-2. |
| visual-design-system: typography | ⚠️ Incomplete | See CRITICAL-3. |
| visual-design-system: radius | ✅ Implemented | `--radius: 0.5rem` (≠ 0.625rem). `badge=rounded-full`, `button` base + all 7 sizes `=rounded-xl`, `card` base + `rounded-t-2xl`/`rounded-b-2xl` clips `=rounded-2xl`. Compiled CSS confirms `.rounded-2xl{border-radius:1rem}`, `.rounded-xl{border-radius:.75rem}`, `.rounded-full{...}`. |
| visual-design-system: icons | ✅ Implemented | All 8 required mappings present; no Material Symbols webfont import anywhere. |
| visual-design-system: accessibility | ⚠️ Partial | Focus rings present on all `Button` usages. Contrast: see WARNING-1. Shadow hierarchy: see WARNING-5. |

### Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| Tokens + radius in `:root`, ramp registered | ✅ Yes | Full ramp registered in `@theme inline` (`globals.css:148-154`). |
| Fonts: `next/font` PJS + Inter, drop Geist | ⚠️ Partial | Loading is correct, but Inter is never applied to any element (CRITICAL-3). |
| Icons: lucide map in `lib/icons.ts` | ✅ Yes | Single documented module, as specified. |
| QR via a `qrcode` package | ✅ Yes, improved | See the assessment below. |
| `OrderEvent` appended in the same transaction, server clock | ✅ Yes | Verified in source and by 80 passing tests. |
| Legacy orders backfilled by `RunPython` | ✅ Yes | `MigrationExecutor`-driven test passes. |
| TOTP in memory → `X-TOTP`, never login/register, cleared on logout | ✅ Yes | `api.ts:103-134`; `logout()` uses `try/finally` so the code is cleared *after* the request. |
| Backend unchanged by slice 5 | ✅ Yes | `git log 0a6eaf9..HEAD -- backend/` is empty. The only backend commits in the change are slice 2's, in `backend/orders/`. |
| Radius ramp on `components/ui/*` | ✅ Yes | No leftover `rounded-[min(var(--radius-md),Npx)]` anywhere in `app/`, `components/` or `lib/`. |

#### Assessment: `qrcode.react@4.2.0` (maintainer-approved)

The choice holds up on its merits. `TOTPSecretCard.tsx:69-77` renders `QRCodeSVG` with `level="M"`, `marginSize={4}`, `bgColor="#ffffff"`, `fgColor="#131b2e"`, and a `title` for assistive tech, satisfying the spec MUST ("the page MUST render the provisioning URI as a QR code (client-side)"). It is strictly better than the `design.md` "canvas" plan: inline SVG needs no canvas ref, no `toDataURL` round-trip and no client-only mount guard, and it degrades gracefully at small sizes. Decoding it client-side also keeps the TOTP secret off any third-party image service, which matters for a credential. The literal hex colors instead of CSS vars are a deliberate and correct trade — an unresolvable `var()` leaves the SVG `fill` invalid and the code unscannable, which would lock an admin out. The dependency is pinned (`^4.2.0`, installed 4.2.0), MIT-licensed and actively maintained; the TypeScript pass proves `marginSize` is a valid v4 prop. The only standing concern is that it is the project's first new runtime dependency and there is no frontend test runner to pin its behavior, so a future major upgrade would be unverified — worth a SUGGESTION, not a blocker.

### Issues Found

#### CRITICAL

**CRITICAL-1 — Declared backend gate exits 1 (4 errors). Not a regression, but the gate is red.**

- Command: `.venv\Scripts\python.exe manage.py test` (workdir `backend/`) → **exit 1**
- Failing: `mitienda.tests.AdminAccessControlTests` — `test_allowlist_unset_permits_access`, `test_allowlisted_ip_allowed`, `test_custom_admin_url_routes_admin`, `test_default_admin_url`
- Root cause: `ValueError: Missing staticfiles manifest entry for 'admin/css/base.css'`, preceded by `UserWarning: No directory at: ...\backend\staticfiles\`
- **Proven not introduced by this change**: `backend/mitienda/tests.py` is byte-identical between `main` and `HEAD` (git blob `48b9719bf6427210f66cf53189c549d38717bb23` on both); the file was last modified by `a7c39b6` (2026-09-23), before this change's planning commit `0a6eaf9`; `backend/staticfiles/` does not exist and is untracked (0 files) — it is a `collectstatic` artifact absent from the working tree; and `git log 0a6eaf9..HEAD -- backend/` is empty, so no backend file moved on this chain.
- The brief's expectation of "95 tests" is stale: the runner discovers **185** tests. `orders` (80) and `users` (76) both pass.
- Fix: environment setup, not code. Run `manage.py collectstatic --noinput` in `backend/` before the suite (or configure `STATICFILES_STORAGE`/manifest handling for tests). Not worked around here, per the honest-reporting rule.

**CRITICAL-2 — `--color-error-container` / `--color-on-error-container` are not registered in `@theme inline`, so 25 shipped class usages emit no CSS.**

- File: `frontend/app/globals.css` — declared at lines **53** (`--error-container: #ffdad6`) and **55** (`--on-error-container: #93000a`) in `:root`; the `@theme inline` block spans lines **84–155** and registers `--color-error` (117) and `--color-on-error` (118) but **never** `--color-error-container` or `--color-on-error-container`.
- Spec violated: `visual-design-system/spec.md` Requirement "Global Design Tokens" — the `@theme inline` block MUST expose the tokens as utilities "so existing class names keep working", and Scenario "Token ramp swapped app-wide" requires that "every page renders with the Vibrant Retail Clean palette". Tailwind 4 generates no CSS for an unregistered theme key, so those error surfaces render with **no background at all**.
- **Hard evidence** (freshly built `.next/static/chunks/3rucclbnpezyh.css`): a full dump of every selector containing `error` yields `.bg-error`, `.bg-error\/10`, `.text-error`, `.text-on-error`, `.ring-error\/20`, `.ring-error\/30`, `.hover\:bg-error\/10`… and **no** `.bg-error-container` and **no** `.text-on-error-container`. Only the raw `:root` variable `--error-container:#ffdad6` is emitted.
- **Scale correction — larger than `apply-progress.md` recorded.** apply-progress lists 3 files. The real blast radius is **25 occurrences across 8 files**: `components/admin/DiscrepancyPanel.tsx` (lines 160, 180, 272, 331, 343), `components/admin/OrdersDashboard.tsx` (279, 287, 337), `components/admin/StatusFilterChips.tsx` (84, incl. `hover:bg-error-container/80`), `components/admin/StaffKpiRow.tsx` (74, `bg-error-container/50`), `components/admin/InventoryView.tsx` (228), `components/admin/StaffUserForm.tsx` (169), `app/bodega/page.tsx` (268), `app/register/page.tsx` (89).
- Severity note: the requirement's *enumerated* token list does not include error-container, and `--color-error` **is** registered, so the letter of that MUST holds. The violation is of the scenario and of the requirement's stated purpose. This is the same defect class slice 3 already fixed once for `--color-on-primary` (commit `c11d5ae`).
- Fix: add to the `@theme inline` block in `frontend/app/globals.css` immediately after line 118:
  ```css
  --color-error-container: var(--error-container);
  --color-on-error-container: var(--on-error-container);
  ```
  The pair is AA-compliant (7.24:1) once reachable. Belongs to task **1.1**.

**CRITICAL-3 — The Typography requirement's two explicit MUSTs are unimplemented: Inter is never applied, and the DESIGN.md type scale is not wired into the theme.**

- `frontend/app/globals.css:121` registers `--font-label: var(--font-inter)`, and `app/layout.tsx:2,8-14` loads `Plus_Jakarta_Sans` and `Inter`. But `html { @apply font-sans }` (globals.css:235) resolves `--font-sans` to `--font-jakarta` (line 119), and **zero** elements in `app/` or `components/` carry a `font-label` class. So every button, badge and label renders in Plus Jakarta Sans; Inter is fetched and never used.
- Spec violated: `visual-design-system/spec.md` Requirement "Typography via next/font" — "labels/badges/buttons MUST use Inter" and "The DESIGN.md type scale (display-hero 36px/800 … label-badge 11px/700) MUST be wired into the theme"; Scenario "Fonts swapped with no flash" requires that "Inter renders labels/buttons".
- Compounding: the type scale is not tokenized either. `globals.css` declares no `--text-*` size/weight tokens, so the scale is expressed as ad-hoc Tailwind sizes (`text-2xl`, `text-3xl`, `text-sm`, `text-xs`, `text-xl`) scattered across the pages rather than a theme-wired ramp.
- Fix: add `font-label` to the base class strings of `components/ui/button.tsx` and `components/ui/badge.tsx` (and to the shared input/label class constants), and register the DESIGN.md scale as `--text-display-hero`, `--text-label-badge`, etc. in `@theme inline`. Belongs to task **1.2**.

#### WARNING

**WARNING-1 — `text-muted-foreground` fails WCAG AA for normal text (4.26:1).**

- File: `frontend/app/globals.css:14` (`--text-muted: #757684`), reaching utilities via `--color-text-muted` (97) and `--muted-foreground` (133). Used pervasively for body-secondary text at `text-xs`/`text-sm` (e.g. `app/orders/[id]/page.tsx` "Realizado el {date}", `app/admin/2fa/page.tsx:17-19`).
- Measured: `#757684` on `#faf8ff` = **4.26:1**, below the 4.5:1 AA threshold for normal-size text. Spec violated: Requirement "Desktop-First with Sober Accessibility" — "Text and UI-component color pairs MUST meet WCAG 2.1 AA contrast".
- The two pairs the spec names explicitly both pass: on-surface on background = 16.29:1 (AAA), white on primary-container = 8.72:1 (AAA). Other measured pairs pass: white on primary 12.40, white on primary-hover 6.70, text-secondary 8.87, white on stock 6.48, stock on bg-stock/10 5.57, white on error 6.46, error on background 6.13, on-secondary-container 4.55, stock-low on stock-low-bg 6.84, offer 7.29.
- Honest framing: `#757684` comes from DESIGN.md, so the token faithfully implements the design source; **it is an improvement, not a regression** — the pre-swap value was `#999999`, which measures 2.70:1 on the same background. The design source itself lands marginally under AA.
- Fix: darken `--text-muted` (and the identical `--outline` at line 65) to reach ≥4.5:1 — `#6b6c79` measures ≈4.9:1. Belongs to task **1.1**, with a DESIGN.md follow-up.

**WARNING-2 — The radius ramp is complete on every `components/ui/*` primitive, but two Navbar buttons keep `rounded-lg`.**

- Answering the brief's question directly: **yes**, the ramp covers every primitive the spec names. `badge.tsx` = `rounded-full`; `button.tsx` base + all seven sizes = `rounded-xl`; `card.tsx` base + both image corner clips + `CardHeader`/`CardFooter` = `rounded-2xl`/`rounded-t-2xl`/`rounded-b-2xl`; `separator.tsx` correctly has no radius; `skeleton.tsx`'s `rounded-md` is a defensible exclusion (placeholders are not cards/buttons/inputs/badges). A repo-wide search for `rounded-[min(var(--radius` across `app/`, `components/` and `lib/` returns **zero** hits, so no primitive is re-pinned to 6px.
- Residual: `components/Navbar.tsx:219` (logout `<button>`, `size-10`) and `:238` (mobile menu `<button>`, `size-10`) still use `rounded-lg`. The requirement covers "components/ui/* **and page surfaces**: cards rounded-2xl, buttons/inputs rounded-xl". `e095c7a`'s own message claims navbar compliance, and it correctly moved the two search inputs (145, 263), the search submit (150) and the Ingresar CTA (227) to `rounded-xl` — but left these two buttons behind. The other four `rounded-lg` in Navbar (121 logo badge, 185 cart link, 198 orders link, 206 profile link) are not buttons/inputs/cards/badges.
- Fix: change `rounded-lg` → `rounded-xl` at `Navbar.tsx:219` and `:238`. Belongs to task **1.4**.

**WARNING-3 — Verification evidence gap: 23 of 44 scenarios have no runtime evidence, and the project's own manual smoke cannot be performed here.**

- There is no frontend test runner (confirmed: `package.json` has only `dev`/`build`/`start`/`lint`; no jest, vitest, playwright, cypress or testing-library), and no browser is available in this environment. So the enroll / wrong-code / already-confirmed / non-admin-redirect paths, the tracking timeline states, the re-buy paths and every visual-design-system scenario are argued from source and from the backend suites, **not observed**.
- The project configuration does explicitly sanction this: the proposal's risk table lists "No frontend test runner | High | build + lint + manual smoke", and `design.md`'s verification table lists "Frontend gates | build+lint per slice (no test runner) | Smoke all routes". Under the skill's rule that project config permitting manual verification keeps missing covering tests from being automatically CRITICAL, the 23 are recorded as UNTESTED in the matrix rather than as 23 separate criticals — but the manual half of that strategy was **not** performed, which is the substantive reason this verdict is `fail` rather than `pass_with_warnings`.
- The 2FA gate is additionally **inert by default**: `DJANGO_2FA_ENFORCED` defaults to `False` (`backend/mitienda/settings.py`), and `users/tests.py > test_gate_off_allows_request_without_code` asserts 200. No frontend-only change can demonstrate the challenge while the flag is off, and this change correctly did not touch the backend to enable it.
- Fix: run the manual smoke from `design.md`'s table once in a browser-capable environment, then archive.

**WARNING-4 — The elevation clause of the Radius and Elevation Scale requirement is unimplemented.**

- `globals.css` declares no shadow tokens, and the app uses an ad-hoc mix of stock Tailwind shadows — `shadow-sm` ×12, `shadow-lg` ×1, `shadow-2xl` ×1 — with **no shadow at all** on `components/ui/card.tsx`. Spec: "Shadows MUST follow the Level 0–3 ambient hierarchy (flat, card rest, floating, overlay)".
- Fix: register the four levels as `--shadow-*` tokens in `@theme inline` and map the card/floating/overlay surfaces onto them. Belongs to task **1.1**.

#### SUGGESTION

- **SUGGESTION-1** — Five more `@theme` registrations are missing and will bite the next person: `--color-tertiary`, `--color-tertiary-container`, `--color-on-tertiary`, `--color-on-tertiary-container`, `--color-on-background` (`globals.css:49-52,67`). They are currently unused in source so nothing is broken today, but they are the same trap as CRITICAL-2. Register them in the same fix.
- **SUGGESTION-2** — `--offer` / `--color-offer` (`globals.css:21,97`) is registered but has **zero** usages; the discount badge uses `bg-secondary-container text-on-secondary-container` instead (`ProductCard.tsx:76`). Semantics are preserved and the pair measures 4.55:1, so the scenario passes, but DESIGN.md's dedicated discount token is bypassed. Either use it on the sale badge or drop it from the ramp.
- **SUGGESTION-3** — Dead conditional in `frontend/app/orders/[id]/page.tsx`: the terminal marker computes `order.status === "cancelled" ? "bg-error/10 ring-error/30" : "bg-error/10 ring-error/30"` — both branches are identical. Collapse to the single literal.
- **SUGGESTION-4** — The 11 footer `<a href="#">` links plus 3 social links in `app/layout.tsx` have no `:focus-visible` style, against "Every interactive element MUST show a visible `:focus-visible` ring". **Pre-existing and untouched**: 11 such links before the design-system commit `298bf1a`, 11 at HEAD, and `31f2942` changed only the font imports. Report as inherited debt, not a regression.
- **SUGGESTION-5** — `--outline-variant` (`#c4c5d5`) measures 1.71:1 on white and is used as input borders, including the 2FA confirm input (`TOTPConfirmForm.tsx:10`). WCAG 2.1 AA 1.4.11 requires 3:1 for meaningful UI-component boundaries. The spec's MUST is arguably scoped to text pairs, so this is reported as interpretation-dependent.
- **SUGGESTION-6** — `app/orders/page.tsx:328` uses `rounded-md` on the history-tab `<summary>` trigger. A disclosure trigger is button-like, so `rounded-xl` would be the consistent choice; low severity.
- **SUGGESTION-7** — `qrcode.react` is the project's first new runtime dependency and there is no frontend test runner to catch a future major-version behavior change. Consider pinning it exactly rather than `^4.2.0` until a runner exists.

### Rulings on the two follow-ups the apply phase declined to fix

**Ruling 1 — 2FA enrollment lockout gap: OUT-OF-SCOPE FOLLOW-UP, not a spec violation. The spec is silent, not self-contradictory.**

I checked this against the spec's own wording rather than accepting the "the spec contradicts itself" framing in `apply-progress.md`.

The two requirements do not actually conflict. Requirement "Web Enrollment UI" scenario "Admin enrolls and confirms" has a THEN clause of exactly two things — "the page shows success and the device is confirmed" — and both are true and implemented (`TwoFAEnrollView.tsx:48-63` renders the `confirmed` phase; `TwoFAConfirmView` at `backend/users/views.py:198-200` sets `device.confirmed = True` and returns `{confirmed: true}`). The scenario says nothing about the pre-existing session remaining usable, so nothing is violated. Requirement "Login TOTP Challenge" opens with "**After a successful password login**, when any authenticated request returns 401 with error code `totp_required` …" — its scope is the post-password-login path, and a mid-session enrollment 401 is not "after a successful password login", so the MUST never reaches that state. The correct characterization is therefore a **spec gap**: nothing requires session continuity after mid-session enrollment, and nothing provides a way to recover from it.

The mechanism is confirmed statically. `backend/users/authentication.py:_validate_expiry_and_2fa` is a blanket per-request check with no endpoint exemption, so once `confirm2FA` commits, the very next token-authenticated request from that session 401s. `TOTPConfirmForm.tsx:35-38` calls `confirm2FA` and then only `setCode("")` + `onConfirmed()` — it never calls `setTOTPCode`, so the module-level `totpCode` in `api.ts:105` stays `null`. And `app/admin/2fa/page.tsx` is the only surface that could render a challenge, while the only challenge UI is `TOTPChallengeStep`, mounted exclusively from `app/login/page.tsx:197`.

It is also unreachable in the shipped configuration: `DJANGO_2FA_ENFORCED` defaults to `False`, and `users/tests.py > test_gate_off_allows_request_without_code` asserts a 200 with no code. So no shipped behavior regresses today, and the apply phase was right to record it rather than fix it.

Correct disposition: **belongs to no existing task.** It requires a *new* requirement (either session continuity after enrollment, or a global `totp_required` handler reachable from any authenticated surface) — a spec amendment, not a bug fix inside this change. If the maintainer prefers to close it here, the minimal mitigation is for `TOTPConfirmForm.handleSubmit` to call `setTOTPCode(code)` once `confirm2FA` resolves, which carries the current session across the transition; that narrows but does not close the window, because the code's ~30s TOTP lifetime means a later navigation would still 401.

**Ruling 2 — `--color-error-container` / `--color-on-error-container`: YES, the visual-design-system spec is violated by the shipped code, and the finding is larger than recorded.**

The apply phase's classification was correct in direction but understated in scope, so I am promoting it to CRITICAL. Reasoning:

1. *Letter of the MUST holds.* The requirement enumerates the tokens `@theme inline` must expose — primary, primary-container, secondary, tertiary, error, surface/background, on-surface, the `surface-container-*` ramp, and outline variants. error-container is not in that list, and `--color-error` **is** registered at `globals.css:117`. So no enumerated token is missing.
2. *But the scenario fails.* Scenario "Token ramp swapped app-wide" requires that "every page renders with the Vibrant Retail Clean palette". A `bg-error-container` alert that emits no background does not render that palette. Tailwind 4 generates no CSS for unregistered theme keys, and I confirmed this against the freshly built stylesheet rather than inferring it: `.bg-error-container` and `.text-on-error-container` are absent from `.next/static/chunks/3rucclbnpezyh.css`, while a full dump of every `error` selector shows the registered ones present.
3. *It affects real, user-visible surfaces in 8 files*, not the 3 recorded — the register page's error alert, the bodega discrepancy badge, and every error chip, KPI tile and discrepancy-modal row in the staff surfaces. Error chips are exactly where a missing background is most visible.
4. *It is a repeat of a defect this change already fixed once.* Slice 3 found and fixed the identical class for `--color-on-primary`, `--color-secondary-container`, `--color-on-secondary-container` and `--color-on-secondary` in commit `c11d5ae`, verifying the fix in the compiled CSS. The same trap was then re-entered in slices 3–4 for the error-container pair. That recurrence is itself worth recording.

The fix is two lines in `@theme inline` and the pair is AA-compliant (7.24:1) once reachable, so the severity is a function of blast radius, not of difficulty. Belongs to task **1.1**.

### Premise corrections

Two items in the verification brief do not correspond to anything in this repository. Reporting them rather than inventing a finding:

- **The "wait for the slab, then flip" pattern in `app/cart/page.tsx` / `app/checkout/page.tsx` does not exist.** `git grep -i slab` over the whole repository matches only an unrelated `progressLabel` variable in `docs/designs/stitch-staff/preparaci_n_de_orden_bodega/code.html`. The words "slab" and "flip" appear in none of the five specs, `design.md`, or `proposal.md`.
- **`e095c7a` never touched `app/cart/page.tsx` or `app/checkout/page.tsx`.** Its diff is confined to `components/Navbar.tsx`, `components/ui/{badge,button,card}.tsx`, and the two SDD artifacts. The correct cart/checkout question — whether the radius-ramp change affected those pages — has a real answer: **only indirectly, and correctly.** The commit changed the `Button` base from `rounded-lg` to `rounded-xl` and deleted the four `rounded-[min(var(--radius-md),Npx)]` size overrides. Because `--radius-md` is `0.375rem`, `min(6px,10px)` and `min(6px,12px)` both collapsed to 6px, pinning every `size="xs" | "sm" | "icon-xs" | "icon-sm"` call site to 6px regardless of the base value. Cart and checkout use those sizes heavily, so their small buttons moved 6px → 0.75rem as intended, and no cart/checkout source file was edited. Compiled CSS confirms `.rounded-xl{border-radius:.75rem}`.
- **The "stale → material" interaction rule is likewise not a spec term.** The only "stale" in the SDD artifacts is an unrelated aside in `apply-progress.md:172` about not leaving a stale legacy input class next to the new TOTP input.

### Verification Evidence Gap

Explicitly static-analysis-only, i.e. **not observed at runtime** in this environment:

- 2FA enroll happy path, wrong-code path, already-confirmed path, and the non-admin redirect. Argued from `RequireRole.tsx:39-46` (non-admins `router.push(redirectTo)` and `return null`, so the enroll view never mounts) and from the backend's own `test_enroll_requires_admin_role` (403) and `test_enroll_rejects_when_confirmed_device_exists` (400).
- The login TOTP challenge in all three states, and the fact that the gate never engages while `DJANGO_2FA_ENFORCED` is off.
- All tracking-timeline states, re-buy behavior, and the confirmed absence of fabricated tracking data.
- Every visual assertion: palette, radius, focus rings, QR scannability, and font rendering. Inter is provably *not applied* from source; that it renders is a different claim and was not observed.
- The 4 `no-img-element` warnings were confirmed as the documented baseline by exact file and line, but no page was rendered.

The one thing I did confirm empirically, beyond the gates, is the CSS-level claim in CRITICAL-2: I built the app and inspected the emitted stylesheet, so "these classes emit no CSS" is measured, not inferred.

### Verdict

**FAIL**

Two of three gates are green (`npm run build` exit 0 with 16 routes and a clean TypeScript pass; `npm run lint` exit 0 with 0 errors), and the entire backend domain this change owns is runtime-proven — 18 of 18 order-event and order-state-machine scenarios pass against a real Django suite, and the change-scoped `orders` (80) and `users` (76) suites are green. But the declared backend gate exits 1 on 4 errors, three CRITICAL findings stand (a red gate, 25 dead class usages across 8 files from two unregistered theme tokens, and a Typography requirement whose two explicit MUSTs have no implementation), and 23 of 44 scenarios have no runtime evidence with the project's own manual smoke not performed here. The change is not archive-ready.

Recommended next phase: **remediate** — the ledger objective should cover CRITICAL-2 and CRITICAL-3 (both belong to tasks 1.1 and 1.2, both are small and well-scoped), WARNING-1 through WARNING-4, and the environment setup for CRITICAL-1. Verification is re-run afterwards. Ruling 1's enrollment-lockout gap should be raised as a new spec requirement in a separate change, not fixed here. Archive remains blocked until the backend gate exits 0 and a browser smoke has been performed.

## Key Learnings

1. Tailwind 4 emits no CSS for a `:root` custom property that is not also registered under `--color-*` in `@theme inline`, so the variable existing in the built stylesheet is not evidence that the utility class works.
2. Verifying a reported token gap by auditing every `:root` color against `@theme inline` and then searching the source for usages found 25 dead call sites in 8 files where the change log had recorded only 3 files.
3. Django's `ManifestStaticFilesStorage` fails admin template rendering with `Missing staticfiles manifest entry` when `collectstatic` has never run, which fails four tests through no code change at all.
4. A blanket per-request authentication check with no endpoint exemption list turns any mid-session privilege change into a self-inflicted lockout.
5. Contrast ratios must be computed from the final token values rather than assumed from the design source, since the design's own muted-text token lands at 4.26:1 against a 4.5:1 AA threshold.
