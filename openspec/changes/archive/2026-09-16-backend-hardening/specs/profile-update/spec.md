# Profile Update Specification

## Purpose

Replace the raw PUT handler on profile with a validated serializer. Make logout idempotent so missing tokens do not cause errors.

## Requirements

### Requirement: Validated Profile Update

The system MUST use a flat serializer for PUT `/api/profile/`. The serializer MUST validate all fields. An empty string MUST clear the corresponding field. Invalid email MUST be rejected with 400.

#### Scenario: Update fields with valid data

- GIVEN an authenticated user with existing profile
- WHEN PUT `/api/profile/` with valid first_name, email, phone
- THEN response is 200 and fields are updated

#### Scenario: Clear a field with empty string

- GIVEN an authenticated user with phone="555-1234"
- WHEN PUT `/api/profile/` with phone=""
- THEN phone is empty and response is 200

#### Scenario: Invalid email rejected

- GIVEN an authenticated user
- WHEN PUT `/api/profile/` with email="not-an-email"
- THEN the response is 400

### Requirement: Idempotent Logout

The system MUST delete the user's auth token on logout. If no token exists, the system SHALL still return 200 success.

#### Scenario: Logout with existing token

- GIVEN an authenticated user with an auth token
- WHEN POST `/api/logout/`
- THEN token is deleted and response is 200

#### Scenario: Logout without token

- GIVEN an authenticated user without an auth token
- WHEN POST `/api/logout/`
- THEN response is 200 (idempotent)
