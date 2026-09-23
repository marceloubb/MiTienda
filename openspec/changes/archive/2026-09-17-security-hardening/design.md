# Design: Security Hardening (H1–H12 + F1–F3)

## Technical Approach

DRF-idiomatic hardening in proposal order: settings/admin/Postgres config → auth (validators, throttles, token lifecycle, 2FA) → orders/products → frontend → data migration + tests. One `ExpiringTokenAuthentication` subclass enforces TTL and the env-gated TOTP check; scoped DRF throttles neutralize the enumeration oracle; `DATABASE_URL` drives psycopg with SQLite fallback. New deps only `django-otp==1.7.2` + `psycopg[binary]`; every switch is env-gated default-off, so prod lockout is impossible by default. Answers all 11 specs; `specs/` stays the source of truth.

## Open Decisions Resolved

| # | Decision | Resolution |
|---|---|---|
| 1 | Env vars + dev-safe defaults | Table below — all defaults dev-safe (off / 24h / `admin/`) |
| 2 | TOTP verification with TokenAuthentication | Per-request `X-TOTP` header in the auth class; 401 preserved |
| 3 | 2FA enrollment + verification flow | django-otp `TOTPDevice` + `enroll`/`confirm` endpoints; no frontend UI (documented limitation) |
| 4 | Postgres migration + `select_for_update` | env-driven `DATABASES`; `dumpdata`/`loaddata` path; locks already in `transaction.atomic`; PG-gated concurrency test |

## Architecture Decisions

### Env vars and defaults

| var | default | consumed by |
|---|---|---|
| `DJANGO_DEBUG` | `False` | DEBUG flip + guard (H1) |
| `DJANGO_SECRET_KEY` | placeholder | guard fires when DEBUG=False |
| `DJANGO_SECURE_MODE` | `False` | secure block (H9): secure cookies, SSL redirect, HSTS, proxy header |
| `DJANGO_HSTS_SECONDS` | `31536000` | secure block |
| `DJANGO_ADMIN_URL` | `admin/` | admin path (H5) |
| `ADMIN_ALLOWED_IPS` | unset → None | `AdminIPAllowlistMiddleware` (H11) |
| `DJANGO_TOKEN_TTL_HOURS` | `24` | TTL check (H3) |
| `DJANGO_2FA_ENFORCED` | `False` | TOTP gate (H10) |
| `DATABASE_URL` | unset → SQLite | `DATABASES` (H12) |

**Choice**: env-gated block with loud `ImproperlyConfigured` failure, never silent debug mode. **Rejected**: always-on secure block (breaks dev), DEBUG default True (the finding). Config intake via `os.environ.get` + shared truthy/int helpers.

### TOTP verification mechanism

| option | tradeoff | decision |
|---|---|---|
| `X-TOTP` header in auth class | 401 natural; no exempt lists; every token request re-verified (30s window) | **Chosen** |
| Middleware | re-orders DRF auth, hand-built exempt list, non-DRF idiom | Rejected |
| Challenge/response marker | needs new state table; spec requires per-request code | Rejected |

Consequence (in `docs/DEPLOYMENT.md`): gate ON ⇒ SPA admin requests 401 without a fresh code — API-tool clients send `X-TOTP`; SPA works with gate OFF (default).

### 2FA enrollment flow

`POST /api/users/2fa/enroll/` (admin-only): rejects if a confirmed device exists; deletes stale unconfirmed; returns `{device_id, secret, provisioning_uri}` (`TOTPDevice` key + `config_url`). `POST /api/users/2fa/confirm/` `{device_id, code}`: `verify_token(code)` → `confirmed=True` or 400. No `OTPMiddleware` — Django-admin sessions untouched (admin URL + IP allowlist cover them); admin-site 2FA = future work. No frontend 2FA UI (out of F-scope); `totp_required` error code lets a future client react.

### Token rotation semantics

Login/register delete all user tokens, create one (single-session, preserves current behavior; rotation kills replayed tokens). Logout deletes only `request.auth`; refresh (`POST /api/users/token/refresh/`, scope `token_refresh` 10/min) rotates the presented token. Multi-device login coexistence isn't guaranteed — spec's logout scenario builds two tokens directly, so scoped deletion is still proven by test.

### Postgres store and locks

`DATABASES['default']` parsed from `DATABASE_URL` via `urllib.parse` (stdlib, no `dj-database-url`) when it starts with `postgres://`; else current SQLite. `select_for_update` verified at all lock sites (`create_from_cart`, `advance`, `cancel`, `_restore_order_stock`) — every use inside `transaction.atomic()`: Postgres semantics preserved as-is. SQLite ignores row locks → oversell regression test gated `@skipUnless(DATABASE_URL postgres://)`. Data migration: `dumpdata --natural-foreign --natural-primary -e contenttypes -e auth.Permission` → `loaddata` procedure in `docs/DEPLOYMENT.md`.

### Email uniqueness

Serializer now: profile email exclude-self via `request` context; `''` unconstrained. DB constraint after cleanup — hand-written `users/0003`: `RunSQL UPDATE auth_user SET email='' WHERE email IS NULL` + `AddConstraint(model_name='user', UniqueConstraint(fields=['email'], condition=~Q(email='')))` → partial unique index (Postgres + SQLite ≥3.8). Register already 400s taken emails — unchanged.

## Data Flow

    Token request ──► ExpiringTokenAuthentication
         │  TTL expired ──► 401
         │  gate ON + no/bad X-TOTP ──► 401 (totp_required)
         └─► view ──► throttle (register 5/h, login 10/min, refresh 10/min)
                    └─► serializer validation (validators, stock, email)

    Frontend: 401 ──► refresh once ──► retry original ──► success
                          │ fail └──► loadProfile clears only on 401/403

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/mitienda/settings.py` | Modify | DEBUG default False; secure block; DATABASES; throttle rates; auth class swap; `django_otp` apps; admin/TTL/2FA/allowlist vars; CORS credentials False |
| `backend/mitienda/urls.py` | Modify | admin path from `DJANGO_ADMIN_URL` |
| `backend/mitienda/middleware.py` | Create | `AdminIPAllowlistMiddleware` (403 for unlisted IP on admin path) |
| `backend/users/authentication.py` | Create | `ExpiringTokenAuthentication` (TTL + gate) |
| `backend/users/views.py` | Modify | rotation on login/register; scoped logout; refresh view; 2FA views; `throttle_scope` on register/login/refresh |
| `backend/users/urls.py` | Modify | `token/refresh/`, `2fa/enroll/`, `2fa/confirm/` |
| `backend/users/serializers.py` | Modify | `validate_password` (register + staff create, cross-field via `validate()`); profile email exclude-self |
| `backend/users/migrations/0003_email_unique_nonempty.py` | Create | NULL→`''` normalization + conditional unique |
| `backend/products/views.py` | Modify | `IsStaffOrReadOnly` → `IsAdminOrReadOnly` (`role == ROLE_ADMIN`) |
| `backend/orders/serializers.py` | Modify | `validate()` always `_check_stock` (drop isinstance bypass) |
| `backend/orders/views.py` | Modify | `add_item` cumulative qty check |
| `backend/requirements.txt` | Modify | `django-otp==1.7.2`, `psycopg[binary]` |
| `docs/DEPLOYMENT.md` | Create | env checklist + Postgres procedure + 2FA/allowlist enablement order |
| `backend/{users,orders,products,mitienda}/tests.py` | Modify | per-finding regressions (~200 lines) |
| `frontend/lib/api.ts` | Modify | single 401→refresh→retry; token-change hook |
| `frontend/lib/auth-context.tsx` | Modify | `loadProfile` clears only on 401/403 / refresh failure |
| `frontend/proxy.ts` | Create | Next 16 Proxy: per-request nonce CSP incl. `frame-ancestors 'none'`; matcher excludes api/assets/prefetch |
| `frontend/next.config.ts` | Modify | `poweredByHeader: false`; nosniff, Referrer/Permissions-Policy, X-Frame-Options |
| `frontend/app/layout.tsx` | Modify | `export const dynamic = 'force-dynamic'` (nonce requires dynamic rendering) |

## Interfaces / Contracts

```python
class ExpiringTokenAuthentication(TokenAuthentication):
    def authenticate(self, request):
        user, token = super().authenticate(request)
        if timezone.now() - token.created > timedelta(hours=settings.DJANGO_TOKEN_TTL_HOURS):
            raise AuthenticationFailed('Token expirado')                     # 401
        if getattr(settings, 'DJANGO_2FA_ENFORCED', False) and TOTPDevice.objects.filter(user=user, confirmed=True).exists():
            code = request.headers.get('X-TOTP')
            device = TOTPDevice.objects.filter(user=user, confirmed=True).first()
            if not code or not device.verify_token(code):
                raise AuthenticationFailed({'detail': 'Código TOTP requerido', 'code': 'totp_required'})
        return user, token
```

`verify_token()` uses stored drift (NTP keeps devices within one window — checklist note). Next 16: Proxy at project root, `proxy` + `config.matcher` (verified in `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`; nonce auto-applied to Next inline scripts).

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | TTL edge; 2FA gate (missing/bad/valid, gate off); validators (register/staff 400/201); email exclude-self/taken/empty; cart serializer (cumulative, qty 0/`"abc"`/>stock, string `product_id`); permissions (admin ok; bodega/despacho/anon 403) | `TestCase` + DRF `APIClient`; `freeze_time` |
| Integration | rotation (old token 401); refresh success/expired; scoped logout (second token survives); throttles 429 at 6th register/11th login; invalid payloads count; 2FA enroll→confirm→request; allowlist 403/200; DEBUG/guard startup | `TestCase` + `override_settings` |
| Postgres-gated | concurrent checkout oversell (stock=1, two races → one succeeds) | `@skipUnless(DATABASE_URL postgres://)` |
| Frontend | none automated (no runner; strict_tdd false) | `next build` + ESLint; manual curl: nonce CSP, no `X-Powered-By`, no CSP console errors |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary added; only request-path middleware, DRF authentication, serializers, env-driven settings.

## Migration / Rollout

Sequence per proposal; frontend refresh MUST land before F1 retry (prevents staff logout at the 24h boundary). Env gates are the switches (all off). `users` 0003 normalization is idempotent; reverse via `migrate users 0002`; snapshot SQLite first per proposal rollback. Postgres switch is env-only with documented data path.

## Open Questions

None blocking — all four open decisions pinned. Apply note: verify `django-otp==1.7.2` against Django 6.1.1 (`manage.py check` + full suite) as the first install task; adjust the pin only if incompatible.