```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:0d83534d00aaee04666e5ea75fac448b701472f4fb79d47194ae681076ae7e91
verdict: pass
blockers: 0
critical_findings: 0
requirements: 22/22
scenarios: 59/59
test_command: .venv\Scripts\python.exe manage.py test
test_exit_code: 0
test_output_hash: sha256:fff3b52114acc3086a9b0bf75c25e5b43d731194537127189c77d7908494e7ee
build_command: npx next build
build_exit_code: 0
build_output_hash: sha256:2befa916c63973d5f4cfca34b042ec2624fe321f22db4747f26dafa5b742e059
```

## Verification Report

**Change**: admin-inventory-roles
**Version**: delta specs v1 (6 spec files: role-based-access, staff-or-read-only, order-state-machine, order-integrity, order-discrepancy, staff-admin-ui)
**Mode**: Standard (strict_tdd: false)
**Verifier**: independent final verification — Phases 1–6, 27/27 tasks; evidence re-run from scratch (no apply-progress claims reused)

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 27 |
| Tasks complete | 27 (`[x]` in tasks.md) |
| Tasks incomplete | 0 |
| Requirements (6 specs) | 22 |
| Scenarios (6 specs) | 59 |

### Build & Tests Execution

**Backend** — `.venv\Scripts\python.exe` (backend/)
```text
manage.py check                  → System check identified no issues (0 silenced).
manage.py makemigrations --check --dry-run → No changes detected
manage.py test                   → Ran 95 tests in 152.544s — OK (exit 0)
```
Test suite composition: 95 tests = 92 (orders/users/products incl. 44 new for this change) + 3 (mitienda settings-guard). New coverage: `StaffRoleBackfillMigrationTests`, `RoleModelSyncTests`, `RolePermissionTests`, `UserDetailRoleTests`, `StaffUserCreationTests`, `StaffDriftSignalTests` (users); `RoleLockdownTests` (products); `StaffOrderAdvanceTests`, `AdminCancelTests`, `DiscrepancyFlowTests` (orders); pre-existing `OrderHardeningTests`/`CartItemUpdateTests`/`StaffOrReadOnlyTests`/`SettingsGuardTests` green in the same run (archived-spec regression).

**Frontend** — (frontend/)
```text
npx eslint .  → ✖ 4 problems (0 errors, 4 warnings) — all @next/next/no-img-element in
                app/cart/page.tsx, app/checkout/page.tsx, app/products/[id]/page.tsx,
                components/ProductCard.tsx — all four confirmed UNTOUCHED by this change
                (no matches in the whole-change diff 9818fcb..HEAD). Exit 0.
npx next build → Compiled successfully; TypeScript OK; 14/14 static pages generated
                incl. /admin, /bodega, /despacho, /orders. Exit 0.
```
Frontend runtime harness note: this project has no JS test runner (no jest/vitest config) — documented in design.md ("Testing Strategy: Frontend = Types/lint/build") and every apply phase; lint/build are the harness, consistent with the established project contract.

**Coverage**: not measured (no coverage tooling configured in this project) — ➖ Not available.

### Spec Compliance Matrix

All 59 scenarios map to covering tests that **passed at runtime** in the 95-test run above; the 9 staff-admin-ui (frontend) scenarios are verified by source inspection plus green lint/build (project-declared frontend harness).

| Requirement | Scenarios | Test | Result |
|-------------|-----------|------|--------|
| role-based-access: UserProfile Role Field | 3/3 | users/tests: `test_default_role_on_new_user_via_register`, `test_backfill_promotes_is_staff_users`, `test_patch_invalid_role_rejected` | ✅ COMPLIANT |
| role-based-access: Admin is_staff Sync | 2/2 | users/tests: `test_profile_save_with_admin_role_sets_is_staff`, `test_role_change_from_admin_to_bodega_unsets_is_staff`, `test_patch_role_admin_sets_is_staff_true`, `test_patch_role_bodega_unsets_is_staff` | ✅ COMPLIANT |
| role-based-access: DRF Permission Classes | 4/4 | users/tests: `test_admin_allowed_on_is_admin`, `test_bodega_denied_on_is_admin`, `test_is_staff_role_includes_all_staff_roles`, `test_customer_denied_on_is_staff_role` | ✅ COMPLIANT |
| role-based-access: Staff-User Creation Endpoint | 2/2 | users/tests: `test_admin_creates_bodega_user`, `test_admin_creates_admin_user`, `test_non_admin_rejected`, `test_bad_role_rejected`, `test_customer_role_rejected`, `test_duplicate_username_rejected`, `test_short_password_rejected` | ✅ COMPLIANT |
| role-based-access: UserSerializer Role Exposure | 1/1 | users/tests: `test_get_exposes_role_and_is_staff` | ✅ COMPLIANT |
| staff-or-read-only: Staff-Only Product Writes | 6/6 | products/tests: `test_non_staff_product_write_rejected`, `test_unauthenticated_product_write_rejected`, `test_staff_product_write_succeeds`, `test_bodega_product_write_rejected`, `test_despacho_product_write_rejected`, `test_unauthenticated_read_allowed` | ✅ COMPLIANT |
| staff-or-read-only: Staff-Only Category Writes | 3/3 | products/tests: `test_non_staff_category_write_rejected`, `test_staff_category_write_succeeds`, `test_bodega_category_write_rejected` | ✅ COMPLIANT |
| order-state-machine: Ready Status | 1/1 | orders/tests: `test_bodega_advances_processing_to_ready` | ✅ COMPLIANT |
| order-state-machine: Bodega Transition Scope | 4/4 | orders/tests: `test_bodega_advances_pending_to_processing`, `test_bodega_advances_processing_to_ready`, `test_bodega_cannot_advance_ready_to_shipped`, `test_bodega_cannot_skip_a_state` | ✅ COMPLIANT |
| order-state-machine: Despacho Transition Scope | 3/3 | orders/tests: `test_despacho_advances_ready_to_shipped`, `test_despacho_advances_shipped_to_delivered`, `test_despacho_cannot_advance_pending` | ✅ COMPLIANT |
| order-state-machine: Admin May Also Advance | 1/1 | orders/tests: `test_admin_advances_pending_to_processing`, `test_admin_advances_ready_to_shipped`, `test_admin_cannot_advance_delivered` | ✅ COMPLIANT |
| order-state-machine: Admin Cancel with Stock Restore | 6/6 | orders/tests: `test_admin_cancels_pending_restores_stock`, `test_admin_cancels_shipped_restores_stock`, `test_admin_cancels_discrepancy_order_restores_stock`, `test_non_admin_cancel_denied`, `test_cannot_cancel_delivered_order`, `test_cannot_cancel_cancelled_order` | ✅ COMPLIANT |
| order-state-machine: Unauthorized Transition Rejection | 1/1 | orders/tests: `test_customer_cannot_advance`, `test_customer_cannot_list_staff_orders` | ✅ COMPLIANT |
| order-integrity: Atomic Cancel with Stock Restore | 3/3 | orders/tests: `test_cancel_restores_all_stock_atomically`, `test_cancel_restores_to_pre_checkout_levels`, `test_cancel_does_not_affect_other_orders`, `test_cancel_forced_mid_failure_restores_nothing` | ✅ COMPLIANT |
| order-discrepancy: Bodega Discrepancy Flag | 3/3 | orders/tests: `test_bodega_flags_processing_order_as_damaged`, `test_bodega_flags_pending_order_as_missing`, `test_despacho_cannot_flag_discrepancy`, `test_flag_rejects_bad_reason` | ✅ COMPLIANT |
| order-discrepancy: Discrepancy Blocks Normal Flow | 3/3 | orders/tests: `test_bodega_cannot_advance_discrepancy_order`, `test_despacho_cannot_advance_discrepancy_order`, `test_admin_cannot_advance_discrepancy_order`, `test_admin_cancels_discrepancy_order_restores_stock` | ✅ COMPLIANT |
| order-discrepancy: Admin Resolution | 3/3 | orders/tests: `test_full_cycle_processing_flag_block_resolve_resume`, `test_full_cycle_pending_flag_block_resolve_resume`, `test_non_admin_cannot_resolve`, `test_resolve_on_non_discrepancy_returns_400` | ✅ COMPLIANT |
| order-discrepancy: Discrepancy Surfaced to Admin | 1/1 | orders/tests: `test_admin_list_shows_discrepancy_reason` | ✅ COMPLIANT |
| staff-admin-ui: Guarded Operational Routes | 4/4 | source: `app/admin/page.tsx` `RequireRole(["admin"])`; `app/bodega/page.tsx` `["bodega","admin"]`; `app/despacho/page.tsx` `["despacho","admin"]`; `components/RequireRole.tsx` redirect logic; `next build` 14/14 incl. the 3 routes | ✅ COMPLIANT (lint/build harness + source) |
| staff-admin-ui: RequireRole Client Wrapper | 2/2 | source: `RequireRole.tsx` — loading→null, `!user`→/login, mismatch→`router.push(redirectTo)`; `roles.includes(effectiveRole)` gates children; `next build` TS-checked usage in all 3 routes | ✅ COMPLIANT (lint/build harness + source) |
| staff-admin-ui: Navbar Role-Conditional Links | 2/2 | source: `Navbar.tsx` `STAFF_LINKS` — admin 3 links, bodega→/bodega, despacho→/despacho, customer→[] (exhaustive `Record<UserRole,…>` enforced by TS build) | ✅ COMPLIANT (lint/build harness + source) |
| staff-admin-ui: User.role in Frontend Contract | 1/1 | source: `lib/api.ts` `UserRole` union + `User.role?/is_staff?`; `lib/auth-context.tsx` `useRole()`; `next build` TS pass | ✅ COMPLIANT (lint/build harness + source) |

**Compliance summary**: 59/59 scenarios compliant — 50/50 backend (runtime-passed covering tests) + 9/9 frontend (project harness: source inspection + green eslint/build).

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| UserProfile.role exclusive field, default customer | ✅ Implemented | `users/models.py` — choices customer|admin|bodega|despacho; `save()` syncs `is_staff ⇔ role=='admin'` (update_fields) |
| Backfill migration | ✅ Implemented | `users/migrations/0002_role_backfill.py` — AddField + RunPython `is_staff→admin`, noop reverse |
| 4 DRF permission classes | ✅ Implemented | `users/permissions.py` — `IsAdmin/IsBodega/IsDespacho/IsStaffRole`, all read `user.profile.role` |
| Drift guard | ✅ Implemented | `users/signals.py` + `apps.py ready()` — recursion-guarded post_save; queryset update never re-fires |
| Staff-user endpoint + role PATCH | ✅ Implemented | `users/views.py` `UserDetailView` (GET/PATCH, IsAdmin), `StaffUserCreateView` (POST, IsAdmin, STAFF_ROLE_CHOICES, is_staff by role); `staff_urls.py` + `mitienda/urls.py` at `api/staff/users/` |
| UserSerializer exposes role/is_staff (read-only) | ✅ Implemented | `users/serializers.py` — `role` source `profile.role` read-only; `is_staff` read-only |
| ready + discrepancy statuses + helper fields | ✅ Implemented | `orders/models.py` — 7-value STATUS_CHOICES; `pre_discrepancy_status` (nullable), `discrepancy_reason` (missing\|damaged) |
| Staff order viewset + matrix | ✅ Implemented | `orders/views.py` `StaffOrderViewSet` (IsStaffRole, list all); `ADVANCE_MATRIX` bodega pending→processing→ready / despacho ready→shipped→delivered / admin all; atomic + `select_for_update()`; optional `to_status` skip guard 403; discrepancy 403 |
| Admin cancel, atomic stock restore | ✅ Implemented | `_restore_order_stock` via `F('stock')+quantity` inside `transaction.atomic()`; delivered/cancelled 400; non-admin 403 |
| Discrepancy flag + resolve | ✅ Implemented | `discrepancy` (bodega/admin, pending|processing|ready only, reason 400, flag-on-flag 403); `resolve_discrepancy` url_path hyphenated, admin-only, non-discrepancy 400, returns `pre_discrepancy_status` |
| StaffOrderSerializer | ✅ Implemented | `orders/serializers.py` — `customer` (username) + `discrepancy_reason`; all statuses incl. ready serialized |
| Frontend contract | ✅ Implemented | `lib/api.ts` — UserRole/OrderStatus/DiscrepancyReason types, 6 staff API fns; `lib/order-status.tsx` shared styles (ready primary, discrepancy destructive); `RequireRole.tsx`; `Navbar.tsx` STAFF_LINKS; `useRole()` in auth-context |
| Admin surface | ✅ Implemented | `app/admin/page.tsx` wires OrdersDashboard + StaffUserForm + DiscrepancyPanel (`components/admin/*`) |
| Bodega/despacho queues | ✅ Implemented | `app/bodega/page.tsx` (pending→processing→ready + flag with reason picker, discrepancy chips), `app/despacho/page.tsx` (ready→shipped→delivered, "Sin acciones" on delivered) |
| Customer orders page | ✅ Implemented | `app/orders/page.tsx` imports shared `OrderStatusBadge`; behavior unchanged |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| `UserProfile.role` single field (not Groups/AUTH_USER_MODEL) | ✅ Yes | OneToOne profile keeps role; migration backfills |
| Real `discrepancy` status + helpers (not boolean) | ✅ Yes | Gatekeeper pattern as designed; `default=''` on reason (documented non-blocking deviation: non-null CharField needs a default) |
| `UserProfile.save()` is_staff sync | ✅ Yes | Single choke point, `update_fields` |
| User post_save drift guard | ✅ Yes | Recursion-guarded; closes Django-admin checkbox path |
| Product lockdown untouched | ✅ Yes | `IsStaffOrReadOnly`/`StaffWriteDeniedViewMixin` unmodified; bodega/despacho denied by construction (is_staff=False) — new denial tests prove it |
| Role PATCH admin-only GET/PATCH `/api/users/{id}/` | ✅ Yes | IsAdmin; blocks self-promotion |
| Customer serializer + 405 lockdown untouched | ✅ Yes | `OrderSerializer` unchanged; customer read-only viewset intact |
| Cancel lives only in staff viewset (archived order-integrity) | ✅ Yes | `create_from_cart` atomic checkout untouched; cancel is new admin path |
| `resolve-discrepancy` url_path | ✅ Yes | Explicit `url_path='resolve-discrepancy'` (DRF 3.18.1 doesn't hyphenate method names) |
| Frontend UX-only guards | ✅ Yes | RequireRole redirects; DRF is enforcement boundary (comment states it) |
| Shared order-status styles | ✅ Yes | `lib/order-status.tsx` (was `.ts` in design — `.tsx` required because it renders JSX; documented deviation) |

### Issues Found

**CRITICAL**: None.
**WARNING**: None.
**SUGGESTION**:
- Ledger hygiene: PR1/PR2/PR5/PR6 attempts recorded `changed_line_budget_exceeded` with `next_action: reset` (maintainer decisions tracked in apply-progress; resets are maintainer actions, not verification blockers). This verify attempt's passing settle remediates the PR6 unremediated evidence (`sha256:43c0266b…`).
- 4 pre-existing `no-img-element` lint warnings in untouched customer pages — out of scope (confirmed absent from the change diff).
- PR5b noted `Order.customer` is not in the Phase-4 `Order` type (dashboards use `shipping_name`) and `fetchAPI` collapses DRF field-error bodies; both were consciously deferred to follow-up — non-blocking.

### Verdict

**PASS** — 27/27 tasks complete; 22/22 requirements and 59/59 scenarios compliant; `manage.py test` 95/95 green, `makemigrations --check` clean, `manage.py check` clean, eslint 0 errors (only 4 pre-existing warnings in untouched files), `next build` 14/14 static pages. No blockers, no critical findings. Archive-ready.