# Delta for Environment Settings

## ADDED Requirements

### Requirement: Env-Gated Secure Settings Block

When secure mode is enabled via environment, the system MUST set `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, and `SECURE_PROXY_SSL_HEADER`. Secure mode MUST be off by default for development.

#### Scenario: Secure mode on

- GIVEN the secure-mode env switch is enabled
- WHEN Django starts
- THEN secure cookie flags, SSL redirect, HSTS, and proxy SSL header are active

#### Scenario: Secure mode off by default

- GIVEN the secure-mode env switch is unset
- WHEN Django starts in development
- THEN the secure block is inactive (dev-safe behavior)

### Requirement: CORS Credentials Disabled

`CORS_ALLOW_CREDENTIALS` MUST be `False`. Cross-origin requests carrying credentials MUST NOT be accepted, while token-header requests MUST remain functional.

#### Scenario: Credentialed CORS rejected

- GIVEN a cross-origin request carrying cookies or credentials
- WHEN the request reaches the API
- THEN the response does not include credentialed CORS allowances

#### Scenario: Token-header request works

- GIVEN a cross-origin request carrying only the `Authorization: Token ...` header
- WHEN the request reaches the API
- THEN the request succeeds as before

## MODIFIED Requirements

### Requirement: ImproperlyConfigured Guard

The system MUST default `DEBUG` to `False` when `DJANGO_DEBUG` is unset and MUST raise `ImproperlyConfigured` on startup when `DEBUG=False` and `DJANGO_SECRET_KEY` is the development placeholder default. The guard SHALL NOT fire when `DJANGO_DEBUG=True`.

(Previously: DEBUG defaulted to `True`, so a production boot without `DJANGO_DEBUG` ran in debug mode with a known key; the guard only fired when DEBUG=False with the placeholder key.)

#### Scenario: Production with placeholder key

- GIVEN DJANGO_DEBUG unset (DEBUG defaults False) and DJANGO_SECRET_KEY unset (placeholder default used)
- WHEN Django starts
- THEN `ImproperlyConfigured` is raised

#### Scenario: Production with real key

- GIVEN DJANGO_DEBUG unset and DJANGO_SECRET_KEY="a-real-secret-key-value"
- WHEN Django starts
- THEN startup proceeds normally with DEBUG=False

#### Scenario: Debug mode with placeholder key

- GIVEN DJANGO_DEBUG=True and DJANGO_SECRET_KEY unset
- WHEN Django starts
- THEN startup proceeds normally (dev mode, no guard)