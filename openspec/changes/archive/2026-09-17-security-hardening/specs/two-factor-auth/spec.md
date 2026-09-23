# Two-Factor Authentication Specification

## Purpose

Add TOTP-based two-factor authentication (django-otp) on top of TokenAuthentication: admin-role users can enroll a TOTP device, and API requests from users with an active device require a valid TOTP code. Enforcement is env-gated and default-off to avoid production lockout.

## Requirements

### Requirement: TOTP Enrollment

An authenticated admin-role user MUST be able to enroll a TOTP device. Enrollment SHALL return a shared secret and provisioning URI, and the device SHALL become active only after the user confirms a valid TOTP code.

#### Scenario: Enrollment produces an active device

- GIVEN an authenticated admin-role user with no active TOTP device
- WHEN the user requests enrollment and confirms a valid TOTP code
- THEN an active TOTP device is created for the user

#### Scenario: Confirmation mismatch blocks activation

- GIVEN an admin-role user mid-enrollment
- WHEN the user confirms an invalid TOTP code
- THEN enrollment is not completed and an error is returned

### Requirement: TOTP Verification on API Requests

When a user has an active TOTP device and 2FA enforcement is enabled, TokenAuthentication MUST reject API requests that do not carry a valid TOTP code. Enforcement MUST be env-gated and off by default.

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