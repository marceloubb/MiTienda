# Design: Admin Inventory Roles

## Approach

Backend-first, DRF-enforced: `UserProfile.role` (customer|admin|bodega|despacho) with `is_staff` sync at save; `Order.status` extended with `ready` and lateral-blocked `discrepancy`. New role permission classes, a role-scoped staff order viewset (atomic, `select_for_update()`; cancel restores stock), admin-only staff-user endpoint and role PATCH. Frontend: role types, `RequireRole`, `/admin /bodega /despacho`, role-conditioned Navbar. DRF is the enforcement boundary; client guards UX-only.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|---|---|---|---|
| Role storage | Django Groups; custom `AUTH_USER_MODEL`; per-role tables | `UserProfile.role`, default `customer` | Spec-mandated; OneToOne exists; Groups lack exclusivity; User swap invasive |
| Discrepancy | Boolean flag; FK model | Real `discrepancy` status + `pre_discrepancy_status` (nullable) + `discrepancy_reason` (missing\|damaged) | Gatekeeper: real status value, not a flag; helpers store return point + reason |
| `is_staff` sync | Signal-only; serializer-level | `UserProfile.save()` sets `user.is_staff = (role=='admin')` (`update_fields`) | Spec mandates save-time; single choke point |
| Drift guard | Manual only | `User` post_save syncs `is_staff ⇔ role=='admin'`, recursion-guarded | Closes Django-admin `is_staff` checkbox path |
| Product lockdown | Rewrite `IsStaffOrReadOnly` | Keep it + `StaffWriteDeniedViewMixin` unchanged | bodega/despacho are `is_staff=False` by sync; zero edits |
| Role PATCH | Django admin only | Admin-only `GET/PATCH /api/users/{id}/` | Spec scenarios need it; blocks self-promotion |
| Customer surface | Shared serializer | `StaffOrderSerializer(OrderSerializer)` | Customer serializer + 405 lockdown untouched |

### Archived-spec integrity

- `order-integrity`: cancel lives only in the new viewset; customer lockdown/checkout untouched (same atomic/`F()` idioms).
- `staff-or-read-only`: classes unmodified; bodega/despacho writes denied by construction; new tests assert it.

## Data Flow

```
advance: IsStaffRole → matrix guard → 403
  → atomic: select_for_update() order → status=next → 200

Admin cancel: atomic → order+items lock
  → Product.update(stock=F('stock')+qty) each → cancelled → commit|rollback
```

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/users/models.py` | Modify | `role` choices, `save()` sync |
| `backend/users/migrations/0002_role_backfill.py` | Create | AddField + backfill RunPython |
| `backend/users/permissions.py` | Create | `IsAdmin`/`IsBodega`/`IsDespacho`/`IsStaffRole` |
| `backend/users/signals.py`, `apps.py` | Create/Modify | post_save drift guard |
| `backend/users/serializers.py` | Modify | `role`/`is_staff` (read-only); role-update + staff-user serializers |
| `backend/users/views.py` | Modify | `UserDetailView`, `StaffUserCreateView` |
| `backend/users/staff_urls.py` | Create | `staff/users/` route |
| `backend/mitienda/urls.py` | Modify | include at `api/staff/` |
| `backend/orders/models.py` | Modify | `ready`+`discrepancy` choices; both helper fields |
| `backend/orders/migrations/0002_*.py` | Create | AlterField + AddFields |
| `backend/orders/{views,serializers,urls}.py` | Modify | `StaffOrderViewSet`, `StaffOrderSerializer`, staff router |
| `backend/{users,orders,products}/tests.py` | Modify | Regression suites |
| `frontend/lib/api.ts` | Modify | `UserRole`; `User.role/is_staff`; `discrepancy_reason?`; staff fns |
| `frontend/lib/order-status.ts` | Create | Shared styles + badge + new statuses |
| `frontend/lib/auth-context.tsx` | Modify | Type-level only |
| `frontend/components/RequireRole.tsx` | Create | Role guard |
| `frontend/components/Navbar.tsx` | Modify | Role-conditional links |
| `frontend/app/{admin,bodega,despacho}/page.tsx` | Create | Surfaces |
| `frontend/app/orders/page.tsx` | Modify | Import shared styles |

## Contracts

```python
role = CharField(choices=[customer,admin,bodega,despacho], default='customer')
# Order.status += ready ('Listo para despacho'), discrepancy ('Discrepancia') — blocked
pre_discrepancy_status = CharField(max_length=20, null=True, blank=True)
discrepancy_reason = CharField(max_length=20, blank=True,
    choices=[('missing', 'Falta'), ('damaged', 'Dañado')])
```

Transition matrix (all actions atomic + lock):

| Action | From | To | Roles |
|---|---|---|---|
| advance | pending→processing, processing→ready | | bodega, admin |
| advance | ready→shipped, shipped→delivered | | despacho, admin |
| cancel | any except cancelled, delivered | cancelled | admin |
| discrepancy | pending, processing, ready | discrepancy | bodega, admin |
| resolve-discrepancy | discrepancy | `pre_discrepancy_status` | admin |

Errors: 403 role/state denied (incl. advance/flag on `discrepancy`); 400 cancel on delivered/cancelled, resolve on non-discrepancy, bad `reason`/`role`; 404 missing.

`POST /api/staff/users/` [IsAdmin] `{username, email, password, role ∈ admin|bodega|despacho}` → 201 (`is_staff = role=='admin'`); dupes/short password → 400; non-admin → 403.

Frontend: `RequireRole {roles, redirectTo?}` — loading→null; `!user`→`/login`; mismatch→`redirectTo`. Navbar role map: admin→3, bodega/despacho→own, customer→none. `ready`=primary tint; `discrepancy`=destructive.

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Backend | Role guards | `force_authenticate` per role vs staff views |
| Backend | Transition matrix | Action × role × from-status → status or 403/400 |
| Backend | Cancel restores stock | Forced mid-failure → no partial restore |
| Backend | Discrepancy flow | flag → advance 403 → resolve → cancel |
| Backend | Staff-user + role PATCH | 201/403/400; sync both directions |
| Backend | Backfill migration | Fresh DB, `is_staff` users → admin |
| Backend | Archive regression | Existing suites pass; new denial tests |
| Frontend | Types/lint/build | `next build` + ESLint |

## Threat Matrix

N/A — no shell, subprocess, VCS/PR, exec-classification, or process-integration boundary. DRF gates are HTTP authorization, not command routing.

## Rollout

users/orders `0002` migrations (backfill + status/fields). Rollback: reverse migrations, revert frontend. No feature flag.

## Open Questions

- None blocking.