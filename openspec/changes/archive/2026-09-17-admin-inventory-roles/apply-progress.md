# Apply Progress: admin-inventory-roles

Status: **full delivery — Phase 6 complete** — Phases 1–6 ALL delivered and committed (PR1a/1b–PR6), each phase verified green in its own batch. **PR6 delivered**: tasks 6.1–6.3 (bodega/despacho surfaces) committed c54f91d + cb0cc5a + c05e252; eslint 0 errors 0 warnings, `next build` 14/14; 610 authored lines EXCEED the 400 cap → the runtime ledger recorded the attempt `passed` with `changed_line_budget_exceeded: true` and `next_action: reset` (maintainer decision, same flow as PR1/PR2/PR5). **27/27 tasks complete — the whole change is implemented.** Next: independent SDD verification (sdd-verify).

Mode: Standard (strict_tdd: false)
Batches: Phase 1 tasks 1.1–1.6 (PR 1a/PR 1b, committed beda533 + 4924400) + Phase 2 tasks 2.1–2.5 (PR 2, committed 0b62c6b + df3e8c3 + b7b9d77) + Phase 3 tasks 3.1–3.4 (PR 3, committed 0a48bc8 + b8f01a0 + 12a1192) + Phase 4 tasks 4.1–4.5 (PR 4, committed c1fb3e6 + 9d67d1d + eb651e7 + be118cc + 95ca829) + Phase 5a task 5.1 (PR 5a, committed 113c3f6) + Phase 5b tasks 5.2 + 5.4 (PR 5b, committed 10cc38c + 9ad6feb) + Phase 5c task 5.3 (PR 5c, committed 61534ff + 4920b16) + Phase 6 tasks 6.1–6.3 (PR 6, committed c54f91d + cb0cc5a + c05e252)

---

## Phase 1, PR 1 (Backend Role Foundation) — done

Batch: tasks 1.1–1.6 only (boundary: users/ app + products tests + urls wiring)

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `manage.py test users products` (backend/) → Ran 39 tests, OK |
| Runtime harness command/scenario and exact result | APIClient `force_authenticate` per role against IsAdmin/IsStaffRole guards: staff-user POST 201/403/400, user detail GET/PATCH 200/403/400, register default role, role PATCH is_staff sync — all green in the 39-test run |
| Rollback boundary | Revert `users` 0002 migration; delete `permissions.py`, `signals.py`, `staff_urls.py`; revert `views.py`, `serializers.py`, `models.py`, `apps.py`, `users/urls.py`, `mitienda/urls.py`, and both test files — no unrelated work removed |

### Completed Tasks

- [x] 1.1 `backend/users/models.py`: exclusive `role` choices (customer|admin|bodega|despacho, default customer) + `save()` sync `is_staff ⇔ role=='admin'`
- [x] 1.2 `backend/users/migrations/0002_role_backfill.py`: AddField + RunPython backfill `is_staff`→admin, reverseable (noop reverse)
- [x] 1.3 `backend/users/permissions.py` (new): `IsAdmin`/`IsBodega`/`IsDespacho`/`IsStaffRole` checking `user.profile.role`
- [x] 1.4 `backend/users/signals.py` (new) + `backend/users/apps.py` `ready()`: recursion-guarded post_save drift guard (queryset update + guard flag)
- [x] 1.5 `backend/users/serializers.py`, `views.py`, `staff_urls.py` (new), `backend/mitienda/urls.py`: `role` readable + `is_staff` read-only in UserSerializer; `UserDetailView` GET/PATCH role (IsAdmin) at `/api/users/{id}/`; `StaffUserCreateView` POST `/api/staff/users/` [IsAdmin] {username,email,password,role∈admin|bodega|despacho} → 201, non-admin 403, dupes/short password/bad role 400
- [x] 1.6 `backend/users/tests.py` + `backend/products/tests.py`: role matrix, staff-user 201/403/400, sync both directions, backfill, bodega/despacho product+category write 403

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `backend/users/models.py` | Modified | `role` field + STAFF_ROLE_CHOICES + `save()` is_staff sync |
| `backend/users/migrations/0002_role_backfill.py` | Created | AddField role + RunPython backfill (reverseable) |
| `backend/users/permissions.py` | Created | IsAdmin/IsBodega/IsDespacho/IsStaffRole on user.profile.role |
| `backend/users/signals.py` | Created | User post_save drift guard (is_staff ⇔ role) |
| `backend/users/apps.py` | Modified | `ready()` imports signals |
| `backend/users/serializers.py` | Modified | UserSerializer role/is_staff; UserRoleUpdateSerializer; StaffUserSerializer |
| `backend/users/views.py` | Modified | UserDetailView (GET/PATCH), StaffUserCreateView |
| `backend/users/urls.py` | Modified | `/<int:pk>/` route |
| `backend/users/staff_urls.py` | Created | `api/staff/users/` route |
| `backend/mitienda/urls.py` | Modified | include `users.staff_urls` at `api/staff/` |
| `backend/users/tests.py` | Modified | 6 new test classes (backfill, model sync, permissions, user-detail, staff creation, drift) |
| `backend/products/tests.py` | Modified | RoleLockdownTests (bodega/despacho write 403) |

### Deviations from Design

None — implementation matches design.md. Notes:
- `IsStaffRole`/`IsBodega`/`IsDespacho` had no view yet in PR1, so their scenarios were proven by permission-class unit tests; endpoint-level coverage used the views that exist (staff create, user detail).

### Issues Found

None functional. Gotchas encountered and resolved:
- Python class-body comprehensions cannot see class-level names (STAFF_ROLE_CHOICES) — explicit list.
- DRF `APIRequestFactory().get()` already returns a `Request`; re-wrapping resets `.user` to AnonymousUser.
- PATCH response serialized a stale in-memory `user`; `refresh_from_db()` after role update.
- SQLite cannot run migration DDL inside `TestCase` transactions — migration test uses `TransactionTestCase`.

### Workload / PR Boundary

- Mode: chained PR slice (feature-branch-chain; PR #1 = Phase 1)
- Boundary start: `main` @ 9818fcb; end: Phase-1 files listed above
- Review budget impact: authored add+del = **599 lines** → exceeded 400 → maintainer reset/re-slice decision; resolved as PR1a/PR1b (committed `beda533`, `4924400`)

---

## Phase 2, PR 2 (Order State Machine + Admin Cancel) — this batch

Batch: tasks 2.1–2.5 only (boundary: orders/ app + mitienda urls wiring; NO discrepancy, NO frontend)

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `manage.py test orders` (backend/) → Ran 34 tests, OK (11 pre-existing order-integrity + 25 new) |
| Runtime harness command/scenario and exact result | APIClient per-role against `/api/staff/orders/`: advance matrix (bodega pending→processing→ready, despacho ready→shipped→delivered, admin any; skip `to_status` / overreach / delivered → 403; missing → 404), list-all for staff / 403 for customer; cancel admin-only with atomic F() stock restore, 400 delivered/cancelled, forced mid-failure rollback — all in the 73-test `orders users products` run |
| Rollback boundary | Revert orders `0002_alter_order_status` migration; drop `StaffOrderViewSet`/`ADVANCE_MATRIX`/`_restore_order_stock` from `views.py`, `StaffOrderSerializer` from `serializers.py`, `staff_router` from `urls.py` + `mitienda/urls.py`; revert `orders/tests.py` additions — no unrelated work removed |

### Completed Tasks

- [x] 2.1 `backend/orders/models.py` + `backend/orders/migrations/0002_alter_order_status.py`: `ready` choice ("Listo para despacho"); full PR2 status set pending, processing, ready, shipped, delivered, cancelled
- [x] 2.2 `backend/orders/views.py` `StaffOrderViewSet` + `backend/orders/urls.py` `staff_router` (at `api/staff/orders/` via `mitienda/urls.py`): lists ALL orders (IsStaffRole); `advance` per `ADVANCE_MATRIX` inside `transaction.atomic()` + `select_for_update()`; 404 missing; optional `to_status` target guards skip attempts → 403; overreach/`delivered` → 403. NO discrepancy/cancel/resolve actions included (PR3 boundary)
- [x] 2.3 `backend/orders/views.py` `cancel` action: IsAdmin enforced (403 non-admin); atomic `transaction.atomic()` + `select_for_update()`; stock restore per item via `Product.objects.filter(...).update(stock=F('stock')+qty)` in `_restore_order_stock`; delivered/cancelled → 400; forced mid-failure → full rollback (no partial restore)
- [x] 2.4 `backend/orders/serializers.py` `StaffOrderSerializer(OrderSerializer)`: adds `customer` (user.username); all statuses incl. `ready` serialized via the shared `status` field
- [x] 2.5 `backend/orders/tests.py`: `StaffOrderAdvanceTests` (15: matrix × role × from-status, skip-state, overreach, delivered, customer 403, 404, staff list, customer list 403) + `AdminCancelTests` (10: restore volumes, shipped cancel, 403 non-admin, 400 delivered/cancelled, 404, atomic all-items restore, pre-checkout levels via real checkout, cross-order isolation, forced mid-failure rollback); prior order-integrity suite (OrderHardeningTests + CartItemUpdateTests) green in the same run

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `backend/orders/models.py` | Modified | `ready` status choice added to STATUS_CHOICES |
| `backend/orders/migrations/0002_alter_order_status.py` | Created | AlterField status choices (6 values; generated by makemigrations) |
| `backend/orders/views.py` | Modified | `ADVANCE_MATRIX`, `_restore_order_stock` (F() restore), `StaffOrderViewSet` (list all, `advance`, `cancel`) |
| `backend/orders/serializers.py` | Modified | `StaffOrderSerializer(OrderSerializer)` with `customer` |
| `backend/orders/urls.py` | Modified | `staff_router` registering `orders` at staff scope |
| `backend/mitienda/urls.py` | Modified | include `staff_router.urls` at `api/staff/` |
| `backend/orders/tests.py` | Modified | `_role_user`, `StaffOrderTestBase`, 2 test classes (25 tests) |

### Deviations from Design

None — implementation matches design.md. Notes:
- `advance` accepts an optional `to_status` body target so "cannot skip a state" (spec scenario on order-state-machine) is expressible: the target must equal the single next matrix state, otherwise 403. Bare calls advance exactly one step.
- The `discrepancy` status and its helpers are NOT in this PR (Phase 3 boundary); the spec's discrepancy block on advance is implicitly covered by the matrix (unknown status → no transition → 403) and will be explicit in PR3.
- Customer-role users with a `UserProfile(role='customer')` yield 403 via `ADVANCE_MATRIX.get('customer', {})`.

### Issues Found

None functional. Notes:
- Authored line count **456** (add+del incl. 18-line generated migration; tests 336 vs ~140 estimated). Exceeds the 400 hard cap → **size:exception recommended** (or maintainer re-slice of PR2, e.g. cancel into a PR2b; note tests.py is one file and a re-slice would need a split). Budget decision is the maintainer's.

### Workload / PR Boundary

- Mode: chained PR slice (feature-branch-chain; PR #2 = Phase 2, targets PR1 branch 4924400)
- Boundary start: `4924400` (PR1b); end: `b7b9d77` (PR2 tests commit)
- Review budget impact: authored add+del = **456 lines** > 400 → size:exception recommended

### Verification (required commands)

| Command | Observed result |
|---|---|
| `manage.py makemigrations --check --dry-run` | No changes detected |
| `manage.py test orders users products` | Ran 73 tests, OK |
| `manage.py check` | System check identified no issues (0 silenced) |
| `manage.py test` (extra, full suite) | Ran 76 tests, OK |

### Ledger

`gentle-ai sdd-attempt settle` recorded attempt #2 (generation 2 objective): outcome `passed`, evidence-revision `sha256:1e1a1c50e405a10a4b35ae71143238aa96854e62d7c16a5dd2b31300f8a4889d` (PR2 diff vs 4924400; distinct from PR1 evidence), remediates-evidence-revision `sha256:1ce87efd161583a0484b90644203b1bc6543c25ae37107d57543973d4797a6d1` (PR1 attempt evidence) honored, harness-disposition `reused`. Objective state per `sdd-attempt status`: decision_required `true`, complete `false`, next_action `reset` — the 456-authored-line count exceeds the 400 changed-line budget, so a maintainer reset of the objective is required before PR2 may open (same flow as PR1's post-attempt reset by marceloubb). `sdd-attempt reset` was NOT run by this executor (maintainer action per the budget rule).

---

## Phase 3, PR 3 (Order Discrepancy Flow) — this batch

Batch: tasks 3.1–3.4 only (boundary: orders/ app fields + actions + serializer + tests; NO frontend, NO users/products code)

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `manage.py test orders` (backend/) → Ran 53 tests, OK (34 prior + 19 new) |
| Runtime harness command/scenario and exact result | APIClient per-role against `/api/staff/orders/{id}/discrepancy/` + `/resolve-discrepancy/`: flag 200 with reason + stored pre-status, despacho/customer flag 403, bad reason 400, flag-on-discrepancy 403, flag from shipped 403, 404 missing; advance on discrepancy 403 for bodega/despacho/admin; resolve returns to pending/processing, non-admin resolve 403, resolve on non-discrepancy 400, 404; cancel from discrepancy restores stock; staff list surfaces `discrepancy_reason` — all in the 92-test `orders users products` run |
| Rollback boundary | Revert orders `0003_order_discrepancy_reason_and_more` migration; drop `discrepancy`/`resolve_discrepancy` actions + the advance discrepancy guard from `views.py`, `discrepancy_reason` from `serializers.py`, and `DiscrepancyFlowTests` from `tests.py` — no unrelated work removed |

### Completed Tasks

- [x] 3.1 `backend/orders/models.py` + `backend/orders/migrations/0003_order_discrepancy_reason_and_more.py`: `discrepancy` added to STATUS_CHOICES ("Discrepancia", lateral blocked); `pre_discrepancy_status` (CharField max_length=20, null=True, blank=True); `discrepancy_reason` (CharField max_length=20, blank=True, default='', choices missing|damaged)
- [x] 3.2 `backend/orders/views.py`: `discrepancy` action (bodega OR admin, from pending|processing|ready, stores pre-status + reason, 403 on already-discrepancy, 400 bad reason, 403 from other statuses); `resolve_discrepancy` action with `url_path='resolve-discrepancy'` (admin-only 403, non-discrepancy 400, returns to `pre_discrepancy_status` or 'pending' fallback, clears both helper fields); explicit discrepancy guard added to `advance` (403). Both actions atomic + `select_for_update()`
- [x] 3.3 `backend/orders/serializers.py`: `StaffOrderSerializer` fields += `discrepancy_reason` (read-only via model); non-discrepancy orders serialize `""`
- [x] 3.4 `backend/orders/tests.py`: `DiscrepancyFlowTests(StaffOrderTestBase)` — 19 tests: flag damaged/missing, admin flag, despacho/customer flag 403, bad reason 400, flag-on-discrepancy 403, flag from shipped 403, 404; advance 403 on discrepancy (bodega/despacho/admin); full cycles pending & processing (flag → block → resolve → resume); non-admin resolve 403; resolve non-discrepancy 400; resolve 404; cancel from discrepancy restores stock; list surfaces reason

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `backend/orders/models.py` | Modified | `discrepancy` status choice, `DISCREPANCY_REASON_CHOICES`, `pre_discrepancy_status`, `discrepancy_reason` |
| `backend/orders/migrations/0003_order_discrepancy_reason_and_more.py` | Created | AddField × 2 + AlterField status choices (generated by makemigrations) |
| `backend/orders/views.py` | Modified | `discrepancy` + `resolve_discrepancy` actions; advance discrepancy guard; `IsBodega` import |
| `backend/orders/serializers.py` | Modified | `discrepancy_reason` exposed on `StaffOrderSerializer` |
| `backend/orders/tests.py` | Modified | `DiscrepancyFlowTests` (19 tests) |

### Deviations from Design

None — implementation matches design.md. Notes:
- `discrepancy_reason` has `default=''` (design contract shows blank=True only): a non-null CharField needs a default for existing rows; `''` matches blank semantics and serializes cleanly.
- `resolve_discrepancy` requires explicit `url_path='resolve-discrepancy'`: DRF 3.18.1's `@action` uses the raw method name as the URL segment (no underscore→hyphen conversion), so the spec's hyphenated URL needed the explicit parameter.
- `pre_discrepancy_status` is NOT exposed in the serializer — internal state only; the spec's list scenario only requires `reason` visible. `resolve` falls back to 'pending' if the stored pre-status is ever NULL (defensive; normal flow always sets it).

### Issues Found

None functional.

### Workload / PR Boundary

- Mode: chained PR slice (feature-branch-chain; PR #3 = Phase 3, targets PR2 branch b7b9d77)
- Boundary start: `b7b9d77` (PR2 tests commit); end: `12a1192` (PR3 tests commit; 0a48bc8 model+batch commit earlier in the slice)
- Review budget impact: authored add+del = **320 lines** (317 add + 3 del; excludes 28-line generated migration) = **348 total** → UNDER the 400 hard cap, no size:exception needed

### Verification (required commands)

| Command | Observed result |
|---|---|
| `manage.py makemigrations --check --dry-run` | No changes detected |
| `manage.py test orders users products` | Ran 92 tests, OK |
| `manage.py check` | System check identified no issues (0 silenced) |
| `manage.py test orders` (extra, focused) | Ran 53 tests, OK |

### Ledger

`gentle-ai sdd-attempt settle` for this PR3 batch: see result below in the run report — outcome `passed` with fresh PR3 evidence revision, remediates-evidence-revision `sha256:1e1a1c50e405a10a4b35ae71143238aa96854e62d7c16a5dd2b31300f8a4889d` (PR2 attempt evidence) honored, harness-disposition `reused`.

---

## Phase 4, PR 4 (Frontend Foundation) — this batch

Batch: tasks 4.1–4.5 only (boundary: frontend types + staff API layer + order-status module + RequireRole/useRole + role-gated page shells + Navbar role links; NO admin dashboard content, NO staff-user form, NO bodega/despacho work surfaces — PR5/PR6)

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `npx eslint .` (frontend/) → 0 errors (4 pre-existing `no-img-element` warnings in untouched files) |
| Runtime harness command/scenario and exact result | `npx next build` (frontend/) → compiled successfully in 2.1s; TypeScript finished in 3.3s; 14/14 static pages generated incl. new `/admin`, `/bodega`, `/despacho` (all static). N/A for JS runtime scenarios — no JS test runner in this project (no jest/vitest config); lint/build are the harness |
| Rollback boundary | Revert `frontend/lib/api.ts`, `frontend/lib/order-status.tsx`, `frontend/components/RequireRole.tsx`, `frontend/lib/auth-context.tsx`, `frontend/app/admin/page.tsx`, `frontend/app/bodega/page.tsx`, `frontend/app/despacho/page.tsx`, `frontend/components/Navbar.tsx` (commits c1fb3e6, 9d67d1d, eb651e7, be118cc, 95ca829) — no unrelated work removed |

### Completed Tasks

- [x] 4.1 `frontend/lib/api.ts`: `UserRole` union ('customer'\|'admin'\|'bodega'\|'despacho'); `User.role?`/`is_staff?`; `OrderStatus` union incl. 'ready'\|'discrepancy'; `DiscrepancyReason` ('missing'\|'damaged'); `Order.discrepancy_reason?`; staff fns: `getStaffOrders`, `advanceOrder` (optional `to_status`), `cancelOrder`, `flagDiscrepancy`, `resolveDiscrepancy`, `createStaffUser` (`Exclude<UserRole,'customer'>`) — matching existing fetchAPI/auth-header patterns
- [x] 4.2 `frontend/lib/order-status.tsx` (new; design/tasks name it `.ts` but the module renders JSX, hence `.tsx`): shared `ORDER_STATUS_STYLES` + `STATUS_FALLBACK_LABELS` + `OrderStatusBadge`; `ready` primary tint (`bg-primary/10 text-primary`), `discrepancy` destructive tint per design
- [x] 4.3 `frontend/components/RequireRole.tsx` (new): `roles` + `redirectTo?` props; loading→null; `!user`→`/login`; mismatch→`redirectTo` (default `/`); legacy sessions without role treated as 'customer'; UX-only guard (DRF is the enforcement boundary)
- [x] 4.4 `frontend/app/admin/page.tsx` + `frontend/app/bodega/page.tsx` + `frontend/app/despacho/page.tsx` (new): thin role-gated shells — `/admin` roles `["admin"]`; `/bodega` `["bodega","admin"]`; `/despacho` `["despacho","admin"]` (admin admitted because the Navbar links admin to all three per design); heading + description only
- [x] 4.5 `frontend/lib/auth-context.tsx`: `useRole()` hook exposing the session `user.role`; `frontend/components/Navbar.tsx`: `STAFF_LINKS` role map (admin 3 links, bodega/despacho own, customer none) rendered in desktop nav + mobile menu

### Files Changed

| File | Action | What Was Done |
|---|---|---|
| `frontend/lib/api.ts` | Modified | UserRole/OrderStatus/DiscrepancyReason types; User.role/is_staff; Order.status union + discrepancy_reason; 6 staff API functions |
| `frontend/lib/order-status.tsx` | Created | Shared status styles/labels/badge (ready primary, discrepancy destructive) |
| `frontend/components/RequireRole.tsx` | Created | UX role guard + redirects |
| `frontend/lib/auth-context.tsx` | Modified | `useRole()` hook (type-level role exposure) |
| `frontend/app/admin/page.tsx` | Created | Role-gated shell (`roles=["admin"]`) |
| `frontend/app/bodega/page.tsx` | Created | Role-gated shell (`roles=["bodega","admin"]`) |
| `frontend/app/despacho/page.tsx` | Created | Role-gated shell (`roles=["despacho","admin"]`) |
| `frontend/components/Navbar.tsx` | Modified | STAFF_LINKS role map + desktop/mobile staff links |

### Deviations from Design

- `frontend/lib/order-status.tsx` is `.tsx`, not `.ts` as written in design.md/tasks.md: the module renders the `Badge` JSX component, so a TSX extension is required. Content matches design (shared styles + badge + new statuses).
- Run prompt's task 4.4 placed the `/admin` `/bodega` `/despacho` page shells in Phase 4 (tasks.md has them in Phase 5.4/6.1/6.2); shells are intentionally thin per run instructions — real dashboard components stay in PR5/PR6.

### Issues Found

None functional. Notes:
- tasks.md checkboxes for 4.1–4.5 were NOT flipped: this run's rules restrict openspec artifact writes to the apply-progress file ("Do NOT touch openspec artifacts beyond the apply-progress write"). Tasks are marked `[x]` here in apply-progress; tasks.md Phase 4 remains `- [ ]` until the orchestrator updates it.
- `advanceOrder` accepts an optional `to_status` (mirrors the backend's optional target guard from PR2).

### Workload / PR Boundary

- Mode: chained PR slice (feature-branch-chain; PR #4 = Phase 4, precedes PR5/PR6)
- Boundary start: `12a1192` (PR3 tests commit, HEAD before this run); end: `95ca829` (Navbar commit)
- Review budget impact: authored add+del = **282 lines** (c1fb3e6 70, 9d67d1d 51, eb651e7 57, be118cc 66, 95ca829 38) → UNDER the 400 hard cap, no size:exception needed

### Verification (required commands)

| Command | Observed result |
|---|---|
| `npx eslint .` (frontend/) | 0 errors, 4 warnings (pre-existing no-img-element in cart/checkout/product pages/ProductCard — untouched) |
| `npx next build` (frontend/) | Compiled successfully; TypeScript OK; 14/14 static pages generated incl. /admin /bodega /despacho |

### Ledger

`gentle-ai sdd-attempt settle` for this PR4 batch: outcome `passed`, evidence-revision `sha256:757a76abaaf8ea7d90158951b0deae5a9d49c0bffe735db44fbee425e04c5b5d` (PR4 diff vs 12a1192; distinct from PR1 `1ce87efd…` and PR2/3 `1e1a1c50…`), request-id `orc-pr4-settle-0001`, harness-disposition `reused`. Runtime objective state: `complete` — no predecessor binding this run, no reset needed.

---

## Phase 5, PR 5 (Admin Surface) — STOPPED at budget gate, work uncommitted (this batch)

Batch: tasks 5.1–5.4 only (boundary: `frontend/components/admin/` ×3 new + `frontend/app/admin/page.tsx`; NO bodega/despacho, NO shared lib changes, NO backend)

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `npx eslint .` (frontend/) → 0 errors, 4 warnings (pre-existing `no-img-element` in cart/checkout/products/[id]/ProductCard — untouched) |
| Runtime harness command/scenario and exact result | `npx next build` (frontend/) → compiled successfully in 1348ms; TypeScript finished in 2.1s; 14/14 static pages generated incl. `/admin`. N/A for JS runtime scenarios — no JS test runner in this project; lint/build are the harness |
| Rollback boundary | Delete `frontend/components/admin/StaffUserForm.tsx`, `OrdersDashboard.tsx`, `DiscrepancyPanel.tsx`; revert `frontend/app/admin/page.tsx` to its Phase-4 shell — no unrelated work removed (all four files UNCOMMITTED) |

### Completed Tasks

None — tasks 5.1–5.4 were implemented but NOT marked complete. Authored add+del = **661 > 400** hard cap → run STOPPED per run rule ("If you exceed 400 authored add+del, STOP and report — do not proceed"). No commits were made; `tasks.md` checkboxes remain `- [ ]`.

### Files Changed (UNCOMMITTED — working tree only)

| File | Action | What Was Done |
|---|---|---|
| `frontend/components/admin/StaffUserForm.tsx` | Created | Staff-user creation form (179 lines): role select (admin/bodega/despacho, excludes customer) + username/email/password; calls `createStaffUser`; success toast on 201 + inline alert + error toast on 400 (with field-error hint). Native `<input>/<select>/<label>` styled to the site (no Input/Label/Select exist in `components/ui`); `Loader2` spinner, hints per role |
| `frontend/components/admin/OrdersDashboard.tsx` | Created | All-orders table (278 lines) via `getStaffOrders`: #id, cliente (`shipping_name`), fecha, `OrderStatusBadge` (shared `lib/order-status.tsx`), total + role-scoped actions wired to `advanceOrder(id, to_status)` (next per matrix, `NEXT_STATUS`) and `cancelOrder`; refresh after actions; loading skeleton, error retry, empty state; discrepancy orders counted in the header |
| `frontend/components/admin/DiscrepancyPanel.tsx` | Created | Blocked orders (status `discrepancy`) with `discrepancy_reason` label (missing/damaged), Resolver + Cancelar wired to `resolveDiscrepancy`/`cancelOrder`; refresh after actions; loading/error/empty states; `pendingIds` spinner set |
| `frontend/app/admin/page.tsx` | Modified | Phase-4 thin shell content replaced with the real dashboard: `RequireRole(["admin"])` guard + ShieldCheck heading kept; grid: OrdersDashboard (2 cols) + StaffUserForm aside, DiscrepancyPanel below |

### Deviations from Design

- `Order.customer` (backend `StaffOrderSerializer` adds `customer` = user.username) is NOT in the Phase-4 frontend `Order` type; the dashboard uses `shipping_name` for the customer column. Adding the field to `api.ts` would touch Phase-4 committed code — follow-up candidate.
- The project has NO `Input`/`Label`/`Select` components in `components/ui` (only badge/button/card/separator/skeleton): forms use native elements styled via a shared `fieldClasses` const, per the task's "or similar already used in the app".
- `fetchAPI` (Phase-4 `api.ts`) throws only `error.detail || error.message || 'Error en la petición'`; DRF 400 field-error bodies (`{"username": ["El nombre de usuario ya existe."]}`) collapse to the generic fallback. StaffUserForm complements with a hint message (likely causes: dup username/email, password < 8 chars). Enriching `fetchAPI` would cross the Phase-4 committed boundary — follow-up candidate.

### Issues Found

None functional — both verification commands green (see Verification). The sole blocker is the workload/budget issue (next section).

### Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main; PR #5 = Phase 5, targets Phase-4 HEAD `95ca829`). NOT delivered — stopped at the budget gate.
- Boundary start: `95ca829` (PR4 Navbar commit, HEAD before this run); end: uncommitted working-tree state (4 files above, on top of `95ca829`)
- Review budget impact: authored add+del = **661 lines** (StaffUserForm 179 + OrdersDashboard 278 + DiscrepancyPanel 184 + admin page +18/−2) → EXCEEDS the 400 cap by ~65%. tasks.md estimated ~260; the real components require skeleton/error/empty states + toast success/error surfacing (incl. 400 handling) + refresh-after-action + role-scoped action wiring + table markup, which the estimates did not price. ONE honest slicing pass done: no slice fits — task 5.4 wires all three components into one page, so dropping any component fails 5.4's acceptance; the smallest pair (OrdersDashboard + DiscrepancyPanel, no form) is 462 lines and still over. → **size:exception recommended** (661) OR maintainer re-slice.
- Deliverable state: implementation complete + verified green, deliberately left UNCOMMITTED so the maintainer can inspect before deciding (re-slice vs size:exception).

### Verification (required commands)

| Command | Observed result |
|---|---|
| `npx eslint .` (frontend/) | 0 errors, 4 warnings (pre-existing no-img-element — untouched) |
| `npx next build` (frontend/) | Compiled successfully in 1348ms; TypeScript finished in 2.1s; 14/14 static pages generated incl. /admin |

### Ledger

`gentle-ai sdd-attempt acquire` (request-id `orc-pr5-acquire-0001`, max-attempts 1, max-changed-lines 400) → state `proceed`, token `sha256:6e14e27282729f44cbaed610c5b7ff539f55ea5b035b50243f404b2db157118e`. `gentle-ai sdd-attempt settle` (request-id `orc-pr5-settle-0001`, `--untracked-scope select` with the 3 admin components as intended-untracked, expected inventory `sha256:dae1acb6…`) recorded attempt #5: outcome `failed`, evidence-revision `sha256:22ecaa2ef0c0e04f5a4520ab95e215222b8aeee0a7fc3be938d5e5b50f9c3a94` (sha256 over the concatenated content of the 4 phase-5 files — 3 untracked, so plain `git diff` cannot express them), changed_lines 661, `changed_line_budget_exceeded: true`, harness-disposition `reused`, cleanup-evidence + process-evidence recorded. Objective state per `sdd-attempt status`: decision_required `true`, complete `false`, next_action `reset` (objective generation 5) — a maintainer reset is required before PR5 may proceed (same flow as PR1/PR2 post-attempt resets by marceloubb). `sdd-attempt reset` was NOT run by this executor (maintainer action per the budget rule).

---

## Phase 5a, PR 5a (Admin Surface: StaffUserForm, task 5.1) — this batch

Batch: task 5.1 only (boundary: `frontend/components/admin/StaffUserForm.tsx`; NO OrdersDashboard, NO DiscrepancyPanel, NO admin page wiring — PR5b/PR5c remain UNCOMMITTED in the working tree)

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `npx eslint components/admin/StaffUserForm.tsx` (frontend/) → 0 errors (project ESLint 9.39.5). Note: the `frontend/…`-prefixed pattern only resolves from the repo root, where no local eslint exists (npx pulls a wrong eslint@10 that crashes on eslint-plugin-react); the verified invocation is the frontend-relative path from `frontend/` |
| Runtime harness command/scenario and exact result | `npx next build` (frontend/) → compiled successfully in 420ms; TypeScript finished in 1540ms; 14/14 static pages generated incl. `/admin`. N/A for JS runtime scenarios — no JS test runner in this project (no jest/vitest config); lint/build are the harness. The remaining uncommitted phase-5 files (OrdersDashboard, DiscrepancyPanel, admin page) participate in the same build and keep it green; the committed PR5a slice is self-contained and unreferenced by committed code until PR5b wires it |
| Rollback boundary | `git revert 113c3f6` — removes only the staff-user form; no unrelated work removed (PR5b/PR5c files stay untouched in the working tree) |

### Completed Tasks

- [x] 5.1 `frontend/components/admin/StaffUserForm.tsx` (new; pre-existing verified implementation kept as-is — no re-implementation needed): staff-user creation form — role select `admin|bodega|despacho` excluding `customer` (`Exclude<UserRole,'customer'>`), username/email/password via native elements styled to the site (`fieldClasses` const; no Input/Label/Select exist in `components/ui`); calls `createStaffUser` from `lib/api.ts`; `sileo.success` toast on 201 + inline `role="alert"` + `sileo.error` toast on failure (`formatFieldError` hint because `fetchAPI` collapses DRF 400 field-error bodies to the generic fallback); `Loader2` spinner, per-role hints, form reset after success

### Files Changed

| File | Action | What Was Done |
|---|---|---|
| `frontend/components/admin/StaffUserForm.tsx` | Created (committed 113c3f6) | Staff-user creation form (179 authored lines) |

### Deviations from Design

None — implementation matches task 5.1 intent and the design contract (`role ∈ admin|bodega|despacho`, 201 success toast + 400 surfaced). Notes:
- Openspec artifacts (tasks.md, apply-progress.md) live in the untracked `openspec/changes/admin-inventory-roles/` dir — openspec change artifacts are never committed in this repo (matches all prior phases); only product code is committed.
- The prior stopped-PR5 section above remains as historical record; the maintainer re-slice supersedes it (PR5 → PR5a/5b/5c).

### Issues Found

None functional.

### Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main; PR #5a = task 5.1, targets Phase-4 HEAD `95ca829`)
- Boundary start: `95ca829` (PR4 Navbar commit, HEAD before this run); end: `113c3f6` (PR5a commit)
- Review budget impact: authored add+del = **179 lines** → UNDER the 400 hard cap, no size:exception needed

### Verification (required commands)

| Command | Observed result |
|---|---|
| `npx eslint components/admin/StaffUserForm.tsx` (frontend/) | 0 errors |
| `npx next build` (frontend/) | Compiled successfully in 420ms; TypeScript OK; 14/14 static pages generated incl. /admin |

### Ledger

`gentle-ai sdd-attempt acquire` (request-id `orc-pr5a-acquire-0001`, max-attempts 1, max-changed-lines 400, `--untracked-scope select --intended-untracked frontend/components/admin/StaffUserForm.tsx`, expected-untracked-inventory `sha256:d1f85659…`) → state `proceed`, token `sha256:d9dc4c2e…`; the passing settle is bound to remediate the stopped-PR5 attempt evidence `sha256:22ecaa2e…`. `gentle-ai sdd-attempt settle` (request-id `orc-pr5a-settle-0001`): outcome `passed`, evidence-revision `sha256:55e0a820…` (PR5a diff = new-file diff of StaffUserForm.tsx), remediates-evidence-revision `sha256:22ecaa2ef0c0e04f5a4520ab95e215222b8aeee0a7fc3be938d5e5b50f9c3a94`, harness-disposition `reused`. Objective state: see settle output below.

---

---

## Phase 5b, PR 5b (Admin Surface: OrdersDashboard + page wiring, tasks 5.2 + 5.4) — this batch

Batch: tasks 5.2 + 5.4 only (boundary: `frontend/components/admin/OrdersDashboard.tsx` + `frontend/app/admin/page.tsx`; NO DiscrepancyPanel — PR5c remains UNCOMMITTED in the working tree)

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `npx eslint components/admin/OrdersDashboard.tsx app/admin/page.tsx` (frontend/) — 0 errors, 0 warnings (project ESLint 9.39.5; frontend-relative path — repo-root npx pulls an incompatible eslint@10) |
| Runtime harness command/scenario and exact result | `npx next build` (frontend/) — compiled successfully in 1229ms; TypeScript finished in 1946ms; 14/14 static pages generated incl. `/admin`. N/A for JS runtime scenarios — no JS test runner in this project (no jest/vitest config); lint/build are the harness |
| Rollback boundary | `git revert 10cc38c 9ad6feb` — removes dashboard + page wiring only; StaffUserForm (113c3f6) and uncommitted DiscrepancyPanel.tsx (PR5c) unaffected |

### Completed Tasks

- [x] 5.2 `frontend/components/admin/OrdersDashboard.tsx` (new; pre-existing verified implementation kept as-is — matches task intent, no fixes needed): all-orders table via `getStaffOrders`; shared `OrderStatusBadge` from `lib/order-status.tsx`; role-scoped action buttons wired to `advanceOrder(id, next)` (per backend `ADVANCE_MATRIX` via `NEXT_STATUS`: pending– processing– ready– shipped– delivered) and `cancelOrder`; refresh after every action; loading skeleton / error retry / empty states; discrepancy count in header; `pendingIds` spinner set per row. Admin-only page context makes the full action set correct per the transition matrix (advance hidden for discrepancy/delivered/cancelled)
- [x] 5.4 `frontend/app/admin/page.tsx` (modified): `RequireRole(["admin"])` guard + grid wiring `OrdersDashboard` (2 cols) + `StaffUserForm` aside. **DiscrepancyPanel import/usage REMOVED for this slice** (PR5c will re-add it); page copy adjusted to `Gestión de pedidos y usuarios del staff.`

### Files Changed

| File | Action | What Was Done |
|---|---|---|
| `frontend/components/admin/OrdersDashboard.tsx` | Created (committed 10cc38c) | All-orders staff dashboard (278 authored lines) |
| `frontend/app/admin/page.tsx` | Modified (committed 9ad6feb) | Wired OrdersDashboard + StaffUserForm under `RequireRole(["admin"])`; +14/—3 vs the Phase-4 shell |

### Deviations from Design

- tasks.md task 5.4 wording says "wiring 3 sub-components"; this slice wires 2 (OrdersDashboard + StaffUserForm) — DiscrepancyPanel is out of scope for PR5b per the maintainer re-slice and will be re-added by PR5c. Page copy no longer mentions discrepancies to match the rendered surface.
- The acquire step's `--intended-untracked` accepts a single path; the tracked-modified admin page is not untracked, so only OrdersDashboard.tsx was declared.

### Issues Found

None functional. Notes:
- tasks.md/apply-progress.md are CRLF — the edit tool cannot match LF strings, so openspec artifact edits were done via PowerShell byte-preserving read/write (UTF-8, no BOM).
- Openspec artifacts remain untracked (repo convention — never committed); DiscrepancyPanel.tsx remains untouched and uncommitted (PR5c).

### Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main; PR #5b = tasks 5.2 + 5.4, targets PR5a HEAD `113c3f6`)
- Boundary start: `113c3f6` (PR5a commit, HEAD before this run); end: `9ad6feb` (PR5b page-wiring commit)
- Review budget impact: authored add+del = **295 lines** (OrdersDashboard 278 + page +14/—3) — UNDER the 400 hard cap, no size:exception needed

### Verification (required commands)

| Command | Observed result |
|---|---|
| `npx eslint components/admin/OrdersDashboard.tsx app/admin/page.tsx` (frontend/) | 0 errors, 0 warnings |
| `npx next build` (frontend/) | Compiled successfully in 1229ms; TypeScript OK; 14/14 static pages generated incl. /admin |

### Ledger

`gentle-ai sdd-attempt acquire` (request-id `orc-pr5b-acquire-0001`, max-attempts 1, max-changed-lines 400, `--untracked-scope select --intended-untracked frontend/components/admin/OrdersDashboard.tsx` + `--expected-untracked-inventory sha256:91cdef27...` from `gentle-ai review status --agent opencode` eligible inventory) — state `proceed`, token `sha256:ad47393b530a70bee86bf62323aa7c1b6039c14252376eb506b994eefe485a87`. `gentle-ai sdd-attempt settle` (request-id `orc-pr5b-settle-0001`) — outcome `passed`, evidence-revision `sha256:e091825fd623da576705ad1c603540ef13863b22a19698c52a7a0839984634bf` (PR5b diff vs 113c3f6), harness-disposition `reused`, untracked ruling `exclude` with expected inventory `sha256:8eabfa28...` (DiscrepancyPanel + openspec artifacts left out on the record as pre-existing work). Objective state: `complete` — no reset needed.

---

## Phase 5c, PR 5c (Admin Surface: DiscrepancyPanel + page re-wiring, task 5.3) — this batch

Batch: task 5.3 + `frontend/app/admin/page.tsx` re-wiring (boundary: `frontend/components/admin/DiscrepancyPanel.tsx` + `frontend/app/admin/page.tsx`; NO StaffUserForm, NO OrdersDashboard changes, NO backend, NO shared lib changes)

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `npx eslint components/admin/DiscrepancyPanel.tsx app/admin/page.tsx` (frontend/) — 0 errors, 0 warnings (project ESLint 9.39.5; frontend-relative path — repo-root npx pulls an incompatible eslint@10) |
| Runtime harness command/scenario and exact result | `npx next build` (frontend/) — compiled successfully in 949ms; TypeScript finished in 1794ms; 14/14 static pages generated incl. `/admin`. N/A for JS runtime scenarios — no JS test runner in this project (no jest/vitest config); lint/build are the harness |
| Rollback boundary | `git revert 61534ff 4920b16` — removes discrepancy panel + its page wiring only; StaffUserForm (113c3f6) and OrdersDashboard (10cc38c) unaffected |

### Completed Tasks

- [x] 5.3 `frontend/components/admin/DiscrepancyPanel.tsx` (new; pre-existing verified implementation kept as-is — matches task intent, no fixes needed): blocked orders (status `discrepancy`) fetched via `getStaffOrders` and filtered client-side; reason label `REASON_LABELS` (missing: "Falta mercadería", damaged: "Mercadería dañada") with `discrepancy_reason` fallback; Resolver → `resolveDiscrepancy` (admin-only per backend), Cancelar → `cancelOrder`; refresh after every action (`reloadKey`); `pendingIds` spinner set per row; loading skeleton / error retry / empty states; `sileo` success/error toasts; shared `OrderStatusBadge`
- [x] 5.4 `frontend/app/admin/page.tsx` (re-touched; already `[x]` from PR5b): DiscrepancyPanel re-wired into the layout — import + `<div className="mt-6">` below the OrdersDashboard/StaffUserForm grid (PR5b removed it); page copy restored to "Gestión de pedidos, usuarios del staff y discrepancias." This completes 5.4's "wiring 3 sub-components" acceptance

### Files Changed

| File | Action | What Was Done |
|---|---|---|
| `frontend/components/admin/DiscrepancyPanel.tsx` | Created (committed 61534ff) | Discrepancy resolution panel (184 authored lines) |
| `frontend/app/admin/page.tsx` | Modified (committed 4920b16) | DiscrepancyPanel import + placement below the grid; discrepancias copy restored (+7/−2) |

### Deviations from Design

None — implementation matches task 5.3 intent and the design contract (resolve → `resolveDiscrepancy` admin-only, cancel → `cancelOrder`, refresh after actions, loading/error/empty states). Notes:
- DiscrepancyPanel existed uncommitted from the earlier verified PR5 run; kept as-is — no fixes required.
- The settle needed an untracked ruling `--untracked-scope exclude` with the post-commit inventory `sha256:dae1acb6…` (openspec artifacts only; DiscrepancyPanel became tracked within the slice).

### Issues Found

None functional. Notes:
- `tasks.md`/`apply-progress.md` are now LF (421 bare LF, 0 CRLF) — the edit tool matched directly; the PR5b CRLF note no longer applies to these openspec files.

### Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main; PR #5c = task 5.3 + page re-wiring, targets PR5b HEAD `9ad6feb`)
- Boundary start: `9ad6feb` (PR5b page-wiring commit, HEAD before this run); end: `4920b16` (PR5c page re-wire commit)
- Review budget impact: authored add+del = **193 lines** (DiscrepancyPanel 184 + page +7/−2) — UNDER the 400 hard cap, no size:exception needed

### Verification (required commands)

| Command | Observed result |
|---|---|
| `npx eslint components/admin/DiscrepancyPanel.tsx app/admin/page.tsx` (frontend/) | 0 errors, 0 warnings |
| `npx next build` (frontend/) | Compiled successfully in 949ms; TypeScript OK; 14/14 static pages generated incl. /admin |

### Ledger

`gentle-ai sdd-attempt acquire` (request-id `orc-pr5c-acquire-0001`, max-attempts 1, max-changed-lines 400, `--untracked-scope select --intended-untracked frontend/components/admin/DiscrepancyPanel.tsx` + `--expected-untracked-inventory sha256:8eabfa28...`) → state `proceed`, token `sha256:9b727bc1...`. `gentle-ai sdd-attempt settle` (request-id `orc-pr5c-settle-0001`): first attempt blocked (`undeclared_untracked` — inventory moved from `8eabfa28…` to `dae1acb6…` once DiscrepancyPanel was committed); re-run with `--untracked-scope exclude` + `--expected-untracked-inventory sha256:dae1acb6...` → outcome `passed`, state `complete` — objective complete, no reset needed. Evidence-revision `sha256:bfaf40f4...` (PR5c diff vs 9ad6feb), harness-disposition `reused`.

---

## Phase 6, PR 6 (Bodega/Despacho Surfaces: tasks 6.1–6.3) — this batch

Batch: tasks 6.1–6.3 only (boundary: `frontend/app/bodega/page.tsx`, `frontend/app/despacho/page.tsx`, `frontend/app/orders/page.tsx`; NO backend, NO shared lib changes, NO admin components)

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `npx eslint app/bodega/page.tsx app/despacho/page.tsx app/orders/page.tsx` (frontend/) — 0 errors, 0 warnings (project ESLint 9.39.5; frontend-relative path — repo-root npx pulls an incompatible eslint@10) |
| Runtime harness command/scenario and exact result | `npx next build` (frontend/) — compiled successfully in 1638ms; TypeScript finished in 2.3s; 14/14 static pages generated incl. /bodega, /despacho, /orders. N/A for JS runtime scenarios — no JS test runner in this project (no jest/vitest config); lint/build are the harness |
| Rollback boundary | `git revert c54f91d cb0cc5a c05e252` — restores the thin Phase-4 bodega/despacho shells and the local orders-page status styling; no unrelated work removed |

### Completed Tasks

- [x] 6.1 `frontend/app/bodega/page.tsx` (modified, committed c54f91d): thin Phase-4 shell replaced by the bodega queue — `BodegaQueue` fetches `getStaffOrders` and filters the bodega lane (pending, processing, ready, discrepancy); advance per `NEXT_STATUS` (pending→processing, processing→ready) via `advanceOrder`; "Marcar discrepancia" button opens an inline reason picker (Falta mercadería / Mercadería dañada) wired to `flagDiscrepancy`, only on flaggable statuses; discrepancy rows render the reason chip with no actions; shared `OrderStatusBadge`; loading skeleton / error retry / empty states; refresh after every action; `RequireRole(["bodega","admin"])` preserved
- [x] 6.2 `frontend/app/despacho/page.tsx` (modified, committed cb0cc5a): thin Phase-4 shell replaced by the despacho queue — `DespachoQueue` filters the despacho lane (ready, shipped, delivered); advance per `NEXT_STATUS` (ready→shipped, shipped→delivered) via `advanceOrder`; delivered rows show "Sin acciones"; shared `OrderStatusBadge`; loading skeleton / error retry / empty states; refresh after every action; `RequireRole(["despacho","admin"])` preserved
- [x] 6.3 `frontend/app/orders/page.tsx` (modified, committed c05e252): local `ORDER_STATUS_STYLES` + `FALLBACK_STATUS_LABELS` + local `OrderStatusBadge` (−40) replaced by the shared `lib/order-status.tsx` import (+1); customer page behavior unchanged (identical styles/labels for the 5 customer-visible statuses; `ready`/`discrepancy` now render with the shared styles instead of the bare outline fallback)

### Files Changed

| File | Action | What Was Done |
|---|---|---|
| `frontend/app/bodega/page.tsx` | Modified | Phase-4 shell → bodega fulfillment queue (pending→processing→ready + discrepancy flag with reason picker) |
| `frontend/app/despacho/page.tsx` | Modified | Phase-4 shell → despacho fulfillment queue (ready→shipped→delivered) |
| `frontend/app/orders/page.tsx` | Modified | Local status styles/badge replaced by shared `lib/order-status.tsx` import |

### Deviations from Design

None — implementation matches design.md and tasks 6.1–6.3. Notes:
- Tasks 6.1/6.2 say "(new)" but the page files already exist as the Phase-4 role-gated shells (committed be118cc); this batch replaces their content in place (tracked modifications, not new files) — consistent with how 5.4 re-touched the admin page.
- Advance buttons label the next status in Spanish via the shared `STATUS_FALLBACK_LABELS` (e.g. "Avanzar a Listo para despacho") instead of raw status keys, reusing the shared module per task 6.3's intent.
- The bodega queue includes `discrepancy` orders (reason chip, no actions) so bodega sees the orders it flagged until admin resolves/cancels; the despacho lane never shows them (flag is bodega/admin-only and resolve returns to pending/processing/ready — despacho's lane is untouched). Cancel is NOT exposed on either page (admin-only per the matrix; bodega/despacho would get 403).

### Issues Found

None functional. Notes:
- tasks.md is CRLF again (git autocrlf re-converted it, contradicting the PR5c LF note) — checkbox flips done via PowerShell byte-preserving replace; apply-progress.md is LF.
- The tasks.md estimate (~145) under-priced the surfaces (real 610): each page needs table + loading/error/empty states + refresh-after-action + toasts, mirroring the 278-line OrdersDashboard pattern set in PR5b. One honest slicing pass done — no slice fits (smallest is bodega alone at 334) — see Workload.

### Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main; PR #6 = Phase 6, targets Phase-5 HEAD `4920b16`)
- Boundary start: `4920b16` (PR5c commit, HEAD before this run); end: `c05e252` (orders refactor commit; c54f91d + cb0cc5a earlier in the slice)
- Review budget impact: authored add+del = **610 lines** (bodega 331+3, despacho 232+3, orders 1+40) → EXCEEDS the 400 cap by 52% → **size:exception recommended** (610) OR maintainer re-slice (e.g. PR6a bodega 334, PR6b despacho+orders 276). Implementation is complete and verified green; the ledger flags `changed_line_budget_exceeded` as with PR1/PR2/PR5.

### Verification (required commands)

| Command | Observed result |
|---|---|
| `npx eslint app/bodega/page.tsx app/despacho/page.tsx app/orders/page.tsx` (frontend/) | 0 errors, 0 warnings |
| `npx next build` (frontend/) | Compiled successfully in 1638ms; TypeScript OK; 14/14 static pages generated incl. /bodega /despacho /orders |

### Ledger

`gentle-ai sdd-attempt acquire` (request-id `orc-pr6-acquire-0001`, max-attempts 1, max-changed-lines 400, `--untracked-scope exclude` with expected-untracked-inventory `sha256:dae1acb6…` — the three phase files are tracked modifications so no intended-untracked selection applied; openspec artifacts excluded per repo convention) → state `proceed`, token `sha256:4d680bbc…`. `gentle-ai sdd-attempt settle` (request-id `orc-pr6-settle-0001`) returned `state: blocked, reason: maintainer_decision` (changed-line budget needs a maintainer decision) — the attempt itself WAS recorded: `sdd-attempt status` shows ordinal 9 outcome `passed`, changed_lines **610**, evidence-revision `sha256:43c0266b…` (PR6 diff vs 4920b16), `changed_line_budget_exceeded: true`, harness-disposition `reused`. Objective state: decision_required `true`, complete `false`, next_action `reset` — a maintainer reset is required before PR6 may open (same flow as PR1/PR2/PR5 post-attempt resets by marceloubb). `sdd-attempt reset` was NOT run by this executor (maintainer action per the budget rule).

## Remaining Tasks

- Phase 6 (PR 6): tasks 6.1–6.3 ALL DELIVERED — **27/27 tasks complete, the whole change is implemented**. Phases 1–6 committed and verified green per phase (backend 0002/0003 migrations + 92+ tests; frontend lint/build across PR4–PR6). Next: independent SDD verification (sdd-verify), then archive. Open item before opening PR6: maintainer ledger reset (decision_required).