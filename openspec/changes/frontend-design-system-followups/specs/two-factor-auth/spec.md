# Delta for two-factor-auth

## MODIFIED Requirements

### Requirement: TOTP Verification on API Requests

When a user has an active TOTP device and 2FA enforcement is enabled, TokenAuthentication MUST reject API requests that do not carry a valid TOTP code. Enforcement MUST be env-gated and off by default. The logout endpoint (`/api/users/logout/`) MUST be exempt from the TOTP gate, so a user who has become gated mid-session can always sign out and reset the session.

(Previously: the gate applied to every authenticated request with no endpoint exemption, so a mid-session 2FA state change could leave a user unable to sign out.)

#### Scenario: Missing TOTP code rejected

- GIVEN 2FA enabled and a user with an active TOTP device
- WHEN the user sends an authenticated API request without a valid TOTP code
- THEN the response is 401

#### Scenario: Valid TOTP code accepted

- GIVEN 2FA enabled and a user with an active TOTP device
- WHEN the user sends an authenticated API request with a valid TOTP code
- THEN the request succeeds

#### Scenario: 2FA disabled allows access

- GIVEN 2FA enforcement disabled (default)
- WHEN a user with an active device sends an authenticated request without a TOTP code
- THEN the request succeeds

#### Scenario: Logout is exempt from the gate

- GIVEN 2FA enabled and a user with an active TOTP device who is currently being rejected with `totp_required`
- WHEN the user sends a request to the logout endpoint without a TOTP code
- THEN the request is not rejected with `totp_required` and the token is invalidated

## ADDED Requirements

### Requirement: Global TOTP Challenge Resolution

No authenticated surface may be the only place a `totp_required` rejection can be resolved. Any surface that receives a 401 carrying `totp_required` MUST render a 6-digit TOTP prompt; resolving it MUST retry the rejected request and MUST restore the session without requiring navigation to the login route. The login route MUST continue to present the same challenge. A user MUST be able to sign out at any time from any surface.

#### Scenario: Mid-session challenge resolves outside the login route

- GIVEN an authenticated user who enrolls a device mid-session
- WHEN a client-side navigation triggers an authenticated request that returns `totp_required`
- THEN a TOTP prompt renders on the current surface without navigating to the login route
- AND submitting a valid code retries the rejected request and restores the session

#### Scenario: Incorrect code keeps the challenge open

- GIVEN a TOTP prompt rendered outside the login route
- WHEN an incorrect code is submitted
- THEN the prompt stays open, an error renders, and the session is not established

#### Scenario: A gated user can always sign out

- GIVEN a user who is currently gated with `totp_required` on every authenticated surface
- WHEN the user signs out
- THEN the sign-out succeeds and the session is cleared

#### Scenario: Unaffected users see no prompt

- GIVEN a user with no active device, or enforcement disabled
- WHEN an authenticated request succeeds
- THEN no TOTP prompt renders on any surface
