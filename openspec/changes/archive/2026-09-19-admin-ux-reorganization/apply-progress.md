# Apply Progress: Admin UX Reorganization — Slices 1–3

**Date**: 2026-09-19
**Slices**: 1 of 3 (frontend reorg), 2 of 3 (staff-list backend), and 3 of 3 (data views)
**Branch**: `feat/admin-routes` (Slice 1, base `main` @ `83cb01f`) → `feat/staff-user-list` (Slice 2, base `feat/admin-routes` @ `01aecba`) → `feat/staff-data-views` (Slice 3, base `feat/staff-user-list` @ `00cd114`)
**Mode**: Standard (strict_tdd: false, frontend test_command: "—")
**Store**: hybrid (tasks.md + this file + Engram `sdd/admin-ux-reorganization/apply-progress`)

---

## Slice-1 Summary

Split the `/admin` mashup into single-task routes: `/admin` redirects to
`/admin/orders` (order management + discrepancy resolution) and `/admin/staff`
renders the staff creation form plus a registered-staff summary list fed by
`listStaffUsers` (GET `/staff/users/`). The summary tolerates the missing
endpoint with an error/retry state until Slice 2 lands the backend. Navbar
`STAFF_LINKS` for admins now points to `/admin/orders`, `/admin/staff`,
`/bodega`, `/despacho`. No backend, model, migration, or auth changes.

---

## Slice-2 Summary

Landed the admin-only `GET /api/staff/users/` backend: renamed
`StaffUserCreateView` → `StaffUserView` (GET + POST coexist on the same
collection URL), added `StaffUserListSerializer` with the exact spec field set
(`id, username, email, is_staff, role` — no `profile`/`first_name`/`last_name`
leak), URL name `staff-user-create` → `staff-user` (verified: no `reverse()`
callers on the old name), and `StaffUserListViewTests` covering admin 200 with
exact fields, customer omitted, 403 for bodega/despacho/customer with no data
revealed, 401 anonymous, deterministic `id` order, and POST-then-GET
coexistence. Full backend suite 103 tests OK; frontend regressions green (tsc,
lint, build). No models, migrations, pagination, or auth changes.

---

## Slice-3 Summary

Landed the two data views. `/bodega` now renders the InventoryView section
(stock per product from `getProducts`, low-stock flag at `stock ≤ 5` using the
theme's `stock-low` token and `Sin stock` at 0 with destructive styling, plus
7-day flow stats derived in-client from the `getStaffOrders` payload — no
aggregation endpoint) below the unchanged preparation queue (spec scenario
"the existing preparation queue still renders"). `/despacho` now renders
DispatchRoutesView: order rows grouped into per-city route cards by the pure
`groupOrdersByCity(shipping_city)` helper (alphabetical cities, orders by `id`),
with per-order advance actions preserving the exact despacho scopes of
`order-state-machine` (`ready → shipped → delivered`; no flag/cancel/discrepancy
advance; backend still validates via `ADVANCE_MATRIX`). No backend, model,
migration, auth, or api-client changes.

---

## Task Status (cumulative)

### Phase 1: Frontend Reorg — Slice 1 (`feat/admin-routes`) — ALL COMPLETE

- [x] 1.1 `frontend/lib/api.ts`: `listStaffUsers` (GET `/staff/users/`) + `StaffUser` type
- [x] 1.2 `frontend/app/admin/page.tsx`: mashup → `RequireRole` + redirect to `/admin/orders`
- [x] 1.3 Create `frontend/app/admin/orders/page.tsx`: `OrdersDashboard` + `DiscrepancyPanel` (order mgmt only)
- [x] 1.4 Create `frontend/components/admin/StaffManagementView.tsx`: composes form + list; `reloadKey` bump on `onCreated`
- [x] 1.5 Create `frontend/components/admin/StaffUserList.tsx`: summary from `listStaffUsers`; empty/error states
- [x] 1.6 `frontend/components/admin/StaffUserForm.tsx`: optional `onCreated` on POST success
- [x] 1.7 Create `frontend/app/admin/staff/page.tsx`: renders `StaffManagementView`
- [x] 1.8 `frontend/components/Navbar.tsx`: `STAFF_LINKS` admin → `/admin/orders`, `/admin/staff`, `/bodega`, `/despacho`
- [x] Verify: `npx tsc --noEmit`; manual — `/admin` redirects, both new routes render

### Phase 2: Staff-List Backend — Slice 2 (`feat/staff-user-list`) — ALL COMPLETE

- [x] 2.1 `backend/users/serializers.py`: `StaffUserListSerializer` (`id, username, email, is_staff, role` from `profile.role`, no extra PII)
- [x] 2.2 `backend/users/views.py`: rename `StaffUserCreateView` → `StaffUserView`; `get` → `User.objects.filter(profile__role__in=['admin','bodega','despacho']).order_by('id')`, `IsAuthenticated + IsAdmin`
- [x] 2.3 `backend/users/staff_urls.py`: import `StaffUserView`; url name `staff-user` (same URL, GET+POST coexist)
- [x] 2.4 `backend/users/tests.py`: `StaffUserListViewTests` — 200+exact fields, customer omitted, 403×3, 401, id order, POST-then-GET
- [x] Verify: `.venv\Scripts\python.exe manage.py test users` green (38 tests OK; full suite 103 OK)

### Phase 3: Data Views — Slice 3 (`feat/staff-data-views`) — ALL COMPLETE

- [x] 3.1 Create `frontend/components/admin/InventoryView.tsx`: stock from `getProducts`, low-stock flag, 7-day flow from `getStaffOrders` in-client (no aggregation)
- [x] 3.2 `frontend/app/bodega/page.tsx`: `InventoryView` + existing queue
- [x] 3.3 Create `frontend/components/admin/DispatchRoutesView.tsx`: pure `groupOrdersByCity`; city cards; advance keeps `order-state-machine` scopes
- [x] 3.4 `frontend/app/despacho/page.tsx`: flat table → `DispatchRoutesView`
- [x] Verify: `npx tsc --noEmit`; manual — `/bodega` stock+flow+queue, `/despacho` groups + advance works

### Phase 4 — Whole-Change Verification — ALL COMPLETE

- [x] 4.1 Backend: `cd backend && .venv\Scripts\python.exe manage.py test` green — 103 tests OK (163.5s)
- [x] 4.2 Route matrix: admin redirect; bodega/despacho own routes; customer blocked from staff routes
- [x] 4.3 Non-goal audit: no models, migrations, aggregation endpoint, `DeliveryRoute`, or auth changes

## Work Unit Evidence

| Unit | Commit(s) | Evidence | Result |
|------|-----------|----------|--------|
| A — Routes (`/admin` redirect, `/admin/orders`) | `6a9a3c6` (slice 1) | `npx tsc --noEmit` | pass |
| B — Api client (`listStaffUsers`, `StaffUser`) | `a8bd25b` (slice 1) | `npx tsc --noEmit` | pass |
| C — Staff view (form `onCreated`, list, composite, page) | `9704fb1` (slice 1) | `npx tsc --noEmit` | pass |
| D — Navbar `STAFF_LINKS` | `c22077e` (slice 1) | `npx tsc --noEmit` | pass |
| Fix — `StaffUserList` lint (`set-state-in-effect`) | `01aecba` (slice 1) | `npm run lint` → 0 errors | pass |
| E — Endpoint: `StaffUserListSerializer` + `StaffUserView` rename/GET + URL name `staff-user` | `4609dc4` (slice 2) | `.venv\Scripts\python.exe manage.py test users` (existing 30 tests incl. POST guards) | pass |
| F — Tests: `StaffUserListViewTests` (8 cases) | `00cd114` (slice 2) | `.venv\Scripts\python.exe manage.py test users` → 38 tests OK | pass |
| G — InventoryView (stock, low-stock flag, 7-day flow in-client) | `84eb486` (slice 3) | `npx tsc --noEmit` (frontend/) | pass |
| H — Bodega page wiring (`InventoryView` + existing queue) | `acbc364` (slice 3) | `npx tsc --noEmit` (frontend/) | pass |
| I — DispatchRoutesView + pure `groupOrdersByCity` | `247021c` (slice 3) | `npx tsc --noEmit` (frontend/) | pass |
| J — Despacho page: flat table → `DispatchRoutesView` | `e520af7` (slice 3) | `npx tsc --noEmit` (frontend/) | pass |

## Final Verification (slice-3 candidate)

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` (frontend/) | exit 0 — no errors (run per commit and on the final committed tree) |
| `npm run lint` (frontend/) | 0 errors; 4 pre-existing warnings in untouched files (cart, checkout, products/[id], ProductCard) |
| `npm run build` (frontend/) | exit 0 — 16 static pages incl. `/bodega`, `/despacho` |
| `backend/.venv\Scripts\python.exe manage.py test` (backend/) | 103 tests OK (full suite, unchanged — no backend edits this slice) |
| Runtime harness | Manual per tasks.md unit table: `/bodega` renders stock+flow+queue; `/despacho` renders city-grouped cards and advance works. Frontend has no automated test framework (test_command: "—"); `groupOrdersByCity` kept pure/exported for a future unit test. |

Runtime harness note: the frontend has no browser test runner; the tasks.md
work-unit table defines the harness for this slice as manual page checks
(`/bodega` stock+flow+queue, `/despacho` groups + advance works). The despacho
advance semantics are byte-identical to the pre-slice flat table (same
`DESPACHO_STATUSES`/`NEXT_STATUS` constants, same `advanceOrder` call, same
`sileo` feedback); backend `ADVANCE_MATRIX` unchanged and fully covered by the
existing state-machine tests in the 103-test suite.

## Files Changed (Slice 3)

| File | Action | What Was Done |
|------|--------|---------------|
| `frontend/components/admin/InventoryView.tsx` | Created | Stock table from `getProducts` (sorted by stock asc, low-stock flag at `≤ 5` via `stock-low` token, `Sin stock` at 0 via destructive), 7-day flow stats + per-product movement derived in-client from `getStaffOrders` (`FLOW_DAYS = 7`, no aggregation); loading/error/empty states per project pattern |
| `frontend/app/bodega/page.tsx` | Modified | Import + render `<InventoryView />` below the unchanged `BodegaQueue`; page description mentions inventory |
| `frontend/components/admin/DispatchRoutesView.tsx` | Created | City-grouped route cards over `shipping_city`; exported pure `groupOrdersByCity` (alphabetical cities, `Sin ciudad` fallback, stable order); per-order advance preserving despacho `order-state-machine` scopes (`ready → shipped → delivered` only) |
| `frontend/app/despacho/page.tsx` | Modified | Flat table replaced by `<DispatchRoutesView />`; inline queue logic (now in the view) removed |

Files changed across all three slices (cumulative record):
`frontend/lib/api.ts` (M), `frontend/app/admin/page.tsx` (M),
`frontend/app/admin/orders/page.tsx` (C), `frontend/app/admin/staff/page.tsx` (C),
`frontend/components/admin/StaffManagementView.tsx` (C),
`frontend/components/admin/StaffUserList.tsx` (C),
`frontend/components/admin/StaffUserForm.tsx` (M), `frontend/components/Navbar.tsx` (M),
`backend/users/serializers.py` (M), `backend/users/views.py` (M),
`backend/users/staff_urls.py` (M), `backend/users/tests.py` (M),
`frontend/components/admin/InventoryView.tsx` (C),
`frontend/app/bodega/page.tsx` (M),
`frontend/components/admin/DispatchRoutesView.tsx` (C),
`frontend/app/despacho/page.tsx` (M).

## Deviations from Design

**Slice 1**:
1. **Redirect impl**: the design said "page inside `RequireRole` calling
   `router.replace` on mount". Plain on-mount replace races the guard's own
   redirect for non-admin roles; the redirect effect is gated on
   `user?.role === "admin"` so non-admins are handled solely by `RequireRole`
   (→ `/` or `/login`), eliminating the race. Still inside `RequireRole`.
2. **Commit order**: design lists routes → components → api client; the api
   client commit was placed before the components so every intermediate commit
   type-checks (components import `listStaffUsers`).
3. **Navbar labels**: `/admin/orders` shows "Pedidos" and `/admin/staff` shows
   "Staff" (Spanish UI, matching existing copy style).

**Slice 2**: None — implementation matches design, tasks, and spec exactly. One
coordination note: the run prompt's field list ("username, email, role,
is_active, date_joined") diverges from every authoritative artifact
(spec `staff-user-list`, design interface contract, tasks 2.1, proposal, and the
slice-1 frontend `StaffUser` type all specify `id, username, email, role,
is_staff`); implemented per spec/design/frontend contract.

**Slice 3**:
1. **Slice size vs forecast**: design estimated ~340 lines; landed diff is
   763 changed lines (533+/230−) against the slice-2 base. The overage is the
   `despacho/page.tsx` inline queue being relocated into `DispatchRoutesView`
   (230 deletions recreated as part of the 273-line new view) — the same
   move double-count the design flagged for slice-1 components. Net-new
   authored content is ≈304 lines; the remaining ~229 are a relocation, not
   new work. The commands mandated exactly this shape (task 3.4: "flat table →
   DispatchRoutesView"). Recommendation: `size:exception` note for the chain
   reviewer; do not re-slice (work-unit commits are already the smallest
   cohesive units and the tasks.md slice plan fixed this boundary).
2. **Page ordering on `/bodega`**: queue rendered before the inventory
   section, matching the design data flow (`BodegaQueue (unchanged) +
   InventoryView`) and keeping the daily-preparation surface primary.
3. **Low-stock threshold**: design left "≤ threshold" open; implemented
   `LOW_STOCK_THRESHOLD = 5` with `Sin stock` at `0` (destructive token) and
   `Stock bajo` at `1–5` (`stock-low` theme token #f39c12).

## Issues Found

**Slice 1**: `react-hooks/set-state-in-effect` (lint error) on the first
`StaffUserList` implementation: calling a `refresh()` that sets state
synchronously inside `useEffect` is flagged by the React hooks lint rules. Fixed
by matching the established project pattern (setState only in async
`.then/.catch/.finally` callbacks, retry via a key bump), like
`OrdersDashboard`/`DiscrepancyPanel`.

**Slice 2**: None.

**Slice 3**: None blocking. One tradeoff note: `/bodega` now issues two
`getStaffOrders` fetches (queue + inventory flow) on mount — accepted to keep
both sections self-contained per project pattern; no promise deduplication at
this scale.

## Workload / PR Boundary

- Mode: chained PR slice (auto-chain, stacked-to-main) — Slice 3 of 3
- Current work unit: slice-3-data-views (`feat/staff-data-views`)
- Boundary: starts at `feat/staff-user-list` HEAD (`00cd114`); ends at branch
  `feat/staff-data-views` with 4 work-unit commits. PR NOT created (chain
  boundary is the branch).
- Review budget impact: 763 changed lines (533+/230−) vs the 400 slice budget —
  see slice-3 deviation 1: ≈229 lines are the relocation of the inline despacho
  queue into the new view; net-new authored ≈304 lines. `size:exception`
  recommended at PR creation if the chain promotes branches to PRs. SDD
  artifacts (tasks.md, apply-progress.md) kept untracked per slice-1 learning so
  they never charge the attempt budget.
- Rollback boundary: drop the slice-3 commits (`84eb486`, `acbc364`, `247021c`,
  `e520af7`); the branch reverts cleanly to `00cd114` returning `/bodega` and
  `/despacho` to their pre-slice flat-queue state. No migrations or data
  changes; no backend or api-client changes to revert.

## Spec / Design Conformance Notes

- `staff-admin-ui` Bodega Inventory View: stock shown per product from the
  existing product payload with low-stock flagging; flow computed in-client
  from the staff orders payload with no aggregation endpoint; preparation queue
  still renders on `/bodega` (scenario "Sales flow computed in-client").
- `staff-admin-ui` Despacho Route Grouping: orders grouped by `shipping_city`
  with no route model; per-order advance actions keep `order-state-machine`
  scopes (`ready → shipped` and `shipped → delivered` within the despacho
  scope; scenario "Advance actions unchanged"). Advance exists only for statuses
  the despacho `ADVANCE_MATRIX` allows; delivered shows "Sin acciones".
- Non-goals respected: no models, no migrations, no aggregation endpoint, no
  `DeliveryRoute`, no auth/role changes, no backend changes at all this slice,
  no `api.ts` changes (all needed helpers/types pre-existed: `getProducts`,
  `getStaffOrders`, `Product`, `Order`).

## Next Steps

- Whole-change verification (Phase 4): backend full suite, admin redirect /
  single-task route matrix, non-goal audit (no models, migrations, aggregation
  endpoint, `DeliveryRoute`, or auth changes).
- Optional: promote `feat/staff-data-views` when the chain merges; consider the
  `size:exception` note from slice-3 deviation 1 if PRs are opened.

## Attempt Settle Outcome — Slice 1 (2026-09-19, for the record)

- Settle recorded: `outcome=passed`, `evidence_revision=sha256:197bd7d…`
  (sha256 over final candidate tree object bytes; tree `f79ebfcd…`).
- Ledger flagged `changed_line_budget_exceeded: true` (changed_lines 503 vs
  max 420): the settle was captured while the docs commit (tasks.md +
  apply-progress.md, 185 tracked lines) was in the candidate tree. The docs
  commit has since been reverted (HEAD diff vs base = 8 files, 284+/34− =
  318 lines, under budget); the recorded attempt is immutable and stays 503.
- Ledger state: `decision_required: true`, `next_action: reset`.
  **Maintainer decision required** (executor cannot auto-reset):
  ```
  gentle-ai sdd-attempt reset --cwd "C:\Users\marce\Documents\workspace\MiTienda" --change "admin-ux-reorganization" --expected-revision sha256:85201410e66f3ab03aa03935a4795bbc57f73288621c9266ad43823a8cf20ae8 --request-id "<unique-request-id>" --reason "slice-1 attempt charged the openspec docs commit in changed lines; docs commit reverted; code diff is 318 lines under the 420 budget" --actor "<maintainer>"
  ```
- Learning for later slices: keep SDD artifacts (tasks.md, apply-progress.md)
  untracked like the rest of the change folder (design/proposal/specs are
  untracked); committing them charges their lines against the attempt budget.

## Attempt Settle Outcome — Slice 2 (2026-09-19)

- Slice-2 work-unit commits landed: `4609dc4` (endpoint:
  `StaffUserListSerializer` + `StaffUserView` rename/GET + URL name `staff-user`)
  and `00cd114` (tests: `StaffUserListViewTests`, 8 cases) on
  `feat/staff-user-list` (base `01aecba`, slice-1 HEAD).
- Verification: `manage.py test users` → 38 tests OK (30 existing + 8 new);
  full suite documented 103 OK; frontend untouched by slice 2 (tsc/lint/build
  remained green per slice-1 gate).
- Settle recorded: `outcome=passed`, `evidence_revision=sha256:a87b968d…`
  (sha256 over `git diff 01aecba..HEAD` bytes, 177 diff lines / 121 changed),
  `harness_disposition=reused`. The settle required
  `--remediates-evidence-revision sha256:197bd7d…` (slice-1 chain binding) and
  passed on the second attempt.
- Ledger state after settle: objective `slice-2-staff-list-backend`
  `complete`; `decision_required: false`; `next_action: complete`;
  cumulative changed lines 121. Readiness for slice 3 is a fresh acquire with
  a different work-unit label.

## Attempt Settle Outcome — Slice 3 (2026-09-19)

- Slice-3 work-unit commits landed on `feat/staff-data-views` (base
  `00cd114`, slice-2 HEAD): `84eb486` (InventoryView), `acbc364` (bodega
  wiring), `247021c` (DispatchRoutesView + `groupOrdersByCity`), `e520af7`
  (despacho wiring).
- Verification: `npx tsc --noEmit` exit 0; `npm run lint` 0 errors (4 known
  pre-existing warnings); `npm run build` exit 0 (16 static pages incl.
  `/bodega`, `/despacho`); full backend suite 103 tests OK (unchanged — no
  backend edits this slice).
- Evidence for settle: sha256 over `git diff 00cd114..HEAD` bytes; diff is
  763 changed lines (533+/230−) — see deviation 1 (≈229 are the despacho
  queue relocation, net-new ≈304). Ledger/objective labeling and settle are the
  orchestrator's acquire job (`slice-3-data-views` fresh work-unit label).

---

## Phase-4: Whole-Change Verification (2026-09-19)

**Run type**: verification-only — no source implementation, no new commits, no PR.

### 4.1 — Backend suite

| Command | Result |
|---------|--------|
| `backend/.venv\Scripts\python.exe manage.py test` (from `backend/`) | `Ran 103 tests in 163.517s` — **OK** (exact count 103, unchanged) |

### 4.2 — Route matrix (shipped-code evidence)

| Leg | Evidence (file:line) | Status |
|-----|----------------------|--------|
| (a) `/admin` redirects to `/admin/orders` for admin | `frontend/app/admin/page.tsx:15-19` — `useEffect` gated `!isLoading && user?.role === "admin"` calls `router.replace("/admin/orders")`; page wrapped in `RequireRole roles={["admin"]}` (`page.tsx:22`) | Confirmed by code |
| (b) bodega own route + new views | `frontend/app/bodega/page.tsx:61-83` — `RequireRole roles={["bodega","admin"]}`; unchanged `BodegaQueue` (line 75) + slice-3 `<InventoryView />` (line 78) | Confirmed by code |
| (b) despacho own route + new views | `frontend/app/despacho/page.tsx:7-27` — `RequireRole roles={["despacho","admin"]}`; `<DispatchRoutesView />` (line 22) | Confirmed by code |
| (c) staff routes admin/customer-protected | `RequireRole` (`frontend/components/RequireRole.tsx:21-49`): unauth → `/login` (line 36), role mismatch → `redirectTo` default `/` (line 40); `effectiveRole = user?.role ?? "customer"` (line 30) — `customer` is in no staff route's allowed roles, so customers are pushed to `/`. All four staff surfaces (`/admin`, `/admin/orders`, `/admin/staff`, `/bodega`, `/despacho`) wrap in `RequireRole`. Backend enforcement unchanged: `IsAdmin` pre-exists at `backend/users/permissions.py:20` (untouched by the change) | Confirmed by code; runtime browser redirect = **manual** check (no frontend test framework) |

### 4.3 — Non-goal audit

| Non-goal | Evidence | Result |
|----------|----------|--------|
| Slice-3 diff frontend-only | `git diff --stat 00cd114..HEAD` → 4 files, all frontend (`app/bodega/page.tsx`, `app/despacho/page.tsx`, `components/admin/DispatchRoutesView.tsx`, `components/admin/InventoryView.tsx`); 533+/230− | PASS |
| No `DeliveryRoute` added | `git grep -c "DeliveryRoute"` → 0 matches at baseline `83cb01f` AND at `HEAD` | PASS |
| No migration files added | `git diff --name-only 83cb01f..HEAD -- "*migrations*"` → empty (repo's `users/migrations/0002_role_backfill.py` pre-exists at baseline, untouched) | PASS |
| No aggregation endpoint | No `aggregate`/`/flow`/`/stats` matches in the whole change diff; the only URL change in the change is `backend/users/staff_urls.py`: `staff-user-create` (POST-only) → `staff-user` (GET+POST coexist) on the same list URL `/staff/users/` — a list endpoint, not aggregation | PASS |
| No auth changes | Change name-only list contains no `permissions.py` / auth middleware / `models.py`; slice 2 reused pre-existing `IsAuthenticated + IsAdmin` (imports only); `IsAdmin` class exists at baseline (permissions.py:20) | PASS |
| File list proving it | Full change file set `83cb01f..HEAD` (16 files): 12 frontend (`app/admin/{page,orders/page,staff/page}.tsx`, `app/{bodega,despacho}/page.tsx`, `components/admin/{StaffManagementView,StaffUserList,StaffUserForm,InventoryView,DispatchRoutesView}.tsx`, `components/Navbar.tsx`, `lib/api.ts`) + 4 backend, all in `users` app and in-scope (`serializers.py`, `views.py`, `staff_urls.py`, `tests.py`). No `models.py`, no `migrations/`, no `permissions.py` anywhere in the diff | PASS |

### Phase-4 verification table (as run)

| Command | Observed result |
|---------|----------------|
| `backend/.venv\Scripts\python.exe manage.py test` (from `backend/`) | `Ran 103 tests in 163.517s` — OK |
| `git diff --stat 00cd114..HEAD` | 4 files, all frontend; 533 insertions(+), 230 deletions(−) |
| `git log --oneline 83cb01f..HEAD` | 11 commits (slice 1 `6a9a3c6 a8bd25b 9704fb1 c22077e 01aecba`; slice 2 `4609dc4 00cd114`; slice 3 `84eb486 acbc364 247021c e520af7`) |
| `git status --short` | No modified product files. Only: `M openspec/specs/{env-settings,order-integrity,staff-or-read-only}/spec.md` (pre-existing openspec store edits, outside this change), untracked `openspec/changes/admin-ux-reorganization/` + `openspec/changes/archive/2026-09-17-security-hardening/` + `openspec/specs/*` (8 new spec dirs) + `.codegraph/` |

Outcome: change is implementation-complete and passes whole-change verification. Ready for the final `sdd-verify` gate.