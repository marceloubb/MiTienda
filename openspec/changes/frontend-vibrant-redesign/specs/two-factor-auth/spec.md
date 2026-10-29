# Delta for two-factor-auth

## ADDED Requirements

### Requirement: Web Enrollment UI

The system SHALL provide an admin-only route `/admin/2fa` (guarded like other admin surfaces) that lets an authenticated admin enroll a TOTP device against the existing backend endpoints. After enrollment starts, the page MUST render the provisioning URI as a QR code (client-side) and the manual Base32 secret, then a 6-digit confirmation input. Confirming with a valid code MUST show success; an invalid code MUST surface the backend error and keep enrollment pending; an existing confirmed device MUST show the backend's already-confirmed message. Backup codes from the design MUST NOT be rendered (no backend support; deferred).

#### Scenario: Admin enrolls and confirms

- GIVEN an authenticated admin with no confirmed device opens `/admin/2fa`
- WHEN the admin follows the secret, scans/enters it, and submits a valid 6-digit code
- THEN the page shows success and the device is confirmed

#### Scenario: Invalid confirmation code rejected

- GIVEN an admin mid-enrollment with a rendered secret
- WHEN the admin submits an incorrect 6-digit code
- THEN the backend error renders and the device stays unconfirmed

#### Scenario: Repeated enrollment blocked

- GIVEN an admin who already confirmed a device
- WHEN the admin opens `/admin/2fa` and starts enrollment
- THEN the already-confirmed message renders and no new secret is issued

#### Scenario: Non-admin blocked

- GIVEN a non-admin user opens `/admin/2fa`
- WHEN the page loads
- THEN the user is redirected away from the admin surface

### Requirement: 2FA API Client

`frontend/lib/api.ts` MUST add `enroll2FA()` posting to `/users/2fa/enroll/` and `confirm2FA(deviceId, code)` posting to `/users/2fa/confirm/`. Both MUST run through the standard fetchAPI path and surface backend status (400 already-confirmed, 400 invalid code, 403 non-admin) as `APIError`.

#### Scenario: Enroll returns device material

- GIVEN an authenticated admin
- WHEN `enroll2FA()` resolves
- THEN it returns `device_id`, `secret`, and `provisioning_uri`

#### Scenario: Confirm surfaces invalid-code error

- GIVEN a confirm POST with a wrong code
- WHEN `confirm2FA()` rejects
- THEN the `APIError` carries the backend's 400 message

### Requirement: Login TOTP Challenge

After a successful password login, when any authenticated request returns 401 with error code `totp_required` (backend: user has a confirmed device and `DJANGO_2FA_ENFORCED` is on), the frontend MUST present a 6-digit TOTP challenge step before treating the session as established. The submitted code MUST be sent as the `X-TOTP` header on the retried request and subsequent authenticated requests. The client MUST NOT send `X-TOTP` on `/users/login/` itself. The session MUST NOT be treated as authenticated (no profile/cart state, no role-based rendering) until the challenge passes.

#### Scenario: Gated session prompts for code

- GIVEN a user with a confirmed device logging in while 2FA is enforced
- WHEN login succeeds and the first authenticated request returns `totp_required`
- THEN a TOTP challenge step renders
- AND after a valid code the original request retries with `X-TOTP` and the session establishes

#### Scenario: Wrong code keeps challenge open

- GIVEN the challenge step rendered
- WHEN the user submits an incorrect code
- THEN the request still returns `totp_required`, an error renders, and the session is not established

#### Scenario: Unaffected users skip the challenge

- GIVEN a user without a confirmed device (or enforcement off)
- WHEN the user logs in
- THEN no challenge renders and the session establishes directly