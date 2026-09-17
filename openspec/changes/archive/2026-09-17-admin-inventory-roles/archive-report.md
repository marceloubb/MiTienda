# Archive Report: admin-inventory-roles

**Status**: archived — change complete (27/27 tasks, verify PASS, 0 remediation required)
**Date**: 2026-09-17
**Archiver**: sdd-archive (final-state authority: this report describes the change AT CLOSE, not at earlier snapshot times)
**Archived to**: `openspec/changes/archive/2026-09-17-admin-inventory-roles/`
**Artifact store**: hybrid (openspec filesystem + Engram mirror)

## Final Grouped PR List

Per maintainer decisions (actor marceloubb), the original oversized PR attempts (PR5 661 lines, PR6 610 lines — both over the 400-line budget, ledger resets recorded) were re-sliced. The final delivered grouping, which this report records, is:

| PR | Content | Commits |
|----|---------|---------|
| PR1a | Role model foundation (role field, permission classes, signals, backfill migration) | `beda533` |
| PR1b | Role endpoints + tests (staff-user endpoint, user detail, regression suites) | `4924400` |
| PR2 | Order state machine + admin cancel (ready status, StaffOrderViewSet, atomic cancel) | `0b62c6b`, `df3e8c3`, `b7b9d77` |
| PR3 | Discrepancy flow (flag, resolve, blocked transitions) | `0a48bc8`, `b8f01a0`, `12a1192` |
| PR4 | Frontend foundation (types, staff API, order-status, RequireRole, Navbar) | `c1fb3e6`, `9d67d1d`, `eb651e7`, `be118cc`, `95ca829` |
| PR5a | Admin surface: StaffUserForm (task 5.1) | `113c3f6` |
| PR5b | Admin surface: OrdersDashboard + admin page wiring (tasks 5.2, 5.4) | `10cc38c`, `9ad6feb` |
| PR5c | Admin surface: DiscrepancyPanel + page re-wiring (task 5.3) | `61534ff`, `4920b16` |
| PR6a | Bodega queue surface (task 6.1) | `c54f91d` |
| PR6b | Despacho queue + shared orders styles (tasks 6.2, 6.3) | `cb0cc5a`, `c05e252` |

Note: the per-phase sections of `apply-progress.md` describe the pre-slice attempts as "PR 5"/"PR 6" (661/610 authored lines, `changed_line_budget_exceeded: true`, `next_action: reset`). Those sections are historical snapshots; the grouping above is the final delivered state.

## Evidence Revision

- **Whole-change evidence**: `sha256:0d83534d00aaee04666e5ea75fac448b701472f4fb79d47194ae681076ae7e91`
- **Diff range**: `9818fcb..HEAD` — **HEAD**: `c05e252` (matches the final delivered commit)
- Final verification run (per `verify-report` #59 and re-run from scratch): `manage.py test` 95/95 OK (152.5s), `manage.py check` clean, `makemigrations --check --dry-run` clean, eslint 0 errors (4 pre-existing `no-img-element` warnings in untouched cart/checkout/products/[id]/ProductCard), `next build` 14/14 static pages.

## Coverage Counts (at close)

| Metric | Value |
|--------|-------|
| Tasks | 27/27 complete (`[x]` in archived tasks.md; 0 unchecked) |
| Requirements | 22/22 (6 specs) |
| Scenarios | 59/59 (50 backend runtime-passed + 9 frontend via project harness: lint/build + source inspection) |
| Backend tests | 95/95 OK |
| Blockers / CRITICAL findings | 0 |

## Spec Sync (delta → main specs)

| Domain | Action | Details |
|--------|--------|---------|
| order-integrity | Composed (main spec existed) | +1 ADDED requirement ("Atomic Cancel with Stock Restore"); 3 pre-existing requirements preserved |
| staff-or-read-only | Composed (main spec existed) | 2 MODIFIED requirements ("Staff-Only Product Writes", "Staff-Only Category Writes") with bodega/despacho denial; behavior text updated |
| order-discrepancy | Created (new main spec) | 4 requirements, byte-identical copy |
| order-state-machine | Created (new main spec) | 7 requirements, byte-identical copy |
| role-based-access | Created (new main spec) | 5 requirements, byte-identical copy |
| staff-admin-ui | Created (new main spec) | 5 requirements, byte-identical copy |

### Compose invocations (native composition, exit 0 = evidence)

```bash
gentle-ai sdd-archive-compose --canonical "openspec/specs/order-integrity/spec.md" --delta "openspec/changes/admin-inventory-roles/specs/order-integrity/spec.md" --output "openspec/specs/order-integrity/spec.md.compose-tmp"   # exit 0
gentle-ai sdd-archive-compose --canonical "openspec/specs/staff-or-read-only/spec.md" --delta "openspec/changes/admin-inventory-roles/specs/staff-or-read-only/spec.md" --output "openspec/specs/staff-or-read-only/spec.md.compose-tmp"   # exit 0
```

Merged main specs verified: `order-integrity` gained "Atomic Cancel with Stock Restore" (line 86), prior requirements intact; `staff-or-read-only` MODIFIED blocks applied with bodega/despacho denial language.

### Mechanical copy readbacks (new domains, `diff -r` verbatim — only empty output passes)

```
DIFF[order-discrepancy] exit=0 output=
DIFF[order-state-machine] exit=0 output=
DIFF[role-based-access] exit=0 output=
DIFF[staff-admin-ui] exit=0 output=
```

Each copy used temp-file + `cp` + `diff -r` + `mv`; no leftover `.compose-tmp` or `.spec.md.*` files remain.

## Archive Move Readback (verbatim)

`git mv` refused (change folder untracked — openspec artifacts are never committed in this repo), fallback verified source unchanged vs pre-move snapshot, then plain `mv`:

```
FALLBACK_SOURCE_DIFF exit=0 output=          (snapshot vs source before plain mv — unchanged)
READBACK_DIFF exit=0                         (snapshot vs archived destination)
READBACK_OUTPUT_BEGIN
READBACK_OUTPUT_END                          (empty — byte-identical archive)
```

- [x] Main specs updated correctly (2 composed, 4 created)
- [x] Change folder moved to `openspec/changes/archive/2026-09-17-admin-inventory-roles/`
- [x] Archive contains all artifacts (proposal.md, specs/ ×6, design.md, tasks.md, apply-progress.md, verify-report.md, exploration.md)
- [x] Archived `tasks.md`: 27/27 `[x]`, 0 unchecked implementation tasks
- [x] Active `openspec/changes/` no longer contains this change (only `archive/`)
- [x] Verbatim `diff -r` readbacks above, all empty / exit 0

## Task Completion Gate

Passed before any sync/move: persisted `tasks.md` showed 27/27 checked, 0 unchecked. No stale-checkbox reconciliation was needed.

## Remediation Status

0 remediation required. Ledger history (recorded, non-blocking): PR1/PR2/PR5/PR6 original attempts each recorded `changed_line_budget_exceeded: true` with `next_action: reset` (maintainer reset by marceloubb); the re-sliced PR5a/5b/5c and PR6a/6b attempts settled `passed` under the 400-line budget. The whole-change verify settle (evidence `sha256:0d83534d…`) remediated the final PR6 evidence binding (`sha256:43c0266b…`), closing the PR6 evidence chain. No attempt evidence remains unremediated in the final chain.

## Non-Blocking Follow-Ups (recorded, do not block archive)

1. **Frontend `Order.customer` type absent** from the Phase-4 `Order` type — the admin dashboard uses `shipping_name` for the customer column; adding the field would touch committed Phase-4 boundary code (noted in PR5 apply-progress and verify SUGGESTION).
2. **`fetchAPI` collapses DRF 400 field-error bodies** to a generic message — `StaffUserForm` adds an inline hint covering likely causes (duplicate username/email, short password); enriching `fetchAPI` would cross the committed Phase-4 boundary (noted in PR5 apply-progress and verify SUGGESTION).

## Traceability

Artifacts read (filesystem, openspec locators): `proposal.md`, `specs/{order-discrepancy,order-integrity,order-state-machine,role-based-access,staff-admin-ui,staff-or-read-only}/spec.md`, `design.md`, `tasks.md`, `apply-progress.md`, `verify-report.md`.

Engram mirror observations read (hybrid traceability): `#59` (`sdd/admin-inventory-roles/verify-report`), `#55` (SDD apply-progress PR6 delivered), `#56` (PR5b delivered). The proposal/design/tasks/spec-delta artifacts were persisted to the openspec filesystem only; verify-report and apply-progress segments were mirrored to Engram.

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived. Ready for the next change.