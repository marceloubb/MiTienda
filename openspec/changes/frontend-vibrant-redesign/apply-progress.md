# Apply Progress — frontend-vibrant-redesign

Delivery: `auto-chain` / `stacked-to-main`. PRs are the orchestrator's job — none created.
Review budget: 400 changed lines per work unit.

Slices 1–5 complete — all 23 tasks checked. Awaiting final verification. Three follow-ups are recorded below and are not blockers for `verify`: the global `totp_required` challenge, `--color-error-container` missing from `@theme inline`, and enabling `DJANGO_2FA_ENFORCED`.

## Cumulative task state

| Task | State | Work unit |
|---|---|---|
| 1.1 Vibrant `:root` tokens in `globals.css` | [x] | slice 1 |
| 1.2 `next/font` PJS + Inter in `layout.tsx` | [x] | slice 1 |
| 1.3 `frontend/lib/icons.ts` lucide map | [x] | slice 1 |
| 1.4 Radius ramp on `components/ui/*` | [x] | slice 1 (deferred, this unit) |
| 2.1–2.5 `OrderEvent` model, migration, views, serializers, tests | [x] | slice 2 |
| 3.1–3.6 Customer routes (home, catalog, detail, cart, checkout, orders, tracking) | [x] | slice 3 |
| 4.1–4.4 Staff routes (admin/orders, bodega, despacho, admin/staff, profile, register) | [x] | slice 4 |
| 5.1–5.4 Admin 2FA + login TOTP | [x] | slice 5 |

---

## Slice 1 — Design system (branch `feat/vibrant-redesign-slice1-design-system`)

- [x] 1.1 `frontend/app/globals.css` — Vibrant Retail Clean `:root` ramp from `docs/designs/DESIGN.md` (read-only): `--primary #00288e` (+hover `#1d4ed8`), `--stock #006c49`, `--stock-low #92400e` (+badge bg `#fffbeb`), `--offer #065f46`, `--destructive/--error #ba1a1a`, surfaces `#fff/#f2f3ff/#eaedff`, background `#faf8ff`, on-surface `#131b2e`, `--outline-variant #c4c5d5`, `--outline #757684`, ring `#00288e`; legacy names mapped, never renamed; `@theme inline` keeps utilities. `--radius: 0.5rem`; radius ramp registered as `--radius-sm .25 / md .375 / lg .5 / xl .75 / 2xl 1 / 3xl 1.5 / 4xl 2`.
- [x] 1.2 `frontend/app/layout.tsx` — next/font PJS `--font-jakarta` + Inter `--font-inter`; Geist dropped; `--font-sans/--font-heading`=jakarta, `--font-label`=Inter; body `bg-background`. No `user-scalable=no`.
- [x] 1.3 `frontend/lib/icons.ts` (new) — `materialToLucide` map: arrow_back→ArrowLeft, local_shipping→Truck, route→Route, schedule→Clock, check→Check, shopping_bag→ShoppingBag, qr_code_scanner→QrCode, navigation→Navigation + `materialIcon(name)`.
- [x] 1.4 Radius ramp on `frontend/components/ui/*` — see dedicated section below (deferred from the original slice-1 batch because slices 2–4 shipped first and passed radius via `className` overrides).

### Foundation fix recorded in slice 3
`globals.css` `@theme inline` was missing `--color-on-primary`, `--color-secondary-container`, `--color-on-secondary-container`, `--color-on-secondary`. Tailwind 4 generates no CSS for unregistered theme keys, so those DESIGN.md tokens existed only as raw CSS vars and every badge/CTA using them rendered unstyled. Fixed and verified in the compiled `.next/static/chunks/*.css`.

---

## Slice 2 — OrderEvent backend (branch `feat/vibrant-redesign-slice2-order-events`)

- [x] 2.1 `backend/orders/models.py` — `OrderEvent`: FK `order` (`related_name='events'`, CASCADE), `event_type` choices created/advanced/discrepancy/resolved/cancelled, `from_status` (null, blank), `to_status`, `timestamp` DateTimeField `default=timezone.now, editable=False` (server clock), Meta `ordering=['timestamp','id']` + index `(order,timestamp)`.
- [x] 2.2 `backend/orders/migrations/0004_orderevent.py` — CreateModel + AddIndex + RunPython backfill (`created` from `created_at`, skips orders already having events, batch 500; reverse `RunPython.noop`).
- [x] 2.3 `backend/orders/views.py` — 5 in-transaction appends inside the existing `transaction.atomic()` blocks, all after 403/400 guard returns.
- [x] 2.4 `backend/orders/serializers.py` — `OrderEventSerializer`; `events` on `OrderSerializer`, inherited by `StaffOrderSerializer`; ascending via Meta ordering; cross-user 404 via user-scoped queryset.
- [x] 2.5 `backend/orders/tests.py` — 20 new tests: model/ordering/server-clock, `MigrationExecutor` backfill, atomic transition appends + 7 rejection paths, serializer timeline + cross-user 404.

**Verification (slice 2 gate)**: `..\backend\.venv\Scripts\python.exe manage.py test orders` — 80 tests, **OK (skipped=1)**. `makemigrations --check --dry-run` — **No changes detected**. `migrate` — `orders.0004_orderevent OK`.

**Work-unit commits**: `c909177`, `21cba0f`, `b73338c`, `c0e72d9`.
**Rollback**: `manage.py migrate orders 0003`; or revert `views.py`/`serializers.py`/`tests.py`.
**Review budget**: 497 changed lines → `size:exception` (tests alone are 353).

---

## Slice 3 — Customer routes (branch `feat/vibrant-redesign-slice3-customer-routes`)

- [x] 3.1 Token restyle of `app/page.tsx`, `app/products/page.tsx`, `app/products/[id]/page.tsx`, `components/ProductCard.tsx`; sale/low-stock semantics kept.
- [x] 3.2 `app/cart/page.tsx` restyle; coupon UI cut (none existed).
- [x] 3.3 4-step `CheckoutWizard` in `app/checkout/page.tsx` (Envío→Pago→Revisión→Confirmación) — full rewrite.
- [x] 3.4 `app/orders/page.tsx` — history tabs (Todos/En curso/Entregados/Cancelados) + `OrderCard`.
- [x] 3.5 NEW `app/orders/[id]/page.tsx` + `DeliveryTimeline` — 5-step timeline from `events`; timestamps only from OrderEvent; foreign order → redirect; terminal cancelled/discrepancy.
- [x] 3.6 `DeliveredDetail` + `RebuyButton` (delivered only).
- [x] Prerequisite types in `lib/api.ts`: `OrderEventType`, `OrderEvent`, `Order.events`. **Deviation**: tasks.md lists these under 5.1, but `/orders/[id]` needs them at compile time, so they landed in slice 3. Task 5.1 retains only its own deltas (APIError.code, TOTP helpers).

**Verification (slice 3 gate)**: `npm run build` — exit 0, `✓ Compiled successfully in 1161ms`, 15 routes. `npm run lint` — exit 0, `✖ 4 problems (0 errors, 4 warnings)` (pre-existing `<img>`). `manage.py test orders` — 80 tests OK (skipped=1), no backend touched.

**Work-unit commits**: `23b8bc1`, `c11d5ae`, `cfac379`, `f9a152e`, `7821387`, `edcc194`, `b8db3ad`.
**Review budget**: ~1,581 changed lines → `size:exception`.

---

## Slice 4 — Staff routes (branch `feat/vibrant-redesign-slice4-staff-routes`)

- [x] 4.1 NEW `StaffKpiRow.tsx` + `StatusFilterChips.tsx`; `OrdersDashboard.tsx` wired with KPI row, chips, `DiscrepancyModal`; `DiscrepancyPanel.tsx` restyled; `app/admin/orders/page.tsx` header tokens.
- [x] 4.2 `app/bodega/page.tsx` full restyle + `InventoryView.tsx` / `DispatchRoutesView.tsx`; `app/despacho/page.tsx` was already token-clean → no changes.
- [x] 4.3 `StaffUserForm.tsx` / `StaffUserList.tsx` restyle; `app/admin/staff/page.tsx` + `StaffManagementView.tsx` already clean → no changes.
- [x] 4.4 `app/profile/page.tsx` + `app/register/page.tsx` restyle.

**Verification (slice 4 gate)**: `npm run lint` — exit 0, `✖ 4 problems (0 errors, 4 warnings)`. `npm run build` — exit 0, `✓ Compiled successfully in 1149ms`, 15 routes. `manage.py test orders` — 80 tests OK (skipped=1).
One TS error fixed during the slice: `DiscrepancyModal` destructured `order` param did not narrow inside the `handleSubmit` closure → added an explicit guard.

**Work-unit commits**: `1fedff8`, `923a0d8`, `bc84744`, `ac836c4`.
**Review budget**: 679 additions / 256 deletions → `size:exception`.

---

## Task 1.4 — Radius ramp on `components/ui/*` (this work unit)

Scope: `frontend/components/ui/*` only. No new dependencies, no new components, no backend, no 2FA work.

### Radius values used (single source of truth)

`spec.md` "Radius and Elevation Scale" + `docs/designs/DESIGN.md` "Shapes", resolved against the `@theme inline` radius ramp already registered in `globals.css`:

| Element | Class | Resolved value |
|---|---|---|
| Card | `rounded-2xl` | 1rem (DESIGN: 1rem–1.25rem) |
| Button (all sizes) | `rounded-xl` | 0.75rem (DESIGN: 12px) |
| Badge | `rounded-full` | 9999px (DESIGN: 9999px) |

### Files changed

| File | Change |
|---|---|
| `components/ui/card.tsx` | `Card` base `rounded-xl` → `rounded-2xl`; the two image corner clips `*:[img:first-child]:rounded-t-xl` / `*:[img:last-child]:rounded-b-xl` → `-2xl`; `CardHeader` `rounded-t-xl` → `rounded-t-2xl`; `CardFooter` `rounded-b-xl` → `rounded-b-2xl` |
| `components/ui/button.tsx` | base `rounded-lg` → `rounded-xl`; removed the four size-level `rounded-[min(var(--radius-md),10px|12px)]` overrides (xs, sm, icon-xs, icon-sm) that pinned small buttons to 6px; their paired `in-data-[slot=button-group]:rounded-lg` → `:rounded-xl` so a button group cannot lower the ramp |
| `components/ui/badge.tsx` | `rounded-4xl` → `rounded-full` |

### Deliberately not changed

- `components/ui/separator.tsx` — a 1px rule with no radius; the spec mapping does not cover it.
- `components/ui/skeleton.tsx` — `rounded-md` placeholders are not cards/buttons/inputs/badges; they stand in for arbitrary content and are shaped per usage. Outside the enumerated mapping, so left alone per "change only what task 1.4 requires".
- `components/Navbar.tsx` — its search/cart inputs still carry `rounded-lg`. It is a page surface but **not** under `components/ui/*`, so it is outside task 1.4's stated scope. **Open gap — see Risks.**
- `globals.css` — `--radius` is already `0.5rem` (≠ 0.625rem) and the full ramp is registered, so the spec scenario "`--radius` no longer equals 0.625rem" is already satisfied. That file belongs to task 1.1.

### Findings

1. **There is no input primitive in `components/ui/*`.** The directory contains exactly five files: `badge`, `button`, `card`, `separator`, `skeleton`. The "inputs rounded-xl" half of task 1.4 therefore has no primitive to restyle — the app's inputs already carry `rounded-xl` from slices 3/4 (verified: `app/products/page.tsx` search + select, `app/profile/page.tsx` inputClass, `app/register/page.tsx`, `StaffUserForm.tsx` fieldClasses). No input component was invented, since that would be new code rather than a restyle.
2. **The `min(var(--radius-md),Npx)` overrides were the real radius bug.** `--radius-md` resolves to `0.375rem`, so `min(6px, 10px)` / `min(6px, 12px)` both collapsed to 6px — `size="xs"`, `size="sm"`, `size="icon-xs"` and `size="icon-sm"` buttons were rendering at 6px regardless of the base value. Those four sizes are live in the app (20+ call sites, mostly `app/cart/page.tsx` and the staff/admin views), so leaving them would have made the "ramp" inconsistent inside the very component being ramped.
3. **Small buttons become lozenges by design.** At `h-6`/`h-7`/`size-6`/`size-7`, a 12px radius is a full pill. This matches DESIGN.md ("Balanced radius providing a modern pill-adjacent touch target") and the badge precedent in this very codebase (`h-5` with a pill radius). Flagged so the reviewer is not surprised.
4. Accessibility untouched: no `focus-visible:ring-*`, no `aria-invalid:*`, no `disabled:*`, no `data-slot`/`aria-*` attribute and no semantic markup was altered. Pure class-value restyle.
5. `--radius` and the `@theme inline` radius ramp were already correct from task 1.1 — no duplicate work needed.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm run lint` (workdir `frontend/`) — exit 0, `✖ 4 problems (0 errors, 4 warnings)`; the 4 are the pre-existing `@next/next/no-img-element` warnings at `app/cart/page.tsx:157`, `app/checkout/page.tsx:594`, `app/products/[id]/page.tsx:226`, `components/ProductCard.tsx:82` — identical to slices 1–4, none in a changed file |
| Runtime harness command/scenario and exact result | `npm run build` (workdir `frontend/`) — exit 0, `✓ Compiled successfully in 1738ms`, TypeScript finished, all 15 routes emitted (`/`, `/admin`, `/admin/orders`, `/admin/staff`, `/bodega`, `/cart`, `/checkout`, `/despacho`, `/login`, `/orders`, `/orders/[id]`, `/products`, `/products/[id]`, `/profile`, `/register`) |
| Rollback boundary | Revert `frontend/components/ui/card.tsx`, `button.tsx`, `badge.tsx` only. Class-value-only change confined to three primitive files; no consumer file edited, no new file, no dependency, no API/schema change. Reverting restores the previous radius without affecting slices 2–4 |

### Deviations from design.md

None. The design's Design-System table (ramp `.25/.75/1/1.5rem` → cards `rounded-2xl`, inputs `rounded-xl`, badges `rounded-full`) is implemented verbatim.

---

## Remaining work

- [ ] 5.4 QR render on `/admin/2fa` — the only open item in the whole change.

---

## Slice 5 — 2FA enroll + login TOTP (branch `feat/vibrant-redesign-slice5-2fa`)

Frontend only. **No file under `backend/` was created, modified or deleted** (`git status --porcelain` shows only `frontend/` paths).

- [x] 5.1 `frontend/lib/api.ts` — `APIError.code` (machine-readable id, e.g. `totp_required`); module-level `totpCode` with `setTOTPCode` / `clearTOTPCode` / `getTOTPCode`; `isTOTPCodeRequired(error)` guard; `performFetch` attaches `X-TOTP` from a helper that **never** returns it for `/users/login/` or `/users/register/`; `fetchAPI` intercepts `totp_required` **before** the refresh policy; `refreshToken()` sends the stored code; `logout()` clears it; `getProfile({totp?})` sends a one-off code. `FetchOptions` gained `totpCode?`, destructured out before `fetch` so it never reaches the payload.
- [x] 5.2 `enroll2FA()` → POST `/users/2fa/enroll/`, `confirm2FA(deviceId, code)` → POST `/users/2fa/confirm/`, both through `fetchAPI`, plus the exported `TwoFAEnrollment` type.
- [x] 5.3 `frontend/app/login/page.tsx` — `apiLogin` → `getProfile()` probe → on `totp_required` the `TOTPChallengeStep` renders. A valid code re-probes with `X-TOTP` and establishes the session with the profile that probe returned; a wrong code clears the stored code and keeps the step open. Unaffected users are logged in by the same probe with no challenge.
- [x] 5.4 `frontend/app/admin/2fa/page.tsx` — NEW page under `RequireRole ["admin"]`, plus `TwoFAEnrollView`, `TOTPSecretCard`, `TOTPConfirmForm`. Enroll → QR + Base32 secret + copy → confirm; invalid code surfaces the backend message and keeps the device pending; a 400 on enroll renders the backend's already-confirmed message; non-admins are redirected by the existing guard. The QR renders client-side via `qrcode.react`'s `QRCodeSVG` (level M, 4-module quiet zone, literal `#131b2e` on `#ffffff`) — maintainer-approved dependency closing the spec MUST.

### Backend contract this slice was written against (read, not guessed)

`backend/users/urls.py` (`2fa/enroll/`, `2fa/confirm/`), `views.py` `TwoFAEnrollView`/`TwoFAConfirmView` (201 `{device_id, secret, provisioning_uri}`; 200 `{confirmed: true}`; 400 `{error: …}`; `[IsAuthenticated, IsAdmin]` → 403), `authentication.py` `_validate_expiry_and_2fa` (401 `{detail: 'Código TOTP requerido', code: 'totp_required'}`), and `tests.py` `TwoFAEnrollConfirmTests` / `TwoFAGateTests` (lines 614–728) as the executable spec. `settings.py:55` — `DJANGO_2FA_ENFORCED` is **default off**, env-driven; untouched.

### Frontend-vs-backend discrepancies found

1. **`{error: …}` bodies were being swallowed.** Both 2FA views and `RefreshTokenView` answer `{'error': '…'}`, but `performFetch` only read `detail` and `message`, so every one of those responses surfaced the literal fallback `'Error en la petición'`. Fixed in 5.1 by reading `error` alongside `message`; without it, task 5.2's "carries the backend's 400 message" and task 5.4's "surface the backend error" are unimplementable.
2. **`performFetch` ignored `X-TOTP` entirely** (no header was ever built) — expected, it is the task.
3. **`OrderEventType` / `OrderEvent` / `Order.events` already existed** in `lib/api.ts` from slice 3 and are correct against `OrderEventSerializer` (verified, not duplicated, not renamed).
4. **No QR capability existed in the dependency graph.** `package.json` had no QR package and none was present in `node_modules`; the only QR thing in the frontend was the lucide `QrCode` icon. `design.md` had already chosen a `qrcode` package. Resolved by maintainer decision: `qrcode.react@4.2.0` added, rendering SVG inline (no canvas, no data-URI round-trip, no third-party image service that would ship the TOTP secret off-host).

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm run lint` (workdir `frontend/`) — exit 0, `✖ 4 problems (0 errors, 4 warnings)`; the 4 are the pre-existing `@next/next/no-img-element` warnings at `app/cart/page.tsx:157`, `app/checkout/page.tsx:594`, `app/products/[id]/page.tsx:226`, `components/ProductCard.tsx:82` — byte-identical to slices 1–4 and none in a file this slice touched |
| Runtime harness command/scenario and exact result | `npm run build` (workdir `frontend/`) — exit 0, `✓ Compiled successfully in 2.1s`, `Finished TypeScript in 3.9s`, **16 routes** emitted, including the new `/admin/2fa`, alongside `/login`, `/orders/[id]`, `/admin/orders`, `/admin/staff`. Backend regression: `.venv\Scripts\python.exe manage.py test users` (workdir `backend/`) — `Ran 76 tests in 68.342s` / **OK** |
| Rollback boundary | Revert `frontend/lib/api.ts` and `frontend/app/login/page.tsx`, and delete `frontend/app/admin/2fa/`, `frontend/components/admin/TwoFAEnrollView.tsx`, `TOTPSecretCard.tsx`, `TOTPConfirmForm.tsx`. All new components are referenced only by the new page; no slice 1–4 file is edited except `api.ts` (additive: `APIError.code`, the TOTP block, two endpoint functions, the `logout`/`getProfile` signatures) and `login/page.tsx`. Reverting restores pre-slice behaviour with no database, migration or dependency change |

### Deviations from design.md

- `design.md` "Icons+QR → `qrcode` pkg canvas" was applied as `qrcode.react`'s `QRCodeSVG` instead of a canvas renderer — same dependency class, but it emits an inline `<svg>`, which needs no canvas ref, no `toDataURL` round-trip and no client-only mount guard. The QR colors are literal hex (`#131b2e` / `#ffffff`) rather than CSS vars on purpose: an unresolvable var leaves the SVG `fill` invalid and the code unscannable, and an unscannable QR locks an admin out. Hand-rolling a QR encoder was rejected for the same reason — ~300-400 lines of Reed-Solomon with no frontend test runner to validate it.
- Task 5.1's type clause was already satisfied by slice 3 (recorded deviation in slice 3's progress); 5.1 kept only its own deltas.
- `login/page.tsx`'s `inputClass` was moved from the legacy `rounded-lg` / `border-border` / `ring-ring` tokens to the ramp tokens (`rounded-xl`, `border-outline-variant`, `focus-visible:border-primary focus-visible:ring-primary/40`) so the new TOTP input does not sit next to a stale one. One shared constant; no restyle of the password form itself.

### Risks / not verified (slice 5)

- **5.4 QR resolved** by maintainer decision (`qrcode.react`), see Deviations. The spec MUST is satisfied.
- **No visual/runtime smoke was possible** (no browser in this environment). The happy path, the wrong-code path, the already-confirmed path and the non-admin redirect are all unexercised at runtime; they are argued from the backend tests, not observed. The 2FA gate is also **off by default** (`DJANGO_2FA_ENFORCED=False`), so the login challenge is inert until that env flag is set — no frontend-only change can demonstrate it.
- **Pre-existing bug, not fixed here (out of scope):** `--color-error-container` and `--color-on-error-container` are defined in `:root` but **not** registered in `@theme inline` (`app/globals.css:53-55` vs `117-118`), so `bg-error-container` / `text-on-error-container` emit no CSS. Slice 4 shipped those classes in `app/bodega/page.tsx:268`, `app/register/page.tsx:89` and `components/admin/StaffUserForm.tsx` — the same class of bug slice 3 fixed for `--color-on-primary`. New code in this slice deliberately uses only registered tokens (`bg-error/10`, `text-error`, `bg-error text-on-error`).
- `DJANGO_2FA_ENFORCED` was **not** enabled anywhere (backend untouched by design).

**Work-unit commits**: 703 authored changed lines (api 164, login 192, admin/2fa page 25, `TwoFAEnrollView` 136, `TOTPConfirmForm` 97, `TOTPSecretCard` 89) → **size:exception** against the 400 budget; three commits (api 164 / login 192 / admin-2fa 347) each land under it.

### Findings worth remembering

- A TOTP 401 must never reach the refresh path: refreshing would 401 identically and `setActiveToken()` would tear down a perfectly valid session. The interception has to be the first statement in `fetchAPI`'s catch.
- The `X-TOTP` code is only meaningful once a session exists, so the credential endpoints are excluded by an explicit `NO_TOTP_HEADER_ENDPOINTS` list rather than by "it wouldn't matter".
- This backend answers errors under three different keys (`detail`, `error`, `message`); the client must read all three or messages are silently lost.
- **The backend 2FA gate is a blanket per-request check, not a per-endpoint policy.** `_validate_expiry_and_2fa` (`backend/users/authentication.py:58-70`) has no exemption list, so *every* token-authenticated request from a user with a confirmed device needs `X-TOTP` — including `/users/logout/`. The first implementation of `logout()` cleared the code before sending, which 401'd the logout, left the httpOnly cookie in the browser and kept the token valid server-side for its full 24h TTL: not a logout at all. Fixed to `try { fetch } finally { clearTOTPCode() }` (commit `733fd5c`). Any future auth-state endpoint needs the same audit.
- **OPEN, out of this change's spec scope — enrolling 2FA mid-session locks the admin out.** The moment `confirm2FA` commits, the device is `confirmed=True` and the gate starts demanding `X-TOTP` on the *current* session. `TOTPConfirmForm` never calls `setTOTPCode`, so the in-memory code is null; the next navigation 401s with `totp_required`; the only component that can answer that code is `login/page.tsx`, because `specs/two-factor-auth/spec.md` scopes the challenge to "After a successful password login". And the code lives ~30s (one TOTP step), so even "log out and back in" is unreliable — the admin has to clear cookies by hand. Fixing it properly needs a global `totp_required` handler (challenge reachable from any authenticated surface), which is a new requirement, not a bug fix. Mitigated today only because `DJANGO_2FA_ENFORCED` defaults to off. **Verify ruled this a spec GAP, not a spec contradiction** — the earlier "the spec contradicts itself" framing above was mine and it was wrong: no requirement mentions session continuity, so there is nothing to contradict. The mechanism is real; the classification is "missing requirement", and it belongs to a new change.

**Work-unit commits**: `733fd5c` (api.ts 5.1/5.2, 161 lines), `c528241` (login 5.3, 186 lines), and this QR/2FA-page unit. Work-unit total was 815 lines against the 400 budget → **size:exception approved by the maintainer** and recorded in the runtime ledger; every individual commit is under 400.

## Post-verify outcome — this change is NOT archived

Final verification ran against HEAD `8e515dd` and returned verdict **`fail`** (`verify-report.md`, 264 lines, 19 requirements / 44 scenarios validated). The build and lint gates are green; the failure is in the spec-to-code trace, not in the gates.

The maintainer decided to stop remediating here rather than expand this change, so exactly one fix was applied afterwards:

- **CRITICAL-2 fixed** — `--color-error-container` and `--color-on-error-container` registered in `@theme inline` (`app/globals.css`, mirroring the primary/secondary ordering). Proof rather than assumption: `.bg-error-container` and `.text-on-error-container` are now present in the built stylesheet, and were absent from it before. This repaired 25 dead class usages across 8 files.

Everything else the verify surfaced is deferred to a new change (`frontend-design-system-followups`), and is **not** a regression introduced by this change:

| Deferred item | Nature |
|---|---|
| Typography MUSTs: `--font-label` registered but 0 usages, type scale untokenized | Missing implementation of task 1.2's requirement |
| `--text-muted` at 4.26:1 vs WCAG AA 4.5:1 | Upstream in DESIGN.md; the pre-swap value was worse (2.70:1) |
| Elevation clause of the Radius and Elevation Scale requirement | Unimplemented design-system clause, no shadow tokens exist |
| `manage.py test` exits 1 on a missing WhiteNoise manifest | Environmental: `STORAGES` uses `CompressedManifestStaticFilesStorage` and `backend/staticfiles/` is absent. Note `backend/staticfiles/` is **not** gitignored, so a bare `collectstatic` is not a safe fix — it needs a `.gitignore` entry or a test-runner storage override |
| 5 more unregistered `@theme` tokens (tertiary set, `on-background`) | Same trap as CRITICAL-2, currently unused so harmless |
| `rounded-lg` left on 2 `<button>`s in `components/Navbar.tsx` | Task 1.4 completeness |
| 2FA enrollment lockout | Spec gap (see above) |
| 23 of 44 scenarios without runtime evidence | This project has no frontend test runner and no browser was available; `npm run build` + `npm run lint` are the only frontend gates by project convention |

Next recommended: do not archive this change. Open `frontend-design-system-followups` with its own proposal and spec, and carry the table above as its input.
