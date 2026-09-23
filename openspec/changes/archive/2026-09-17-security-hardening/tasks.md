# Tasks: Security Hardening (H1–H12 + F1–F3)

## Review Workload Forecast

Estimated changed lines: ~780 (720–840)
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High
Delivery strategy: auto-chain
Suggested split: PR 1 Foundation → PR 2 Auth (maintainer-split into PR 2a password+throttle, PR 2b token lifecycle, PR 2c 2FA, PR 2d email) → PR 3 Orders → PR 4 Frontend

### Work Units

- PR 1 (base `main`): settings/admin/Postgres foundation — test `manage.py test mitienda`; harness unset `DJANGO_DEBUG` → error; rollback `settings.py`/`urls.py`/`middleware.py`/`requirements.txt`
- PR 2 (base PR 1): auth — test `manage.py test users`; harness curl login→refresh→logout; rollback users app
- PR 3 (base PR 2): orders/products — test `manage.py test orders products`; harness bodega POST → 403, oversell → 400; rollback `products/views.py`, `orders/*`
- PR 4 (base PR 3): frontend — test ESLint; harness `next build` + curl headers; rollback `lib/*`, `proxy.ts`, `next.config.ts`, `layout.tsx`

## Phase 1: Foundation (PR 1)

- [x] 1.1 [deps] `backend/requirements.txt`: `django-otp==1.7.2` + `psycopg[binary]`; verify vs Django 6.1.1. **First task.**
- [x] 1.2 [env-settings] `backend/mitienda/settings.py`: `DEBUG` default `False`; key guard; secure block env-gated off; `CORS_ALLOW_CREDENTIALS=False`. Tests: guard fires/skips, secure on/off, CORS.
- [x] 1.3 [admin-access-control] `backend/mitienda/urls.py` + new `middleware.py`: admin path via `DJANGO_ADMIN_URL`; `AdminIPAllowlistMiddleware` (403). Tests: URL default/custom, allowlist 403/200/unset.
- [x] 1.4 [postgres-data-store] `DATABASES` via `DATABASE_URL`; else SQLite.

## Phase 2: Auth (PR 2; backend refresh BEFORE frontend retry)

- [x] 2.1 [password-policy] `backend/users/serializers.py`: `validate_password` register + staff-create. Tests: weak 400, strong 201.
- [x] 2.2 [api-throttling] Scopes 5/h register, 10/min login+refresh; pre-validation. Tests: 429 thresholds, invalid counts.
- [x] 2.3 [token-lifecycle] Create `backend/users/authentication.py`: TTL subclass (401); swap class.
- [x] 2.4 [token-lifecycle] `backend/users/views.py`: login replaces, register fresh, logout scoped, refresh rotates; `backend/users/urls.py`: `token/refresh/`. Tests: `freeze_time` expired/valid, rotation, refresh, scoped logout.
- [x] 2.5 [two-factor-auth] `django_otp` apps; `DJANGO_2FA_ENFORCED` + `X-TOTP` (`totp_required`).
- [x] 2.6 [two-factor-auth] `backend/users/views.py`/`urls.py`: `2fa/enroll/` + `2fa/confirm/`. Tests: enroll→confirm→request, gate off.
- [x] 2.7 [email-uniqueness] Serializer exclude-self; `backend/users/migrations/0003_email_unique_nonempty.py`: NULL→`''` + conditional unique. Tests: taken/own/duplicate/`''`.

## Phase 3: Orders/Products (PR 3)

- [x] 3.1 [staff-or-read-only] `backend/products/views.py`: `IsAdminOrReadOnly` on `role == ROLE_ADMIN`. Tests: admin 201, bodega/despacho/anon 403, role beats `is_staff`.
- [x] 3.2 [order-integrity] `backend/orders/serializers.py`: always `_check_stock` (drop bypass), qty ≥1; `backend/orders/views.py`: `add_item` cumulative. Tests: cumulative, qty 0/`"abc"`/>stock, string `product_id`.
- [x] 3.3 [postgres-data-store] PG-gated concurrency test (stock=1); `select_for_update` in `atomic()`.

## Phase 4: Frontend + Deployment (PR 4)

- [x] 4.1 [token-lifecycle] `frontend/lib/api.ts`: 401→refresh→retry once; clear on failure; `frontend/lib/auth-context.tsx`: clear only 401/403/refresh failure.
- [x] 4.2 [security-headers] Create `frontend/proxy.ts`: nonce CSP + `frame-ancestors 'none'`; `frontend/next.config.ts`: no poweredByHeader, nosniff/Referrer/Permissions/X-Frame; `frontend/app/layout.tsx` `force-dynamic`.
- [x] 4.3 [security-headers, postgres-data-store] Create `docs/DEPLOYMENT.md`: env vars, dump/load procedure, enablement order.
- [x] 4.4 [verify] `next build` + ESLint; curl headers; backend suite green.

Threat matrix: N/A (design — no routing/shell/VCS/process boundary).