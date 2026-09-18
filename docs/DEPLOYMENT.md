# MiTienda Deployment Checklist

Production deployment reference for the MiTienda backend (Django / DRF, port 8000) and frontend (Next.js, port 3000). Every environment variable introduced by the security hardening change is listed below with its production value. Follow the enablement order to avoid lockout windows — every security switch is **off by default**, so a missing variable never takes the site down.

## Environment variables

| Variable | Default (dev) | Production value | Purpose |
|---|---|---|---|
| `DJANGO_DEBUG` | `False` (set `True` in the dev `.env`) | `False` | Debug mode. When `False`, `DJANGO_SECRET_KEY` must be a real secret or Django fails fast at startup. |
| `DJANGO_SECRET_KEY` | dev placeholder | random secret, 50+ chars | Signing key. The startup guard rejects the placeholder whenever `DJANGO_DEBUG=False`. |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | comma-separated public hosts | Django host-header validation. |
| `DJANGO_SECURE_MODE` | `False` | `True` (only after TLS termination is verified) | Enables `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_SSL_REDIRECT`, HSTS, and the `X-Forwarded-Proto` proxy header. |
| `DJANGO_HSTS_SECONDS` | `31536000` | `31536000` (ramp from `86400` on first rollout if cautious) | Strict-Transport-Security duration when `DJANGO_SECURE_MODE=True`. |
| `DJANGO_ADMIN_URL` | `admin/` | unguessable path ending in `/`, e.g. `backstage/` | Django admin mount point. Never advertise it. |
| `ADMIN_ALLOWED_IPS` | unset (unrestricted) | comma-separated IPs of operations staff | Admin IP allowlist; requests from other IPs receive 403. |
| `DJANGO_TOKEN_TTL_HOURS` | `24` | `24` (or lower) | DRF auth-token lifetime. The frontend auto-refreshes before expiry, so a tighter window is safe. |
| `DJANGO_2FA_ENFORCED` | `False` | `True` only after every admin has enrolled a device | Enforces TOTP via the `X-TOTP` header on token-authenticated requests from users with a confirmed device. |
| `DATABASE_URL` | unset (SQLite) | `postgres://user:pass@host:5432/mitienda` | PostgreSQL connection. Any value that does not start with `postgres://` falls back to SQLite (dev default). |
| `DJANGO_EMAIL_BACKEND` | `console` | SMTP backend | Outbound email (password resets, notifications). |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | `https://api.example.com/api` (or same-origin `/api`) | Frontend API base URL. Must match the browser-visible API origin: the frontend CSP allows this origin in `connect-src`. |

Runtime prerequisites for production:

- TLS termination at the load balancer / reverse proxy with `X-Forwarded-Proto: https` (required by `DJANGO_SECURE_MODE`).
- NTP-synchronized clocks on app servers: TOTP verification tolerates one time-window of drift, and the token TTL is computed from the server clock.
- PostgreSQL 14+ (any version supported by `psycopg[binary]`).

## Enablement order

Follow this sequence. Each step is self-contained and verifiable before the next one starts.

1. **PostgreSQL** — set `DATABASE_URL`, run `migrate`, then migrate existing data (procedure below).
2. **Basics** — set `DJANGO_SECRET_KEY` and `DJANGO_ALLOWED_HOSTS`; keep `DJANGO_DEBUG=False`. Verify startup with `manage.py check` and a full login flow.
3. **Admin URL + IP allowlist** — set `DJANGO_ADMIN_URL` and `ADMIN_ALLOWED_IPS`. Verify the admin loads only from allowlisted IPs and returns 403 elsewhere.
4. **Token TTL** — set `DJANGO_TOKEN_TTL_HOURS` (default 24 is dev-safe). Verify the frontend refresh flow: an expired token rotates on the next 401 without a user-visible logout.
5. **2FA** — with the gate still off, every admin calls `POST /api/users/2fa/enroll/`, stores the returned `secret`/`provisioning_uri` in their authenticator app, then confirms with `POST /api/users/2fa/confirm/` (`device_id` + `code`). Only when every admin has a confirmed device, set `DJANGO_2FA_ENFORCED=True`.
6. **Secure mode** — after confirming TLS at the edge, set `DJANGO_SECURE_MODE=True`. Verify the site over HTTPS with no mixed-content warnings and no redirect loops.

### 2FA gate consequence (read before step 5)

With `DJANGO_2FA_ENFORCED=True`, every token-authenticated request from a user with a confirmed device must carry a fresh TOTP code in the `X-TOTP` header; otherwise the API returns 401 with `totp_required`. Consequences:

- Scripted and API-tool clients send `X-TOTP` with each request (the 30-second window is re-verified per request).
- The SPA frontend has **no 2FA UI yet** (documented limitation). A gated admin using the SPA will receive 401s because the browser client cannot supply fresh codes. Keep the gate off while SPA sessions rely on the browser, or gate only after a frontend TOTP prompt exists.

Reversing the gate (`DJANGO_2FA_ENFORCED=False`) restores prior behavior immediately — devices stay enrolled and can be re-enabled later.

## PostgreSQL data migration (SQLite → PostgreSQL)

Backup first — the email-uniqueness migration (`users` 0003) normalizes `NULL` emails to `''` and is safest to reverse from a snapshot.

Windows (this repo): use `backend\.venv\Scripts\python.exe`. On Unix: `backend/.venv/bin/python`.

```powershell
# 1. Snapshot: stop writes, back up backend/db.sqlite3.
# 2. Dump with natural keys, excluding auto-generated content types/permissions.
cd backend
.venv\Scripts\python.exe manage.py dumpdata --natural-foreign --natural-primary `
  -e contenttypes -e auth.Permission -o mitienda_data.json

# 3. Create the PostgreSQL database, point DATABASE_URL at it, migrate.
#    DATABASE_URL=postgres://user:pass@host:5432/mitienda
.venv\Scripts\python.exe manage.py migrate

# 4. Load the data.
.venv\Scripts\python.exe manage.py loaddata mitienda_data.json

# 5. Verify row counts (users, products, orders) and run the test suite.
.venv\Scripts\python.exe manage.py test
```

Rollback: point `DATABASE_URL` back to unset (SQLite) or to the previous value; no code change required. The `loaddata` step is additive and can be re-run safely with `--ignorenonexistent` if migrations changed.

## Frontend deployment

- Build and start: `npm run build` then `npm run start` inside `frontend/`.
- The nonce CSP, `frame-ancestors 'none'`, and the per-request nonce come from `frontend/proxy.ts`; nosniff, Referrer-Policy, Permissions-Policy, `X-Frame-Options: DENY`, and `poweredByHeader: false` come from `frontend/next.config.ts`.
- Nonce-based CSP requires dynamic rendering (`export const dynamic = 'force-dynamic'` in `frontend/app/layout.tsx`): every page renders per request, so static/edge caching does not apply. CDN caching of HTML is not possible; cache `/_next/static/*` normally since it is excluded from the CSP proxy matcher.
- Verify after deploy: responses carry a `Content-Security-Policy` with a nonce and no `'unsafe-inline'` in `script-src`, `frame-ancestors 'none'`, and **no** `X-Powered-By` header.
