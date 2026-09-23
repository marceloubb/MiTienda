# Email Uniqueness Specification

## Purpose

Close the email-uniqueness gap: serializer-level uniqueness that excludes the user's own email, plus a DB-level conditional unique constraint on non-empty emails after a data-cleanup migration.

## Requirements

### Requirement: Serializer Exclude-Self Uniqueness

The profile update serializer MUST reject an email already in use by another account and MUST allow a user to keep their own current email.

#### Scenario: Taken email rejected

- GIVEN another account already uses `a@example.com`
- WHEN a different user updates their email to `a@example.com`
- THEN the response is 400

#### Scenario: Own email retained

- GIVEN a user whose current email is `a@example.com`
- WHEN the user updates their profile keeping `a@example.com`
- THEN the update succeeds

#### Scenario: Registration with taken email

- GIVEN an account already registered with `a@example.com`
- WHEN a new registration uses `a@example.com`
- THEN the response is 400

### Requirement: Conditional DB Uniqueness Constraint

After a data-cleanup migration that normalizes empty emails, the database MUST enforce a conditional unique constraint on non-empty emails. Empty emails MUST remain repeatable.

#### Scenario: Duplicate non-empty email blocked at DB

- GIVEN a user with email `a@example.com` stored
- WHEN a second row is inserted with the same non-empty email bypassing the serializer
- THEN the database rejects the insert

#### Scenario: Empty emails remain repeatable

- GIVEN multiple users with email `''`
- WHEN an additional user with email `''` is inserted
- THEN the insert succeeds