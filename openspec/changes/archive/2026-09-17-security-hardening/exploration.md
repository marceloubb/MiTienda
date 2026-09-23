# Exploration: security-hardening

Change: security-hardening — validates the 2026-09-17 security audit (Engram obs #64) against the current code and defines the hardening plan.

Date: 2026-09-17
Store: hybrid (this file + Engram `sdd/security-hardening/explore`)

## Current State

Two-project repo: `backend/` (Django 6.1.1 + DRF 3.18.1, TokenAuthentication + SessionAuthentication, SQLite) and `frontend/` (Next.js 16.3.5 + React 19.2.8, App Router, token in `localStorage`, no test runner — ESLint + `next build` are the quality gates). A prior `backend-hardening` change (archived 2026-09-16) already delivered env-driven settings, the ImproperlyConfigured guard, serializer-based profile update, idempotent logout, staff-or-read-only, read-only order/cart surfaces, and atomic checkout. This exploration covers the follow-up backlog from the security audit.

## Finding-by-finding Verification (against current code)

### Confirmed — HIGH

**H1. `settings.py` DEBUG default True + committed SECRET_KEY fallback** (`backend/mitienda/settings.py:30-36,172-176`)
Exact match: `SECRET_KEY` falls back to `django-insecure-...`; `DEBUG` defaults to `True` when `DJANGO_DEBUG` unset; the `ImproperlyConfigured` guard only fires when `not DEBUG AND SECRET_KEY == placeholder`. A prod boot without `DJANGO_DEBUG` runs in debug mode with a known key. Fix: flip DEBUG default to `False` (dev `.env` already sets `DJANGO_DEBUG=True`; file exists), keep the guard.

**F1. Auth token in `localStorage`** (`frontend/lib/auth-context.tsx:20-23,56-58,70-75`)
Exact match: key `"token"`, permanent, no expiry/rotation. XSS reads it → full session incl. staff surfaces. XSS vectors verified clean (no `dangerouslySetInnerHTML` in codebase), so this is exposure-cap risk, not an active exploit.

### Confirmed — MEDIUM

**H2. Password validators configured but never run** (`backend/users/serializers.py:39,67`)
Exact match: `RegisterSerializer`/`StaffUserSerializer` enforce only `min_length=8`; both `create()` paths call `User.objects.create_user()` which never invokes `AUTH_PASSWORD_VALIDATORS`. Fix: call `django.contrib.auth.password_validation.validate_password(password, user=...)` in both `create()` methods → 400 on common/numeric/similar-to-user passwords.

**H3. Token lifecycle** (`backend/users/views.py:28,45,73-75`)
Exact match: register/login use `Token.objects.get_or_create` (never rotate); logout deletes ALL tokens for the user; DRF `Token` (verified in `rest_framework/authtoken/models.py`) has `key`/`user`/`created` — no expiry. One token per user = single-session semantics today.

**H4. No throttling + enumeration oracle** (`backend/users/views.py:21-53`, `backend/users/serializers.py:71-79`)
Exact match: no `throttle_classes`, no `DEFAULT_THROTTLE_RATES`. `validate_username`/`validate_email` return distinctive "ya existe" errors → oracle distinguishes registered accounts from other 400s. Login returns a single generic 401 (not an oracle). Fix: scoped DRF throttles on register/login (zero new deps); keep messages for usability — throttling neutralizes the oracle.

**F2. No CSP / security headers** (`frontend/next.config.ts` — empty)
Exact match: no `headers()`, no CSP, no `frame-ancestors` → staff consoles frameable (clickjacking). Also leaks `X-Powered-By` (`poweredByHeader` not disabled). Fix: `headers()` with nonce-based CSP (Next injects inline scripts → per-request nonce via middleware) + `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.

**F3. `loadProfile` clears token on ANY error** (`frontend/lib/auth-context.tsx:31-48`)
Exact match: `catch {}` unconditionally removes the token — a transient network/5xx logs the user out and destroys the session. Fix: only clear on 401/403 (and refresh failure); `APIError.status` is already surfaced by `lib/api.ts:26-68`.

### Confirmed — LOW

**H5. Admin at default URL** (`backend/mitienda/urls.py:30`) — `admin/` guessable; no 2FA/IP allowlist. Fix now: trivial (env-driven `ADMIN_URL`). Defer: 2FA (needs `django-otp`) and IP allowlist (infra concern) — out of scope.

**H6. Email uniqueness** (`backend/users/serializers.py:96`, `User.email` unconstrained)
Exact match: `UpdateProfileSerializer.email` has no uniqueness check; Django's `User.email` has no DB constraint. **Blocker the audit missed**: `User.email` defaults to `''` and seed data likely has multiple empty emails — a naive `unique=True` migration fails; a plain unconditioned `UniqueConstraint` collides on `''`. Fix now: serializer-level uniqueness (excluding self). Defer: DB constraint, after data audit + conditional `UniqueConstraint(~Q(email=''))` migration.

**H7. Cart stock validation bypass** (`backend/orders/serializers.py:43-51`, `backend/orders/views.py:67-81,108-110`)
Exact match + nuance: `add_item` checks only added quantity (`if product.stock < quantity`), then `cart_item.quantity += quantity` can exceed stock; `UpdateCartItemSerializer.validate_quantity` skips `_check_stock` when `initial_data['product_id']` is a string (DRF's `IntegerField` coerces `"5"`→5, so the request succeeds). Checkout re-validates with row locks (`orders/views.py:144-157`) → damage is cart-only. Fix: cumulative check in `add_item`; remove the `isinstance` bypass in `UpdateCartItemSerializer`.

**H8. Signals thread-safety / is_staff desync** (`backend/users/signals.py:9,20-22`, `backend/products/views.py:16`)
Exact match: module-global `_updating_role` guard is defensive-only (comment confirms queryset `.update()` never re-fires the signal) — dead code, not thread-safe. Real exposure: `IsStaffOrReadOnly` gates on `User.is_staff`, a flag that can transiently desync from profile role. **Behavioral discovery**: bodega/despacho have `is_staff=False` (only admin is staff, `users/serializers.py:58`), so today product writes = admin-only in practice. Fix: rewrite `IsStaffOrReadOnly` to check profile role (`== ROLE_ADMIN`) — behavior-preserving AND desync-proof in one change. Do NOT switch to `STAFF_ROLES` — that would grant bodega/despacho product-write access (a privilege expansion this project never intended).

**H9. Prod TLS/secure settings + SQLite** (`backend/mitienda/settings.py:95-100,165-170`)
Confirmed: no `SESSION_COOKIE_SECURE`/`CSRF_COOKIE_SECURE`/`SECURE_SSL_REDIRECT`/`SECURE_HSTS_SECONDS`/`SECURE_PROXY_SSL_HEADER`; SQLite in prod (infra decision — defer, consistent with prior archive note); `CORS_ALLOW_CREDENTIALS=True` with a token-only client (frontend sends `Authorization: Token` header via `lib/api.ts:29-33`, never cookies) → unnecessary credentialed-CORS surface. Fix: env-gated secure-block (default off in dev); `CORS_ALLOW_CREDENTIALS=False`. Note: this kills cross-origin session-cookie API use — acceptable; only Django admin (same-origin) uses sessions.

### Corrected / verified clean

**F4 correction — `cn@0.3.0` is NOT a random micro-package.** Verified `node_modules/cn/package.json`: it is the official **shadcn-ui/cn** package ("Drop-in replacement for clsx + tailwind-merge"), the current shadcn standard. It does ship a `bin`. Downgrade the finding to INFO — no change recommended (supply-chain surface is first-party shadcn; optional cosmetics: 5 UI components import `cn` directly while `lib/utils.ts` re-exports it — unused re-export).

**F5 confirmed — `RequireRole` UX-only** (`frontend/components/RequireRole.tsx`): docstring explicitly states UX-only; DRF permissions enforce server-side. No change.

## H2 Deep-Dive: Token Security Options (task item 3)

### Option A — Short-lived tokens + refresh endpoint (RECOMMENDED)
- Backend: subclass `TokenAuthentication` → reject tokens older than `DJANGO_TOKEN_TTL_HOURS` (default 24h) using the existing `Token.created`; login rotates (delete + create new); new `POST /api/users/token/refresh/` (authenticated with the current token) rotates on demand; logout deletes only the presented token (`request.auth`).
- Frontend: `api.ts` — on 401, attempt ONE refresh → retry original request; clear token only when refresh fails. `auth-context.tsx` — same policy in `loadProfile`.
- Pros: zero new deps (DRF + existing Token model); no infra changes; keeps current CORS/model/dev flow; bounded blast radius (stolen token dies ≤24h; rotation kills replayed old tokens); reversible.
- Cons: token still XSS-readable (window shrinks, doesn't eliminate); refresh endpoint needs throttling.
- Effort: Medium (~60 backend lines + ~30 frontend lines).

### Option B — httpOnly cookie path
- Backend: session-cookie or httpOnly auth-cookie + CSRF enforcement (active `SessionAuthentication`); `CSRF_TRUSTED_ORIGINS`; cookies must be `SameSite=None; Secure` for the cross-origin `:3000→:8000` setup.
- Frontend: needs a BFF/proxy (Next.js rewrites) so the API is same-origin; per-request CSRF headers; dev TLS (localhost over http breaks `SameSite=None; Secure`); SSR fetch cookie forwarding.
- Pros: XSS cannot read the cookie — the真正的 fix for the localStorage concern.
- Cons: HIGH effort — no proxy layer exists in this project; cross-origin cookie+CSRF plumbing; auth regressions likely mid-change; still needs CSP/nonce to contain XSS regardless; breaks current dev ergonomics.
- Effort: High.

**Recommendation: Option A now.** XSS surface is currently zero (audit-verified); CSP/nonce (F2) closes the vector; Option A caps any future exposure window and is a clean, zero-dep, reversible step. Record Option B as a follow-up with preconditions (add BFF/proxy, dev TLS, CSRF plumbing).

## Audit Gaps (task item 4 — directly relevant additions)

1. **Email-unique migration blocker**: default `''` emails make a plain `unique=True` migration fail — serializer-only fix now, conditional-constraint migration deferred (H6).
2. **`CORS_ALLOW_CREDENTIALS=True` is dead surface** for a token-header client — tighten to `False` (H9).
3. **Products permission reads the wrong source of truth** (`is_staff` flag vs role) — the practical desync exposure is here, not in the signal; role-based check is behavior-preserving (H8).
4. **`X-Powered-By` leak** — disable `poweredByHeader` with the headers work (F2).
5. **No lockout on failed logins** — addressed by throttling; do NOT add account lockout (attacker-controlled DoS).
6. **No prod deployment config exists** (no CI/CD, no infra) — the secure-settings work only pays off at deploy time; proposal should include a short deployment checklist (allowed hosts, TLS termination, HSTS, Postgres).

## Change Surface

| Area | Files | Change | Migration |
|---|---|---|---|
| Settings | `backend/mitienda/settings.py` | DEBUG default False; env-secure block; throttles rates; CORS credentials False | none |
| Auth (users) | `backend/users/views.py`, `serializers.py`, new `authentication.py` | validators in create; token TTL auth class; login rotation; refresh endpoint; scoped logout; throttles | none |
| Profile | `backend/users/serializers.py` | email uniqueness (exclude self) | none (DB constraint deferred) |
| Cart | `backend/orders/views.py`, `serializers.py` | cumulative stock; remove isinstance bypass | none |
| Products | `backend/products/views.py` | role-based staff check (admin) | none |
| Frontend auth | `frontend/lib/api.ts`, `auth-context.tsx` | 401-only refresh; single retry; no logout on transient errors | — |
| Headers | `frontend/next.config.ts`, new middleware | nonce-CSP + security headers; poweredByHeader off | — |
| Tests | `backend/{users,orders,products}/tests.py` | per-finding regression tests (~180-220 lines) | — |

## Recommended Scope

**Fix now** (this change): H1, H2, H3, H4, H6 (serializer part), H7, H8, H9 (secure block + CORS), F1, F2, F3.
**Defer** (recorded as follow-ups in the change): H5 2FA/IP-allowlist (deps/infra), H6 DB constraint (data audit first), H9 SQLite→Postgres (infra), account lockout (deliberately NOT doing — DoS), F4 (corrected — no change), token httpOnly-cookie path (preconditions listed above), prod deployment checklist (doc-only).

**Review-budget forecast for `sdd-tasks`**: ~400-430 authored lines (settings ~30, users ~65, orders ~15, products ~6, frontend ~55, next/middleware ~45, tests ~200). **Decision needed before apply: Yes** — 400-line budget at risk → recommend 2 chained PRs: backend slice (H1-H4, H6-H9 + tests) then frontend slice (F1-F3 + headers).

## Approaches Compared (where a real fork exists)

| Decision | Options | Verdict |
|---|---|---|
| Token strategy | A: TTL+refresh (Med) vs B: httpOnly cookie (High) | A now; B follow-up |
| Products permission | keep is_staff vs role-admin vs STAFF_ROLES | role-admin (behavior-preserving; STAFF_ROLES = privilege expansion) |
| Email uniqueness | serializer-only vs + DB constraint | serializer now; conditional constraint later |
| THROTTLE | ScopedRateThrottle vs AnonRateThrottle global | Scoped on register/login (register 5/hour, login 10/min) |
| CSP | nonce middleware vs static permissive | nonce middleware (static `'unsafe-inline'` in script-src negates the mitigation) |

## Risks

- **DEBUG default flip** breaks local dev if `.env` lacks `DJANGO_DEBUG=True` — `.env` exists and `.env.example` documents it; verify before apply.
- **Token rotation churn**: staff with active sessions get logged out on next token expiry (24h) until refresh is wired — sequence backend refresh BEFORE frontend 401-retry lands.
- **CORS `False`**: any hidden cookie-based API consumer breaks — frontend verified token-only; Django admin is same-origin.
- **CSP nonce** can break the build if middleware ordering or App Router streaming interacts badly — Next 16 documented nonce flow; keep `frame-ancestors 'none'` as the independent clickjacking fix so it lands even if CSP needs iteration.
- **No frontend test runner** — frontend hardening is validated by lint + build + manual flows; no automated regression net (existing limitation, strict_tdd false).
- **Bodega/despacho product writes**: current code already denies them (is_staff=False); role-based change preserves that — regression tests must assert bodega-denied stays.

## Ready for Proposal

**Yes** — exploration is conclusive. All findings verified against current code, one correction (cn package), one behavioral discovery (products = admin-only in practice), migration-free fix-now scope, token strategy decided (Option A), review-budget forecast flagged for task planning.