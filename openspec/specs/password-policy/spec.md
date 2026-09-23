# Password Policy Specification

## Purpose

Ensure the configured `AUTH_PASSWORD_VALIDATORS` are actually enforced wherever user accounts are created through the API (public registration and staff-created users), closing the gap where only `min_length=8` applied.

## Requirements

### Requirement: Validators on Registration

The register serializer SHALL validate the password with `django.contrib.auth.password_validation.validate_password` against `AUTH_PASSWORD_VALIDATORS` before creating the user. Violations MUST return 400 and MUST NOT create an account.

#### Scenario: Weak password rejected

- GIVEN registration with a password that is common, purely numeric, or too similar to the username
- WHEN the register endpoint is called
- THEN the response is 400 and no account is created

#### Scenario: Strong password accepted

- GIVEN registration with a password satisfying all validators
- WHEN the register endpoint is called
- THEN the response is 201 and the account is created

### Requirement: Validators on Staff-Created Users

The staff user serializer SHALL apply the same password validation on its create path.

#### Scenario: Staff-created weak password rejected

- GIVEN an admin creating a user with a common or numeric password
- WHEN the staff-create endpoint is called
- THEN the response is 400 and no user is created

#### Scenario: Staff-created valid password succeeds

- GIVEN an admin creating a user with a password satisfying all validators
- WHEN the staff-create endpoint is called
- THEN the response is 201 and the user is created