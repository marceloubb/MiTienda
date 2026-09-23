# Token Lifecycle Specification

## Purpose

Bound the lifetime of DRF authentication tokens, rotate them on authentication events, and keep frontend sessions resilient: tokens expire after a configurable TTL, refresh on demand, logout is scoped to the presented token, and the frontend retries once on 401 before clearing credentials only on genuine auth failure.

## Requirements

### Requirement: Token Expiry (TTL)

The system MUST reject DRF tokens older than `DJANGO_TOKEN_TTL_HOURS` (default 24) using the token's `created` timestamp via a `TokenAuthentication` subclass. Tokens within the TTL MUST be accepted.

#### Scenario: Expired token rejected

- GIVEN a token created more than `DJANGO_TOKEN_TTL_HOURS` ago
- WHEN an authenticated request presents it
- THEN the response is 401 and the request is treated as unauthenticated

#### Scenario: Token within TTL accepted

- GIVEN a token created less than `DJANGO_TOKEN_TTL_HOURS` ago
- WHEN an authenticated request presents it
- THEN authentication succeeds

### Requirement: Token Rotation on Login and Register

The system MUST replace the user's previous token on successful login and MUST issue a brand-new token on registration, never reusing an existing token. The previous token MUST immediately become invalid.

#### Scenario: Login rotates token

- GIVEN a user with an existing valid token
- WHEN the user logs in successfully
- THEN a new token is returned and the previous token is rejected with 401

#### Scenario: Registration issues a fresh token

- GIVEN a new user registration succeeds
- WHEN the client authenticates with the returned token
- THEN authentication succeeds with a token created at registration time

### Requirement: Refresh Endpoint

The system MUST expose `POST /api/users/token/refresh/` accepting a valid, unexpired token as authentication, returning a new token and invalidating the presented one.

#### Scenario: Refresh succeeds

- GIVEN a valid unexpired token
- WHEN the user calls the refresh endpoint with it
- THEN a new token is returned and the old token is rejected with 401

#### Scenario: Refresh with expired token

- GIVEN a token older than the TTL
- WHEN the user calls the refresh endpoint with it
- THEN the response is 401

### Requirement: Scoped Logout

The system MUST delete only the presented token on logout, leaving the user's other tokens valid.

#### Scenario: One device logs out

- GIVEN a user with two valid tokens (two devices)
- WHEN logout is called with one token
- THEN that token is invalidated and the other token remains valid

### Requirement: Frontend Single Retry on 401

The API client MUST, on a 401 response, perform exactly one refresh attempt and retry the original request once. If the refresh fails, the token MUST be cleared.

#### Scenario: Expired token recovers silently

- GIVEN an expired stored token
- WHEN a request returns 401
- THEN the client refreshes once, retries, and the operation succeeds without user-visible logout

#### Scenario: Refresh failure clears token

- GIVEN a 401 whose refresh attempt also fails
- WHEN the client handles the failure
- THEN the token is cleared and the user is logged out

### Requirement: Clear Token Only on Auth Failure

The frontend profile loader MUST clear the stored token only on 401/403 responses or refresh failure. Transient network errors and non-auth server errors MUST NOT clear the token.

#### Scenario: Transient server error keeps session

- GIVEN a transient 5xx or network error during profile load
- WHEN the loader handles the error
- THEN the token remains and the session is preserved

#### Scenario: Forbidden clears session

- GIVEN a 403 response during profile load
- WHEN the loader handles the error
- THEN the token is cleared and the user is logged out