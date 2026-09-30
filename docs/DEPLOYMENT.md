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
| `DJANGO_2FA_ENFORCED` | `False` | `True` only after every admin has enrolled a device | Enforces TOTP via the `X-TOTP` header on token-authenticated requests from users with a confirmed device. The SPA handles the gate with a global prompt that replays the rejected request and restores the session (see "SPA TOTP resume"). The only exempt path is `POST /api/users/logout/`. |
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
5. **2FA** — with the gate still off, every admin calls `POST /api/users/2fa/enroll/`, stores the returned `secret`/`provisioning_uri` in their authenticator app, then confirms with `POST /api/users/2fa/confirm/` (`device_id` + `code`). Only when every admin has a confirmed device, set `DJANGO_2FA_ENFORCED=True` — after reading "SPA TOTP resume" below for what an operator will see in the browser once the gate is on.
6. **Secure mode** — after confirming TLS at the edge, set `DJANGO_SECURE_MODE=True`. Verify the site over HTTPS with no mixed-content warnings and no redirect loops.

### 2FA gate consequence (read before step 5)

With `DJANGO_2FA_ENFORCED=True`, every token-authenticated request from a user with a confirmed device must carry a fresh TOTP code in the `X-TOTP` header; otherwise the API returns 401 with `totp_required`. Consequences:

- Scripted and API-tool clients send `X-TOTP` with each request (the 30-second window is re-verified per request).
- The SPA frontend **does** have a 2FA prompt. Any gated request — profile, cart, checkout — opens one global challenge dialog on the current screen, with no redirect to the login route. A wrong code shows an error and keeps the dialog open; a correct code replays the failed request, resumes the caller it interrupted, and stores the code for the rest of the session.
- **`POST /api/users/logout/` is exempt from the gate.** Without the exemption a gated user could never sign out, because the browser has no fresh code at that moment. The exempt set is one constant, `TOTP_EXEMPT_PATHS = frozenset({'/api/users/logout/'})`, in `backend/users/authentication.py`; add paths there rather than special-casing clients.

### SPA TOTP resume (read before enabling the gate)

What an operator will see in the browser, with the gate on:

1. Any gated request — profile, cart, checkout — opens one challenge dialog on the current screen. No redirect to the login route.
2. A wrong code drops it from memory, shows an error, and keeps the prompt open. The interrupted request stays parked and the session is not established, so a failed attempt changes nothing.
3. A correct code replays the failed request, resolves the caller that was parked when the gate rejected it, and stores the code for the rest of the session. The page that triggered the challenge finishes loading and the dialog closes.

The API client parks the rejected caller behind a promise that only a successful replay can resolve — never by rejecting, which is what keeps step 2 from failing the request instead of re-prompting. `clearTOTPCode()` deliberately does not run on success: from that point the code belongs to the live session and every later request needs it.

The dialog carries no cancel. A user who cannot produce a code still has `logout()`, which the exempt path above keeps reachable — that is the way out of a gated session, not dismissal.

All of it is pinned by `frontend/tests/totp-challenge.test.tsx`, which drives the four scenarios through the real `fetch` boundary. The load-bearing one asserts that the original caller resumes **with the data it asked for**, not merely that a second request went out. It was previously carried as `it.fails` because a gated caller could not be resumed at all; that is fixed, and the assertion is live.

Scripted and API-tool clients never touch this code path and can be gated today.

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

## Docker deployment (local)

Run the full stack (PostgreSQL, Django/DRF backend, Next.js frontend) locally with Docker Compose:

1. Create a root `.env` file from `.env.example` and fill in real values: `DJANGO_SECRET_KEY` (long random string) and `POSTGRES_PASSWORD`. The `.env` file is gitignored.
2. Build and start:

   ```powershell
   docker compose up --build
   ```

3. Services after startup:

   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api (`/api/products/` is public read-only)
   - Django admin: http://localhost:8000/admin/
   - PostgreSQL: internal to the Compose network (no host port published); data lives in the `pgdata` named volume

Notes:

- The backend container runs `manage.py migrate` and `manage.py collectstatic` on start, so migrations apply automatically and the Django admin static assets are served (WhiteNoise).
- `DJANGO_SECURE_MODE` stays `False` in this local Docker stack: everything runs over plain HTTP. TLS termination is still a separate production concern — enable `DJANGO_SECURE_MODE` only after HTTPS is verified, per the enablement order above.
- The frontend image builds with `NEXT_PUBLIC_API_URL=http://localhost:8000/api` (a build-time variable inlined by Next.js). The browser calls the backend API directly, which matches the CORS allowlist and the CSP `connect-src` from `frontend/proxy.ts`.
- Stop with `docker compose down`; add `-v` to also delete the PostgreSQL named volume (destroys all data).

### Session cookie (security hardening)

The DRF token now travels in an httpOnly SameSite=Lax cookie (`auth_token` by default) set by the backend on login/register/refresh responses and cleared on logout. The SPA JavaScript never persists the token string client-side, so an XSS cannot steal it at rest. Tune with:

| Variable | Default (dev) | Production value | Purpose |
|---|---|---|---|
| `DJANGO_CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | comma-separated browser-visible origins | CORS allowlist for the SPA origin. `CORS_ALLOW_CREDENTIALS` is always on, so every allowlisted origin must be intentional. Adding an origin here increases the cookie's exposure surface. |
| `DJANGO_TOKEN_COOKIE_NAME` | `auth_token` | `auth_token` | Token cookie name; change only if it collides with another cookie on the API host. |
| `DJANGO_TOKEN_COOKIE_AGE` | `86400` | `86400` (or lower) | Token cookie lifetime in seconds. Keep it aligned with `DJANGO_TOKEN_TTL_HOURS`. |
| `DJANGO_TOKEN_COOKIE_SAMESITE` | `Lax` | `Lax` | SameSite policy. `Lax` blocks cross-site POSTs while still sending the cookie on same-site fetches — the dev stack runs the SPA and API on different ports but the same site, so it works over plain HTTP. |
| `DJANGO_SECURE_MODE` | `False` | `True` (after TLS) | Also flags the token cookie `Secure`; without HTTPS, browsers reject `Secure` cookies. |

Notes:

- **Do not lower SameSite below `Lax`** (e.g. to `None`) unless the SPA and API are genuinely cross-site — that would require the cookie `Secure` flag and TLS everywhere.
- **Browse via `localhost`, not `127.0.0.1`**: the cookie is same-site only when the SPA page and the API share a host. The SPA defaults to `http://localhost:3000` + `http://localhost:8000/api` (same host `localhost`, different ports — same site). A page served at `http://127.0.0.1:3000` calling `http://localhost:8000` is **cross-site** (different hosts), so the Lax cookie is never attached and authenticated calls will 401. To use `127.0.0.1`, point `NEXT_PUBLIC_API_URL` at `http://127.0.0.1:8000/api` as well.
- The `Authorization: Token` header remains supported as a fallback for non-browser clients (scripts, API tools); browser sessions use the cookie.
- Verify after deploy: login/register responses carry `Set-Cookie: auth_token=...; HttpOnly; SameSite=Lax` (plus `Secure` in production) and logout clears it (`Max-Age=0`).
- **Rate limits are best-effort under multi-worker Gunicorn**: DRF throttling counts in `CACHES['default']`, which is `LocMemCache` (in-process). The container runs Gunicorn with `--workers 2`, so each worker keeps its own counter and a client spread across workers can exceed the per-scope rate (e.g. `register: 5/hour`) without tripping the 429. The unit tests exercise a single process and cover the throttles correctly; the limit is enforced strictly only with one worker or a shared cache (DatabaseCache/Redis). Deployments that need hard rate limits should switch to a shared cache backend.
