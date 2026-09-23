```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:cc5ee97e5fb773b7e2571b1abae30f245f3fa899410ea52ff3d20ebf1eadf5cf
verdict: pass
blockers: 0
critical_findings: 0
requirements: 8/8
scenarios: 21/21
test_command: .venv\Scripts\python.exe manage.py test
test_exit_code: 0
test_output_hash: sha256:fd8e57bb1bf4eecf00949b55f6f6cb5ef2d8f642a75bc18db586add8e5c4c09e
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:b7841a0a05cc8a1f5423003cc9403c6f63f4d860dd8b24cce12e38577fd0d0e1
```

## Verification Report

**Change**: admin-ux-reorganization
**Branch**: `feat/staff-data-views`
**HEAD**: `e520af7` (`e520af76ca973338b11d8415b2a864f912a6319d`); HEAD tree `2234609675034792df59455e654eed308045f2c1`
**Base**: `83cb01f` (pre-change `main`); 11 commits across 3 slices (`6a9a3c6 a8bd25b 9704fb1 c22077e 01aecba` → `4609dc4 00cd114` → `84eb486 acbc364 247021c e520af7`)
**Date**: 2026-09-20 (independent final gate)
**Mode**: Standard (strict_tdd false; frontend `test_command: "—"`)
**Store**: hybrid (openspec file + Engram `sdd/admin-ux-reorganization/verify-report`)

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 22 |
| Tasks complete | 22 |
| Tasks incomplete | 0 |
| Specs | 2 (staff-admin-ui delta, staff-user-list) |
| Requirements | 8 (5 staff-admin-ui + 3 staff-user-list) |
| Scenarios | 21 (15 staff-admin-ui + 6 staff-user-list) |

### Build & Tests Execution

**Backend tests**: ✅ 103 passed / 0 failed / 0 skipped
```text
.venv\Scripts\python.exe manage.py test   (from backend/)
Found 103 test(s).
Ran 103 tests in 162.999s
OK
```

**Frontend**: ✅ tsc 0 / lint 0 errors (4 pre-existing warnings in untouched files: cart, checkout, products/[id], ProductCard) / build exit 0 — 16 static pages incl. `/admin`, `/admin/orders`, `/admin/staff`, `/bodega`, `/despacho`

```text
npx tsc --noEmit   → exit 0
npm run lint       → exit 0 (0 errors, 4 warnings)
npm run build      → exit 0 (16/16 static pages)
```

### Verification Table (as run)

| Command | Observed result |
|---------|----------------|
| `git rev-parse --abbrev-ref HEAD` | `feat/staff-data-views` |
| `git rev-parse HEAD` | `e520af76ca973338b11d8415b2a864f912a6319d` |
| `.venv\Scripts\python.exe manage.py test` (from `backend/`) | `Ran 103 tests in 162.999s` — OK, exit 0 |
| `npx tsc --noEmit` (from `frontend/`) | exit 0 |
| `npm run lint` (from `frontend/`) | exit 0 — 0 errors, 4 pre-existing warnings |
| `npm run build` (from `frontend/`) | exit 0 — 16 static pages, all five staff routes prerendered |
| `git diff --name-only 83cb01f..HEAD` | 16 files: 12 frontend + 4 backend (all in `users` app) |
| `git diff --name-only 83cb01f..HEAD -- "*migrations*" "*models.py" "*permissions.py"` | empty (no migrations, no models, no auth changes) |
| `git grep -c "DeliveryRoute" HEAD -- backend` | 0 matches |

### Requirements Coverage (spec → implementation evidence)

| # | Requirement | Implementation evidence (file:line) | Status |
|---|-------------|-------------------------------------|--------|
| 1 | Staff Management View (`staff-admin-ui`) | `StaffManagementView.tsx:10-22` (form + summary, `reloadKey`); `StaffUserForm.tsx` `onCreated`; `StaffUserList.tsx:31-65,67-69` (list fetch, refresh via key bump); `app/admin/staff/page.tsx:10-25` (`RequireRole roles={["admin"]}`) | ✅ PASS |
| 2 | Bodega Inventory View (`staff-admin-ui`) | `InventoryView.tsx:75-250` (stock table from `getProducts`, `stockLabel` low-stock flags, `FLOW_DAYS=7` in-client flow from `getStaffOrders`); `app/bodega/page.tsx:61-79` (queue + `<InventoryView />`; `RequireRole roles={["bodega","admin"]}` at L63) | ✅ PASS |
| 3 | Despacho Route Grouping (`staff-admin-ui`) | `DispatchRoutesView.tsx:31-36` (`DESPACHO_STATUSES`, `NEXT_STATUS` ready→shipped→delivered), `:48-62` pure `groupOrdersByCity`, `:76-243` city cards + `handleAdvance`; `app/despacho/page.tsx:8-26` (`RequireRole roles={["despacho","admin"]}`) | ✅ PASS |
| 4 | Guarded Operational Routes (`staff-admin-ui`, MODIFIED) | `app/admin/page.tsx:15-19` admin-only `router.replace("/admin/orders")`, `:22` `RequireRole roles={["admin"]}` (mashup removed); `app/admin/orders/page.tsx:11-29`; `app/admin/staff/page.tsx:10-25`; `app/bodega/page.tsx:63`; `app/despacho/page.tsx:9`; `RequireRole.tsx:21-49` (unauth → `/login`, mismatch → `/`, `effectiveRole` default `customer`) | ✅ PASS |
| 5 | Navbar Role-Conditional Links (`staff-admin-ui`) | `Navbar.tsx:23-37` — `STAFF_LINKS`: admin → `/admin/orders`, `/admin/staff`, `/bodega`, `/despacho`; bodega → `/bodega`; despacho → `/despacho`; customer → `[]`; rendered via `staffLinksFor(user?.role)` (L35-37, L49) | ✅ PASS |
| 6 | Staff User List Endpoint (`staff-user-list`) | `backend/users/views.py:97-105` (`StaffUserView.get`: `profile__role__in=STAFF_ROLES`, `order_by('id')`); `backend/users/serializers.py:34-41` (`StaffUserListSerializer`: `id, username, email, is_staff, role`); `backend/mitienda/urls.py:35` `api/staff/` → `staff_urls.py:5-7`; tests `backend/users/tests.py:331-364` | ✅ PASS |
| 7 | Staff List Authorization (`staff-user-list`) | `backend/users/views.py:100` (`IsAuthenticated + IsAdmin`); `IsAdmin`/`STAFF_ROLES` pre-existing at `backend/users/permissions.py:5-31` (untouched); tests `backend/users/tests.py:366-400` (403×3 no data reveal, 401) | ✅ PASS |
| 8 | Collection URL Coexistence (`staff-user-list`) | `StaffUserView` GET+POST on same class/URL (`views.py:97-111`); `staff_urls.py:5-7` name `staff-user`; tests `backend/users/tests.py:402-415` (POST-then-GET lists new user with `role=despacho`) | ✅ PASS |

### Scenario Coverage (spec scenario → evidence)

**staff-user-list — 6/6 scenarios runtime-tested (all passed in the 103-test run)**

| Scenario | Covering test (`backend/users/tests.py`) | Result |
|----------|------------------------------------------|--------|
| Admin lists staff users | `test_admin_lists_staff_with_exact_fields` (L331): 200, exact field set, no `profile`/`first_name`/`last_name` leak | ✅ COMPLIANT |
| Customers excluded from the staff list | `test_customer_omitted_from_staff_list` (L347): 200, list omits customer | ✅ COMPLIANT |
| Bodega denied the staff list | `test_bodega_denied_without_data_reveal` (L366): 403, no data revealed | ✅ COMPLIANT |
| Despacho denied the staff list | `test_despacho_denied` (L377): 403, no data revealed | ✅ COMPLIANT |
| Customer denied the staff list | `test_customer_denied` (L387): 403, no data revealed | ✅ COMPLIANT |
| Created user appears in later list | `test_created_user_appears_in_later_list` (L402): POST despacho → GET lists it with `role=despacho` | ✅ COMPLIANT |

Requirement-text evidence: 401 unauthenticated → `test_anonymous_unauthorized` (L397); deterministic `id` order → `test_list_ordered_by_id` (L355). Both passed.

**staff-admin-ui — 15/15 scenarios (no frontend test runner — project-declared `test_command: "—"`; verified by shipped-code evidence + tsc/lint/build exit 0 + the design-declared manual runtime harness in tasks.md work-unit table / design Testing Strategy)**

| Scenario | Evidence | Result |
|----------|----------|--------|
| Admin sees create form and summary | `app/admin/staff/page.tsx:10-25` + `StaffManagementView.tsx:13-22` (form + list on one screen); build prerenders `/admin/staff` | ✅ COMPLIANT |
| Summary reflects a new user | `StaffManagementView.tsx:16` `onCreated` → `reloadKey` bump; `StaffUserList.tsx:65` refetch on `reloadKey`; backed by passing POST-then-GET test (L402) | ✅ COMPLIANT |
| Bodega sees stock levels | `InventoryView.tsx:152,213-242` — stock per product, `stockLabel` flags (`Sin stock` @0 destructive, `Stock bajo` 1–5 via `stock-low` token) | ✅ COMPLIANT |
| Sales flow computed in-client | `InventoryView.tsx:87` `Promise.all([getProducts, getStaffOrders])`, `:146-151` 7-day derivation (`FLOW_DAYS=7`, `isWithinFlowWindow`, `unitsByProduct`) — no aggregation endpoint in the change; queue still renders (`app/bodega/page.tsx:75`) | ✅ COMPLIANT |
| Orders grouped by city | `DispatchRoutesView.tsx:48-62` pure `groupOrdersByCity` (trim, `Sin ciudad` fallback, alpha by city); `:171,185-199` city cards with orders listed per group | ✅ COMPLIANT |
| Advance actions unchanged | `DispatchRoutesView.tsx:31-36,115-138` — advance only for despacho scopes `ready → shipped → delivered` via `advanceOrder`; backend `ADVANCE_MATRIX` untouched (no `backend/orders` in diff); state-machine tests pass in 103-run | ✅ COMPLIANT |
| Admin redirected from /admin | `app/admin/page.tsx:15-19` — `useEffect` gated `!isLoading && user?.role === "admin"` → `router.replace("/admin/orders")`; inside `RequireRole roles={["admin"]}` (L22) | ✅ COMPLIANT |
| Admin accesses order management | `app/admin/orders/page.tsx:11-29` — `RequireRole roles={["admin"]}` + `OrdersDashboard` + `DiscrepancyPanel` | ✅ COMPLIANT |
| Bodega accesses /bodega route | `app/bodega/page.tsx:63` — `RequireRole roles={["bodega","admin"]}` | ✅ COMPLIANT |
| Despacho accesses /despacho route | `app/despacho/page.tsx:9` — `RequireRole roles={["despacho","admin"]}` | ✅ COMPLIANT |
| Customer blocked from admin routes | `RequireRole.tsx:30` (`effectiveRole ?? "customer"`), `:39-41` mismatch → `router.push("/")`; `customer` is in no staff surface's allowed roles; backend `IsAdmin` enforces APIs | ✅ COMPLIANT (redirection browser leg = manual check, see Risk 2) |
| Bodega blocked from admin and despacho routes | `bodega ∉ ["admin"]` and `bodega ∉ ["despacho","admin"]` → `RequireRole` pushes to `/` | ✅ COMPLIANT |
| Admin navbar shows single-task links | `Navbar.tsx:24-29` — `/admin/orders` (Pedidos), `/admin/staff` (Staff), `/bodega` (Bodega), `/despacho` (Despacho) | ✅ COMPLIANT |
| Bodega navbar shows bodega links only | `Navbar.tsx:30` — bodega: `[{ "/bodega", "Bodega" }]` only | ✅ COMPLIANT |
| Customer navbar shows no staff links | `Navbar.tsx:32` — customer: `[]` | ✅ COMPLIANT |

**Compliance summary**: 21/21 scenarios compliant (6 runtime-tested backend, 15 code+build-evidenced frontend per project's declared manual-harness convention).

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| `/admin` = client-side redirect to `/admin/orders` | ✅ Yes | `router.replace` gated on `role === "admin"` (race-avoidance deviation documented in apply-progress) |
| Components stay in `components/admin/*` | ✅ Yes | Pages import existing components; no double-counted moves this slice |
| Staff summary via `StaffManagementView` + `StaffUserList` + `onCreated` | ✅ Yes | `reloadKey` shared refresh |
| GET+POST coexist on `StaffUserView` (renamed), same URL, `staff-user` | ✅ Yes | `views.py:97-111`, `staff_urls.py:5-7` |
| `StaffUserListSerializer` exact fields, no extra PII | ✅ Yes | `serializers.py:34-41`; tests assert no `profile`/`first_name`/`last_name` |
| 7-day in-client sales-flow window | ✅ Yes | `FLOW_DAYS = 7`, `InventoryView.tsx` |
| `DispatchRoutesView` + pure `groupOrdersByCity` | ✅ Yes | exported pure function, `DispatchRoutesView.tsx:48-62` |

### Non-Goal Audit (independently re-verified)

| Non-goal | Evidence | Result |
|----------|----------|--------|
| No models changed | `git diff --name-only 83cb01f..HEAD -- "*models.py"` → empty | ✅ PASS |
| No migrations | `git diff --name-only 83cb01f..HEAD -- "*migrations*"` → empty | ✅ PASS |
| No aggregation endpoint | Diff adds no `/flow/`, `/stats`, or `aggregate` route; only URL change is `staff_urls.py` GET+POST coexist on `/api/staff/users/` | ✅ PASS |
| No `DeliveryRoute` model | `git grep -c "DeliveryRoute" HEAD -- backend` → 0 | ✅ PASS |
| No auth changes | No `permissions.py`/auth middleware in diff; `IsAdmin`/`STAFF_ROLES` reused from baseline; `backend/users/permissions.py` untouched | ✅ PASS |
| Change scope | 16 files: 12 frontend (`app/admin/{page,orders/page,staff/page}.tsx`, `app/{bodega,despacho}/page.tsx`, `components/admin/{StaffManagementView,StaffUserList,StaffUserForm,InventoryView,DispatchRoutesView}.tsx`, `components/Navbar.tsx`, `lib/api.ts`) + 4 backend in `users` app (`serializers.py`, `views.py`, `staff_urls.py`, `tests.py`) | ✅ PASS |

### Issues Found

**CRITICAL**: None
**WARNING**: None
**SUGGESTION**:
- Frontend has no automated test runner; `groupOrdersByCity` is deliberately pure/exported — a unit test could be added when a runner exists.
- `/bodega` issues two `getStaffOrders` fetches on mount (queue + inventory flow); accepted tradeoff, no promise deduplication at this scale.

### Risks / Notes (carried forward)

1. **Slice-3 size vs 400-line budget**: slice-3 diff is 763 raw changed lines (533+/230−) against the 400 budget; ≈229 lines are relocation of the inline despacho queue into `DispatchRoutesView` (net-new authored ≈304). Maintainer `size:exception` reset accepted (ledger reset `sha256:738631b6…`, actor marceloubb).
2. **Customer-redirect leg of the route matrix** (`RequireRole` browser redirect for non-allowed roles) is code-confirmed (`RequireRole.tsx:30,39-41`) but only fully provable by a human browser check — no frontend test framework.
3. Backend suite reported by phase 4 and this gate both at exactly 103 tests (163.5s / 162.999s); no flakiness observed.

### Verdict

**PASS (archive-ready)** — all 8/8 spec requirements and 21/21 scenarios have concrete evidence; backend suite 103/103 green; frontend tsc/lint/build green; non-goal audit clean.