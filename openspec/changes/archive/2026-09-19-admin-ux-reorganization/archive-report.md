# Archive Report: admin-ux-reorganization

**Status**: archived — change complete (22/22 tasks `[x]`, verify PASS, 0 remediation required)
**Date**: 2026-09-19 (archive folder date prefix follows this repo's convention of using the change/apply date, per the orchestrator's explicit instruction; report written 2026-09-20)
**Archiver**: sdd-archive (final-state authority: this report describes the change AT CLOSE, not at earlier snapshot times)
**Archived to**: `openspec/changes/archive/2026-09-19-admin-ux-reorganization/`
**Artifact store**: hybrid (openspec filesystem + Engram mirror)

## Change Identity

- **Change**: admin-ux-reorganization — reorganize staff surfaces into ONE dedicated view per task (order management incl. discrepancy resolution; staff management; bodega inventory + sales flow; despacho city-grouped routes) plus the minimal backend endpoint (`GET /api/staff/users/`) supporting the staff summary.
- **Capabilities**: `staff-admin-ui` (modified — route set, navbar role-link map, staff-view contract) and `staff-user-list` (new — admin-only staff list endpoint).
- **Branch at close**: `feat/staff-data-views` @ `e520af7` (`e520af76ca973338b11d8415b2a864f912a6319d`)
- **Baseline at close**: `main` @ `83cb01f` (`83cb01f9f5d4dab2e224454f68f95d0781ebffb1`) — pre-change `main`; the change was never merged to `main`.
- **Date**: 2026-09-19 (apply) / 2026-09-20 (final verify gate + archive)
- **Mode**: Standard (strict_tdd false; frontend `test_command: "—"`)

## Delivered Scope

11 commits across 3 auto-chained slices (stacked-to-main, delivery strategy `auto-chain`):

| Slice | Branch | Commits | Content |
|-------|--------|---------|---------|
| 1 — Frontend reorg | `feat/admin-routes` | `6a9a3c6`, `a8bd25b`, `9704fb1`, `c22077e`, `01aecba` | `/admin` redirect to `/admin/orders`; `app/admin/orders` + `app/admin/staff` pages; `StaffManagementView`/`StaffUserList`/`StaffUserForm.onCreated`; Navbar `STAFF_LINKS`; `listStaffUsers` + `StaffUser` type |
| 2 — Staff-list backend | `feat/staff-user-list` (targets slice-1 branch) | `4609dc4`, `00cd114` | `StaffUserCreateView` → `StaffUserView` (GET+POST coexist); `StaffUserListSerializer`; URL name `staff-user`; `StaffUserListViewTests` (8 cases) |
| 3 — Data views | `feat/staff-data-views` (targets slice-2 branch) | `84eb486`, `acbc364`, `247021c`, `e520af7` | `InventoryView` (stock, low-stock `≤5` / `Sin stock`@0, 7-day in-client flow) on `/bodega`; `DispatchRoutesView` + pure `groupOrdersByCity` on `/despacho` |

Changed files `83cb01f..HEAD`: 16 (12 frontend + 4 backend, all in the `users` app). No models, no migrations, no auth changes.

## Final Verification State (at close)

- **Verdict**: PASS — per orchestrator final-state facts: `gentle-ai sdd-verify-validate` reported `valid: true`, `verdict: pass`; the verify-report envelope (`gentle-ai.verify-result/v1`, persisted to openspec AND Engram) shows `verdict: pass`, 0 blockers, 0 critical findings.
- **Requirements**: 8/8 (5 `staff-admin-ui` delta + 3 `staff-user-list`)
- **Scenarios**: 21/21 (15 `staff-admin-ui` + 6 `staff-user-list`; the 6 backend scenarios runtime-tested in the 103-test run, 15 frontend code+build-evidenced per the project's declared manual-harness convention)
- **Backend**: `Ran 103 tests in 162.999s` — OK, exit 0 (final gate; phase-4 run reported `163.517s`, same 103 count — no flakiness observed)
- **Frontend**: `npx tsc --noEmit` exit 0; `npm run lint` exit 0 (0 errors, 4 pre-existing warnings in untouched files: cart, checkout, products/[id], ProductCard); `npm run build` exit 0 — 16 static pages incl. `/admin`, `/admin/orders`, `/admin/staff`, `/bodega`, `/despacho`
- **Blockers / CRITICAL findings**: 0. **WARNING**: 0. **SUGGESTION**: frontend has no automated test runner (`groupOrdersByCity` kept pure/exported for a future unit test); `/bodega` issues two `getStaffOrders` fetches on mount (accepted tradeoff).

## Coverage Counts (at close)

| Metric | Value |
|--------|-------|
| Tasks | 22/22 complete (`[x]` in archived tasks.md; 0 unchecked) |
| Requirements | 8/8 (2 delta specs) |
| Scenarios | 21/21 |
| Backend tests | 103 OK (exit 0) |
| Blockers / CRITICAL findings | 0 |
| Commits | 11 |
| Chained slices | 3 |

## Ledger Settlement Summary

- **5 attempts settled** across the chain (all work units settled; per orchestrator final-state facts).
- **1 maintainer `size:exception` reset**: slice-3 (data views) diff was 763 raw changed lines (533+/230−) vs the 400-line slice budget, of which ≈229 lines are the relocation of the inline despacho queue into `DispatchRoutesView` (net-new authored ≈304). Accepted via maintainer reset `sha256:738631b6…` (actor `marceloubb`). If the chain branches are promoted to PRs, attach this `size:exception` note.
- Snapshot-recorded history (per `apply-progress.md`, 2026-09-19): slice-1 settle was captured while the openspec docs commit (tasks.md + apply-progress.md, 185 tracked lines) charged the attempt budget (503 vs 420, `changed_line_budget_exceeded`), the docs commit was reverted (code diff 318 lines under budget), and a maintainer reset (expected revision `sha256:85201410e6…`) was requested; slice-2 settle passed (second attempt, `--remediates-evidence-revision sha256:197bd7d…` chain binding — slice-1 evidence revision); slice-3 evidence recorded (`sha256` over `git diff 00cd114..HEAD`), settle completed within this chain.
- **Tokens NOT acquired/settled by archive** (per orchestrator instruction): the `final-verify-gate` and `archive` objective tokens remain held by the orchestrator. They must not be re-acquired or settled here.

## Delivery State (at close)

- Branches `feat/admin-routes`, `feat/staff-user-list`, `feat/staff-data-views` were **not merged** into `main` (`main` still @ `83cb01f`).
- **No PRs were created** — the chain boundary is the branch per the tasks.md slice plan ("PR NOT created — chain boundary is the branch"). PR promotion and merge are a pending delivery decision owned by the orchestrator, outside the archive phase.
- Chain strategy: stacked-to-main (PR 1 → PR 2 → PR 3 if promoted).

## Non-Goals (respected, re-audited at close)

| Non-goal | Evidence |
|----------|----------|
| No models changed | `git diff --name-only 83cb01f..HEAD -- "*models.py"` → empty |
| No migrations | `git diff --name-only 83cb01f..HEAD -- "*migrations*"` → empty |
| No aggregation endpoint | Only URL change is `staff_urls.py` GET+POST coexist on `/api/staff/users/` (list, not aggregation); no `/flow/`, `/stats`, `aggregate` routes |
| No `DeliveryRoute` model | `git grep -c "DeliveryRoute"` → 0 matches at baseline `83cb01f` AND at HEAD |
| No auth changes | No `permissions.py`/auth middleware in diff; `IsAdmin`/`STAFF_ROLES` reused from baseline; unchanged |
| No pagination fix for `GET /api/staff/orders/` | Deferred p2 (flagged risk, out of scope) |

## Spec Sync (delta → main specs)

| Domain | Action | Details |
|--------|--------|---------|
| staff-admin-ui | **Composed** (main spec existed) | 2 MODIFIED ("Guarded Operational Routes" — 5 routes + `/admin` redirect, 6 scenarios; "Navbar Role-Conditional Links" — single-task links, 3 scenarios) + 3 ADDED ("Staff Management View", "Bodega Inventory View", "Despacho Route Grouping"); "RequireRole Client Wrapper" and "User.role in Frontend Contract" preserved byte-identical. Result: 4 → 7 requirements |
| staff-user-list | **Created** (new main spec) | 3 requirements, byte-identical copy (`Staff User List Endpoint`, `Staff List Authorization`, `Collection URL Coexistence`) |

Unrelated baseline specs untouched: `env-settings`, `order-integrity`, `staff-or-read-only` carry pre-existing modifications from earlier changes (predate `admin-ux-reorganization`; left as-is per instruction). No REMOVED/RENAMED sections existed in the delta, so no destructive-merge warning applied (`config.yaml` has no `rules.archive` overrides; `phases.archive: true`).

### Compose invocation (native composition, exit 0 = evidence)

```bash
gentle-ai sdd-archive-compose --canonical "openspec/specs/staff-admin-ui/spec.md" --delta "openspec/changes/admin-ux-reorganization/specs/staff-admin-ui/spec.md" --output "openspec/specs/staff-admin-ui/spec.md.compose-tmp"   # exit 0
```

Applied with `mv` (tmp → canonical). **Cosmetic note**: the delta's trailing free-text line ("The `RequireRole Client Wrapper` and `User.role in Frontend Contract` requirements remain unchanged and valid.") was appended by the composer to the end of the modified Navbar block, and the following `### Requirement:` headings have no blank line before them. This is native compose output — all 7 requirements and every scenario are present and correctly matched by heading name; future composes are unaffected (matching is by `### Requirement:` heading). Recorded for transparency; no content correction was applied to the composed file.

### Mechanical copy readback (new domain, `diff -r` verbatim — only empty output passes)

```
STEP2B[staff-user-list] DIFF_EXIT=0 output=   (delta vs temp before mv; empty)
```

Copy used temp-file + `cp` + `diff -r` + `mv`; no leftover `.compose-tmp` or `.spec.md.*` files remain.

## Archive Move Readback (verbatim)

`git mv` refused — change folder untracked (openspec artifacts are never committed in this repo; `fatal: source directory is empty`, exit 128). Fallback per skill: snapshot → verify source unchanged vs pre-move snapshot → plain `mv` → readback vs snapshoot:

```
GIT_MV_EXIT=128                              (expected: openspec untracked)
FALLBACK_SOURCE_DIFF_EXIT=0 output=          (snapshot vs source before plain mv — unchanged)
PLAIN_MV=ok
READBACK_DIFF_EXIT=0 output=                 (snapshot vs archived destination — byte-identical)
SNAPSHOT_CLEANED=True  SOURCE_GONE=True  DEST_EXISTS=True
```

- [x] Main specs updated correctly (1 composed — staff-admin-ui 7 requirements; 1 created — staff-user-list 3 requirements)
- [x] Change folder moved to `openspec/changes/archive/2026-09-19-admin-ux-reorganization/`
- [x] Archive contains all artifacts: `proposal.md`, `exploration.md`, `design.md`, `tasks.md`, `apply-progress.md`, `verify-report.md`, `specs/staff-admin-ui/spec.md`, `specs/staff-user-list/spec.md`, `archive-report.md` (additive)
- [x] Archived `tasks.md`: 22/22 `[x]`, 0 unchecked implementation tasks
- [x] Active `openspec/changes/` no longer contains this change (only `archive/`)
- [x] Verbatim `diff -r` readbacks above, all empty / exit 0

## Task Completion Gate

Passed before any sync/move: persisted `tasks.md` showed 22/22 checked, 0 unchecked (re-verified post-move in the archived copy: 22 `[x]`, 0 `[ ]`). No stale-checkbox reconciliation was needed. The launch prompt's final-state facts (branch/HEAD, 22/22 tasks, 103 tests, PASS verdict, ledger state) rank above the intermediate `apply-progress.md`/`verify-report.md` snapshots and were used for all close-state claims above.

## Residual Risks (recorded, do not block archive)

1. **Slice-3 diff over 400-line budget** (763 raw, ≈229 relocation, net-new ≈304): accepted via maintainer `size:exception` reset `sha256:738631b6…` (actor `marceloubb`). Attach the note if the chain is promoted to PRs.
2. **Customer/bodega-redirect leg of the route matrix** is code-confirmed (`RequireRole.tsx:30,39-41`) but only fully provable by a human browser check — the frontend has no automated test runner (`test_command: "—"`).
3. **`/bodega` double-fetch**: two `getStaffOrders` calls on mount (queue + inventory flow); accepted tradeoff, no promise deduplication at this scale.
4. **Compose cosmetic footer/heading spacing** in `openspec/specs/staff-admin-ui/spec.md` (see Spec Sync note): native tool output, no content impact.
5. **Delivery pending**: branches unmerged, no PRs created — PR promotion/merge decision owned by the orchestrator.

## Traceability

Artifacts read (filesystem, openspec locators): `proposal.md`, `exploration.md`, `design.md`, `tasks.md`, `apply-progress.md`, `verify-report.md`, `specs/staff-admin-ui/spec.md`, `specs/staff-user-list/spec.md`, baseline `openspec/specs/staff-admin-ui/spec.md`, `openspec/config.yaml`, prior archive example `openspec/changes/archive/2026-09-17-security-hardening/archive-report.md`, and shared conventions (`sdd-phase-common.md`, `openspec-convention.md`, `sdd-archive SKILL.md`).

Engram observation IDs read (hybrid mirrors): proposal #85, spec #86, design #87, tasks #89, apply-progress #90, explore #84, verify-report #93 (plus discovery #91 — attempt budget charges committed openspec artifacts). Archive report persisted as `sdd/admin-ux-reorganization/archive-report` (hybrid traceability).

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived (22/22 tasks, PASS 8/8 requirements / 21/21 scenarios, 103 backend tests OK, non-goals respected). Delivery (PR promotion / merge of the 3 stacked branches) remains an orchestrator decision after archive.