# Proposal: Security Hardening

## Intent

Fix all findings of the 2026-09-17 security audit (Engram obs #64), amplified per user decisions: H1–H12 (backend) + F1–F3 (frontend). Baseline verified in exploration (Engram obs #65 / `exploration.md`). `research.md` is a blocked outcome (zero evidence admitted) — **not cited**.

## Scope

### In Scope

- **H1** DEBUG default `False` + fail-fast guard; **H9** env-gated SECURE block (`SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `SECURE_PROXY_SSL_HEADER`) + `CORS_ALLOW_CREDENTIALS=False`
- **H2** enforce `AUTH_PASSWORD_VALIDATORS` in `RegisterSerializer` + `StaffUserSerializer` create paths
- **H3/F1** token TTL 24h (subclass vs `Token.created`), rotation on login/register, scoped logout, refresh endpoint; frontend 401-retry-once; **F3** clear token only on 401/403 (+refresh failure)
- **H4** scoped DRF throttles (register 5/h, login 10/min), no new deps
- **H5** env-driven admin URL; **H11** env-driven admin IP allowlist; **H10** django-otp TOTP 2FA with TokenAuthentication (enrollment + verification)
- **H6** email uniqueness: serializer exclude-self now + conditional `UniqueConstraint(~Q(email=''))` after data-cleanup migration
- **H7** cumulative cart stock check in `add_item`; remove `isinstance` bypass; **H8** `IsStaffOrReadOnly` → `role == ROLE_ADMIN` (behavior-preserving, no bodega/despacho writes)
- **H12** SQLite → PostgreSQL (settings, psycopg, data migration, `select_for_update` semantics)
- **F2** CSP (nonce) + `frame-ancestors 'none'`, nosniff, Referrer/Permissions-Policy, `poweredByHeader` off; deployment checklist (env vars) doc

### Out of Scope

- Account lockout (attacker-controlled DoS — user decision); cn removal (INFO, official shadcn pkg)
- httpOnly cookie tokens (needs BFF/proxy — documented future work)

## Capabilities

### New Capabilities

- `token-lifecycle`: TTL expiry, rotation, refresh endpoint, scoped logout, 401-retry-once, clear-token-only-on-auth-failure (H3, F1, F3)
- `password-policy`: validators enforced in register + staff-create (H2)
- `api-throttling`: scoped rates on register/login (H4)
- `two-factor-auth`: TOTP enrollment + verification with TokenAuthentication (H10)
- `admin-access-control`: env-driven admin URL + IP allowlist (H5, H11)
- `security-headers`: nonce CSP + security headers + poweredByHeader off (F2)
- `email-uniqueness`: serializer exclude-self + conditional constraint + cleanup migration (H6)
- `postgres-data-store`: Postgres settings, dependency, data migration, lock semantics (H12)

### Modified Capabilities

- `env-settings`: DEBUG default False; env-gated secure block; CORS credentials False (H1, H9)
- `staff-or-read-only`: permission checks `role==ROLE_ADMIN`, not `is_staff` (H8)
- `order-integrity`: cumulative stock on `add_item`; string `product_id` no longer bypasses stock (H7)

## Approach

Sequence: settings/admin/postgres config → auth (validators, throttles, token lifecycle, 2FA) → orders/products → frontend (401-retry, loadProfile, CSP/headers) → data migration + tests. Backend refresh/rotation lands BEFORE frontend 401-retry (prevents staff logout at the 24h boundary). New deps only: `django-otp`, `psycopg[binary]`. Per-finding regression tests (~200 backend lines). Delivery: stacked auto-chain — backend slices before frontend slice.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/mitienda/settings.py` | Modified | DEBUG, secure block, throttles, CORS, DATABASES |
| `backend/users/*` | Modified | validators, token auth, refresh, logout, 2FA, admin URL |
| `backend/orders/*`, `backend/products/*` | Modified | stock checks, role-admin permission |
| backend migrations, requirements | Modified | Postgres, email constraint, data cleanup |
| `frontend/lib/api.ts`, `auth-context.tsx` | Modified | 401-retry, clear-on-auth-failure |
| `frontend/next.config.ts` (+ middleware) | Modified | CSP, headers, poweredByHeader |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| DEBUG flip breaks local dev | Low | `.env` already sets `DJANGO_DEBUG=True` — verify pre-apply |
| Staff logout before retry lands | Med | backend-first sequencing; 24h TTL headroom |
| CSP nonce × App Router streaming | Med | `frame-ancestors 'none'` lands independently |
| Postgres switch churns dev/CI | Med | env-driven DATABASES; verify local Postgres pre-merge |
| Prod lockout from 2FA/allowlist | Med | default-off env gates + documented checklist |

## Rollback Plan

Env-driven: revert env vars. Token lifecycle: drop auth subclass + refresh endpoint, restore `get_or_create`. Migrations: reverse via `migrate <app> <prev>` (email cleanup is destructive — snapshot first). Postgres: point `DATABASE_URL` back to SQLite. 2FA: remove hook + dependency. Frontend: revert `next.config.ts`, `api.ts`, `auth-context.tsx`.

## Dependencies

- `django-otp` (TOTP 2FA); `psycopg[binary]` (Postgres). No other new dependencies.

## Success Criteria

- [ ] H1–H12, F1–F3 fixed in scope; deferred items documented as future work
- [ ] Backend tests green (existing + per-finding regressions)
- [ ] `next build` + ESLint green
- [ ] Bodega/despacho still denied product writes (no privilege expansion)
- [ ] Deployment checklist covers all new env vars