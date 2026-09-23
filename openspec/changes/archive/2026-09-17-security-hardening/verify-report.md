```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:3b543ec0362e37e09d6ce54e48fb56feedb49632bffd0c7a9e584dade52fe50e
verdict: pass
blockers: 0
critical_findings: 0
requirements: 33/33
scenarios: 68/68
test_command: .venv\Scripts\python.exe manage.py test
test_exit_code: 0
test_output_hash: sha256:8432a374a589fb62fa509633dcaa6264591038551c7aecd22b66613b36980aab
build_command: npx next build
build_exit_code: 0
build_output_hash: sha256:df2463bddf917374fc54959fc5ce29459127ff3bbe88dfc77ce3f5afda7930a4
```

## Verification Report

**Change**: security-hardening
**Version**: delta specs v1 (11 spec files: env-settings, admin-access-control, postgres-data-store, password-policy, api-throttling, token-lifecycle, two-factor-auth, email-uniqueness, staff-or-read-only, order-integrity, security-headers)
**Mode**: Standard (strict_tdd: false)
**Verifier**: independent final verification — 18/18 tasks complete (`[x]` in tasks.md, all apply phases passed); evidence re-run from scratch on branch `security-hardening/foundation` HEAD `52ad06b` (no apply-progress claims reused)

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 18 (1.1–4.4) |
| Tasks complete | 18 (`[x]` in tasks.md) |
| Tasks incomplete | 0 |
| Requirements (11 specs) | 33 |
| Scenarios (11 specs) | 68 |

### Build & Tests Execution

**Backend** — `.venv\Scripts\python.exe` (backend/)
```text
manage.py check                  → System check identified no issues (0 silenced).  (exit 0)
manage.py makemigrations --check --dry-run → No changes detected                     (exit 0)
manage.py test                   → Ran 148 tests in 195.311s — OK (skipped=1)        (exit 0)
```
Test suite composition: 148 tests = 18 (mitienda settings/admin/DB) + 60 (users auth/2FA/email/validators/throttles/token) + 11 (products role lockdown) + 59 (orders stock/lifecycle + 1 PG-gated skip). The single skip is `ConcurrentCheckoutTests.test_concurrent_checkout_does_not_oversell`, correctly gated `@skipUnless(DATABASE_URL startswith postgres://)` — the expected skip without a live PostgreSQL (preflight: "1 PG-gated skip expected without DATABASE_URL"). `django-otp==1.7.2` verified compatible with Django 6.1.1 (apply design note): `manage.py check` clean and the full suite green.

**Frontend** — (frontend/)
```text
npx eslint .  → ✖ 4 problems (0 errors, 4 warnings) — all @next/next/no-img-element in
                app/cart/page.tsx, app/checkout/page.tsx, app/products/[id]/page.tsx,
                components/ProductCard.tsx. All four files are UNTOUCHED by this change
                (frontend diff = app/layout.tsx, lib/api.ts, lib/auth-context.tsx,
                next.config.ts, proxy.ts only). Exit 0.
npx next build → Compiled successfully (Turbopack); TypeScript OK; ✓ Generating static
                pages (2/2); 13 routes, all dynamic (ƒ — force-dynamic per design for
                per-request nonce) + ƒ Proxy (Middleware) confirmed. Exit 0.
```
Frontend runtime harness note: this project has no JS test runner (no jest/vitest config; `openspec/config.yaml` frontend `test_command: "—"`; strict_tdd false) — documented in design.md ("Testing Strategy: Frontend = Types/lint/build") and every apply phase; lint/build + source inspection are the harness, consistent with the established project contract (see archived admin-inventory-roles verify-report for the same methodology).

**Coverage**: not measured (no coverage tooling configured in this project) — ➖ Not available.

### Spec Compliance Matrix

All 68 scenarios map to covering evidence: 56 backend scenarios to tests that **passed at runtime** in the 148-test run; 10 frontend scenarios to source inspection plus green lint/build (project-declared frontend harness); 1 postgres scenario to the documented migration procedure (+ migrations in sync); 1 postgres scenario to a correctly-gated concurrency test that skips without a live PostgreSQL (expected per preflight).

| Requirement | Scenarios | Test | Result |
|-------------|-----------|------|--------|
| env-settings: Env-Gated Secure Settings Block | 2/2 | mitienda/tests: `test_secure_mode_on_sets_secure_block`, `test_secure_mode_on_honors_hsts_override`, `test_secure_mode_off_by_default` | ✅ COMPLIANT |
| env-settings: CORS Credentials Disabled | 2/2 | mitienda/tests: `test_cors_credentials_disabled` (`settings.CORS_ALLOW_CREDENTIALS` False); token-header requests proven by the whole users suite authenticating via `Authorization: Token` (e.g. `test_token_within_ttl_accepted`, `test_login_rotates_token_and_old_one_is_invalid`) | ✅ COMPLIANT |
| env-settings: ImproperlyConfigured Guard | 3/3 | mitienda/tests: `test_debug_unset_defaults_false_with_placeholder_key_raises`, `test_debug_unset_with_real_key_proceeds_with_debug_false`, `test_debug_mode_with_placeholder_key_proceeds`, `test_production_with_placeholder_key_raises`, `test_production_with_real_key_proceeds` | ✅ COMPLIANT |
| admin-access-control: Env-Driven Admin URL | 2/2 | mitienda/tests: `test_custom_admin_url_setting`, `test_custom_admin_url_routes_admin` (backoffice/ serves, /admin/ 404), `test_default_admin_url`; source: `urls.py` `path(settings.ADMIN_URL, admin.site.urls)` | ✅ COMPLIANT |
| admin-access-control: Env-Driven IP Allowlist | 3/3 | mitienda/tests: `test_allowlisted_ip_allowed` (203.0.113.5 → 200), `test_unlisted_ip_denied` (403), `test_allowlist_unset_permits_access`; source: `middleware.py` `AdminIPAllowlistMiddleware` | ✅ COMPLIANT |
| postgres-data-store: PostgreSQL Backend | 2/2 | mitienda/tests: `test_postgres_url_selects_postgresql_backend` (psycopg engine), `test_non_postgres_url_keeps_sqlite_dev_default`, `test_unset_url_keeps_sqlite_dev_default`; source: `settings.py` urllib.parse of `postgres://`; `requirements.txt` `psycopg[binary]==3.3.5` | ✅ COMPLIANT |
| postgres-data-store: Data Migration Path | 1/1 | `docs/DEPLOYMENT.md` §PostgreSQL data migration (dumpdata `--natural-foreign --natural-primary -e contenttypes -e auth.Permission` → migrate → loaddata, backup/snapshot first, rollback = unset `DATABASE_URL`); migrations in sync (`makemigrations --check --dry-run` clean). Live PG migrate/loaddata not executed here — residual risk | ⚠️ PARTIAL (doc + migrations verified; live-PG execution deferred to deploy checklist) |
| postgres-data-store: Lock Semantics Preserved | 1/1 | orders/tests: `test_concurrent_checkout_does_not_oversell` — `TransactionTestCase`, two threads race `create_from_cart`, asserts `[201, 400]` and stock 0; correctly gated `@skipUnless(DATABASE_URL postgres://)`, SKIPPED in this run (expected). Source: all lock sites (`create_from_cart`, `advance`, `cancel`, `_restore_order_stock`) use `select_for_update()` inside `transaction.atomic()` | ⚠️ PARTIAL (gated by design; not executed against live PostgreSQL) |
| password-policy: Validators on Registration | 2/2 | users/tests: `test_weak_password_rejected_no_account_created` (common), `test_numeric_password_rejected`, `test_password_similar_to_username_rejected`, `test_strong_password_accepted` (201); source: `RegisterSerializer.validate()` → `_validate_password_with_user` | ✅ COMPLIANT |
| password-policy: Validators on Staff-Created Users | 2/2 | users/tests: `test_weak_password_rejected_no_user_created` (400, no user), `test_valid_password_succeeds` (201); source: `StaffUserSerializer.validate()` same helper | ✅ COMPLIANT |
| api-throttling: Scoped Throttles on Register and Login | 3/3 | users/tests: `test_sixth_register_within_hour_returns_429` (5→6th 429), `test_eleventh_login_within_minute_returns_429` (10→11th 429), `test_within_limits_login_succeeds` (200); settings: scopes register 5/hour, login 10/min, token_refresh 10/min | ✅ COMPLIANT |
| api-throttling: Throttling Applies Regardless of Payload Validity | 1/1 | users/tests: `test_invalid_register_payloads_still_consume_budget` (5 malformed → 6th valid 429), `test_eleventh_login_within_minute_returns_429` (10 wrong-password logins 401 → 11th valid 429); DRF `ScopedRateThrottle` runs in `initial()` before serializer validation | ✅ COMPLIANT |
| token-lifecycle: Token Expiry (TTL) | 2/2 | users/tests: `test_expired_token_rejected_with_401` (`_age_token` past TTL), `test_token_within_ttl_accepted`; source: `ExpiringTokenAuthentication` `timezone.now() - token.created > timedelta(hours=TTL)` | ✅ COMPLIANT |
| token-lifecycle: Token Rotation on Login and Register | 2/2 | users/tests: `test_login_rotates_token_and_old_one_is_invalid`, `test_register_issues_fresh_token_usable_at_registration_time`; source: `LoginView` deletes all user tokens then creates; `RegisterView` `Token.objects.create` (no `get_or_create`) | ✅ COMPLIANT |
| token-lifecycle: Refresh Endpoint | 2/2 | users/tests: `test_refresh_rotates_token_and_old_one_is_invalid`, `test_refresh_with_expired_token_returns_401`; source: `RefreshTokenView` at `/api/users/token/refresh/` (throttle scope `token_refresh` 10/min) | ✅ COMPLIANT |
| token-lifecycle: Scoped Logout | 1/1 | users/tests: `test_logout_deletes_only_the_presented_token` (two tokens, one deleted, other remains valid); source: `LogoutView` deletes `request.auth` only | ✅ COMPLIANT |
| token-lifecycle: Frontend Single Retry on 401 | 2/2 | source: `lib/api.ts` `fetchAPI` — 401 → `refreshToken` once → single retry; `NON_RETRYABLE_ENDPOINTS` excludes login/register/refresh; shared in-flight refresh for parallel 401s; refresh failure → `setActiveToken(null)`; `next build` TS pass | ✅ COMPLIANT (lint/build harness + source) |
| token-lifecycle: Clear Token Only on Auth Failure | 2/2 | source: `lib/auth-context.tsx` `loadProfile` clears only when `status === 401 \|\| 403` (via `setActiveToken(null)`); transient 5xx/network errors do not clear; `onTokenChange` hook clears localStorage/state; `next build` TS pass | ✅ COMPLIANT (lint/build harness + source) |
| two-factor-auth: TOTP Enrollment | 2/2 | users/tests: `test_enroll_then_confirm_activates_device`, `test_confirmation_with_bad_code_blocks_activation`, plus `test_enroll_rejects_when_confirmed_device_exists`, `test_enroll_requires_admin_role`; source: `TwoFAEnrollView`/`TwoFAConfirmView` (django-otp `TOTPDevice`, admin-only) | ✅ COMPLIANT |
| two-factor-auth: TOTP Verification on API Requests | 3/3 | users/tests: `test_missing_totp_code_rejected_with_totp_required` (401), `test_wrong_totp_code_rejected`, `test_valid_totp_code_accepted`, `test_gate_off_allows_request_without_code`; source: `ExpiringTokenAuthentication` env-gated `DJANGO_2FA_ENFORCED` + `X-TOTP` header, default off | ✅ COMPLIANT |
| email-uniqueness: Serializer Exclude-Self Uniqueness | 3/3 | users/tests: `test_taken_email_rejected` (400), `test_own_email_retained` (200), `test_registration_with_taken_email_rejected` (400); source: `UpdateProfileSerializer.validate_email` exclude-self via request context; `RegisterSerializer.validate_email` | ✅ COMPLIANT |
| email-uniqueness: Conditional DB Uniqueness Constraint | 2/2 | users/tests: `test_duplicate_non_empty_email_blocked_at_db` (IntegrityError), `test_empty_emails_remain_repeatable`; source: `users/migrations/0003_email_unique_nonempty.py` — NULL→`''` RunSQL + partial unique index `WHERE email <> ''` (idempotent, reversible) | ✅ COMPLIANT |
| staff-or-read-only: Admin-Only Product Writes | 7/7 | products/tests: `test_non_admin_product_write_rejected`, `test_unauthenticated_product_write_rejected`, `test_admin_product_write_succeeds`, `test_role_beats_is_staff_flag` (is_staff drifted False, role admin → 201), `test_bodega_product_write_rejected`, `test_despacho_product_write_rejected`, `test_unauthenticated_read_allowed`; source: `IsAdminOrReadOnly` reads `get_user_role(request.user) == ROLE_ADMIN` | ✅ COMPLIANT |
| staff-or-read-only: Admin-Only Category Writes | 3/3 | products/tests: `test_non_admin_category_write_rejected`, `test_admin_category_write_succeeds`, `test_bodega_category_write_rejected`, `test_despacho_category_write_rejected` | ✅ COMPLIANT |
| staff-or-read-only: Renamed requirements (Product/Category) | — | Informational renames (`Staff-Only → Admin-Only`) — no separate scenarios; tests/docs updated to role-based naming | ✅ COMPLIANT (rename only) |
| order-integrity: Cumulative Stock Check on Add Item | 2/2 | orders/tests: `test_cumulative_addition_rejected` (qty 3+3 on stock 5 → 400, cart stays 3), `test_cumulative_addition_within_stock` (2+2 → 201, cart 4); source: `CartViewSet.add_item` checks `product.stock < existing_quantity + quantity` | ✅ COMPLIANT |
| order-integrity: Cart Item Update Validation | 5/5 | orders/tests: `test_valid_quantity_update`, `test_quantity_below_minimum_rejected` (0 → 400), `test_non_numeric_quantity_rejected` ("abc" → 400), `test_quantity_above_stock_rejected` (5 on stock 3 → 400), `test_string_product_id_does_not_bypass_stock` (string "3" → 400); source: `UpdateCartItemSerializer.validate` always `_check_stock` on the DRF-coerced int; `AddToCartSerializer` `min_value=1` | ✅ COMPLIANT |
| security-headers: Nonce-Based CSP | 2/2 | source: `frontend/proxy.ts` — per-request `crypto.randomUUID()` nonce, `script-src 'self' 'nonce-…' 'strict-dynamic'` (no `'unsafe-inline'`), matcher excludes api/_next/static/_next/image/favicon/prefetch; `app/layout.tsx` `force-dynamic`; `next build` compiles the Proxy | ✅ COMPLIANT (lint/build harness + source) |
| security-headers: Frame Ancestors Denied | 1/1 | source: `frontend/proxy.ts` CSP includes `frame-ancestors 'none'`; plus `X-Frame-Options: DENY` fallback in `next.config.ts` | ✅ COMPLIANT (lint/build harness + source) |
| security-headers: Standard Security Headers | 1/1 | source: `next.config.ts` `headers()` — `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geolocation/browsing-topics off) | ✅ COMPLIANT (lint/build harness + source) |
| security-headers: Powered-By Disabled | 1/1 | source: `next.config.ts` `poweredByHeader: false` | ✅ COMPLIANT (lint/build harness + source) |
| security-headers: Deployment Checklist | 1/1 | source: `docs/DEPLOYMENT.md` — env var table lists every new security var (token TTL, secure mode, admin allowlist, 2FA gate, admin URL, DATABASE_URL, DEBUG/secret key, allowed hosts, HSTS, email backend, NEXT_PUBLIC_API_URL) with production values + enablement order | ✅ COMPLIANT (doc + source) |

**Compliance summary**: 66/68 scenarios fully verified (56/56 backend runtime-passed + 10/10 frontend via lint/build harness + source), 1 doc-verified (postgres data-migration path — documented procedure + migrations in sync), 1 correctly-gated and skipped by design (postgres concurrent checkout — expected skip without `DATABASE_URL` per preflight; source-verified `select_for_update` in `atomic()`).

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| DEBUG default False + ImproperlyConfigured guard | ✅ Implemented | `settings.py` — `_env_bool('DJANGO_DEBUG','False')`; guard fires only when `DEBUG=False` and placeholder `SECRET_KEY` |
| Env-gated secure block (H9) | ✅ Implemented | `settings.py` — off by default; on with `DJANGO_SECURE_MODE` sets secure cookies, SSL redirect, HSTS (`DJANGO_HSTS_SECONDS`), proxy header |
| CORS credentials disabled | ✅ Implemented | `CORS_ALLOW_CREDENTIALS = False`; origins unchanged (token-header flow intact) |
| Env-driven admin URL + IP allowlist (H5, H11) | ✅ Implemented | `DJANGO_ADMIN_URL` consumed in `urls.py` only; `AdminIPAllowlistMiddleware` 403s unlisted IPs on the admin path, unset = unrestricted |
| Postgres store (H12) | ✅ Implemented | `DATABASE_URL` parsed via stdlib `urllib.parse` → psycopg; SQLite dev default otherwise; `psycopg[binary]==3.3.5` |
| Password validators on register + staff-create (H2) | ✅ Implemented | `_validate_password_with_user` shared helper; cross-field `validate()` for similarity validator |
| Scoped throttles (H4) | ✅ Implemented | `register` 5/hour, `login` 10/min, `token_refresh` 10/min; `ScopedRateThrottle` default class; pre-validation counting |
| Token TTL subclass (H3) | ✅ Implemented | `ExpiringTokenAuthentication` — TTL from `token.created`; swapped in `DEFAULT_AUTHENTICATION_CLASSES` |
| Rotation / refresh / scoped logout (H3) | ✅ Implemented | login deletes all tokens then creates; register always creates; `token/refresh/` rotates; logout deletes `request.auth` only |
| Frontend 401 retry-once + clear-only-on-auth-failure (F1, F3) | ✅ Implemented | `api.ts` single refresh + single retry, shared in-flight, non-retryable endpoints; `auth-context.tsx` clears only 401/403 |
| TOTP 2FA (H10) | ✅ Implemented | django-otp apps; `TwoFAEnrollView`/`TwoFAConfirmView` (admin-only); `DJANGO_2FA_ENFORCED` + `X-TOTP` in auth class, `totp_required` code, default off |
| Email uniqueness (H6) | ✅ Implemented | serializer exclude-self + `''` repeatable; `users/0003_email_unique_nonempty` partial unique index |
| Role-based writes (H8) | ✅ Implemented | `IsAdminOrReadOnly` on products + categories reads `role == ROLE_ADMIN`; bodega/despacho denied (no privilege expansion) |
| Cumulative stock + string product_id (H7) | ✅ Implemented | `add_item` cumulative check; `UpdateCartItemSerializer` always `_check_stock` |
| Nonce CSP + headers + poweredByHeader (F2) | ✅ Implemented | `proxy.ts` nonce CSP incl. `frame-ancestors 'none'`; `next.config.ts` nosniff/Referrer/Permissions/X-Frame + `poweredByHeader: false`; `layout.tsx` `force-dynamic` |
| Deployment checklist | ✅ Implemented | `docs/DEPLOYMENT.md` — full env table, enablement order, 2FA gate consequence, Postgres migration procedure, frontend deploy notes |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Env-gated settings, all defaults dev-safe (off / 24h / `admin/`) | ✅ Yes | Env var table in design matches `settings.py` exactly |
| TOTP via per-request `X-TOTP` header in the auth class | ✅ Yes | `ExpiringTokenAuthentication` gate; 401 with `totp_required`; no middleware/exempt list |
| 2FA enrollment flow (reject-confirmed, delete-stale, secret+provisioning_uri) | ✅ Yes | `TwoFAEnrollView`/`TwoFAConfirmView` as designed; no `OTPMiddleware`; no frontend UI (documented limitation) |
| Token rotation semantics (single-session on login/register; scoped logout; refresh rotates) | ✅ Yes | Login deletes all then creates; logout deletes presented token; refresh deletes + creates |
| Postgres via stdlib urllib.parse (no dj-database-url) | ✅ Yes | `settings.py` `urllib.parse.urlparse` on `postgres://`; else SQLite |
| `select_for_update` inside `transaction.atomic()` at all lock sites | ✅ Yes | `create_from_cart`, `advance`, `cancel`, `_restore_order_stock` all `select_for_update()` in `atomic()` (pre-existing semantics preserved) |
| Email cleanup migration hand-written (`users/0003`, RunSQL + partial index) | ✅ Yes | RunSQL NULL→`''` + `CREATE UNIQUE INDEX … WHERE email <> ''`; idempotent, reversible (`DROP INDEX`) — documented deviation from `AddConstraint` (auth app model resolution) |
| Frontend single retry with in-flight sharing | ✅ Yes | Design says "single 401→refresh→retry"; implementation adds a shared in-flight refresh for parallel 401s + `NON_RETRYABLE_ENDPOINTS` guard — refinements, spec-compliant |
| Next 16 Proxy for nonce CSP, matcher excludes api/assets/prefetch | ✅ Yes | `frontend/proxy.ts` + `config.matcher` (`next-router-prefetch`/`purpose: prefetch` excluded); `next build` reports `ƒ Proxy (Middleware)` |
| Only new deps `django-otp==1.7.2` + `psycopg[binary]` | ✅ Yes | `requirements.txt` — no other additions |

### Issues Found

**CRITICAL**: None.
**WARNING**:
- postgres-data-store "Data Migration Path": procedure documented and migrations in sync, but the live `migrate`/`loaddata` run against a real PostgreSQL was not executed in this environment (no `DATABASE_URL`) — execute per `docs/DEPLOYMENT.md` before production cutover.
- postgres-data-store "Lock Semantics Preserved": the concurrency test is present and correctly gated but skips without live PostgreSQL (1 expected skip, per preflight). The `select_for_update`-in-`atomic()` semantics are source-verified at all four lock sites; prove the race against PG before prod.
**SUGGESTION**:
- The SPA has no 2FA prompt UI — with `DJANGO_2FA_ENFORCED=True`, browser sessions from confirmed-device admins receive 401s unless the client supplies a fresh `X-TOTP` code (documented consequence in `docs/DEPLOYMENT.md`; keep gate off for SPA-only deployments until a TOTP prompt exists). Out of F-scope by design.
- 4 pre-existing `no-img-element` lint warnings in untouched customer pages — out of scope (confirmed absent from the change diff).
- Per-request 2FA verification has a 30s window; docs already require NTP-synchronized clocks (drift tolerance one window).

### Verdict

**PASS** — 18/18 tasks complete; 33/33 requirements and 68/68 scenarios covered (66 fully verified: 56 backend runtime-passed + 10 frontend harness-verified; 2 postgres scenarios documented/gated by design with expected skip without `DATABASE_URL`). `manage.py test` 148/148 OK (1 expected PG-gated skip), `makemigrations --check` clean, `manage.py check` clean, eslint 0 errors (4 pre-existing warnings in untouched files), `next build` green with Proxy + all-dynamic routes. No blockers, no critical findings. Archive-ready.