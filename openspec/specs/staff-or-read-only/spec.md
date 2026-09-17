# Staff or Read Only Specification

## Purpose

Restrict write operations on products and categories to staff users only. Unauthenticated users MAY read; authenticated non-staff users MUST be denied writes.

## Requirements

### Requirement: Staff-Only Product Writes

The system MUST restrict POST, PUT, PATCH, DELETE on product resources to staff users. Non-staff users (including unauthenticated) SHALL be allowed read-only access.

#### Scenario: Non-staff write rejected

- GIVEN an authenticated non-staff user
- WHEN the user sends POST, PUT, PATCH, or DELETE to `/api/products/`
- THEN the response is 403

#### Scenario: Unauthenticated write rejected

- GIVEN no authentication
- WHEN the user sends POST to `/api/products/`
- THEN the response is 403

#### Scenario: Staff write succeeds

- GIVEN an authenticated staff user
- WHEN the user sends POST to `/api/products/` with valid data
- THEN the response is 201

#### Scenario: Unauthenticated read allowed

- GIVEN no authentication
- WHEN the user sends GET to `/api/products/`
- THEN the response is 200 with product list

### Requirement: Staff-Only Category Writes

The system MUST restrict POST, PUT, PATCH, DELETE on category resources to staff users. Non-staff users SHALL be allowed read-only access.

#### Scenario: Non-staff category write rejected

- GIVEN an authenticated non-staff user
- WHEN the user sends POST to `/api/categories/`
- THEN the response is 403

#### Scenario: Staff category write succeeds

- GIVEN an authenticated staff user
- WHEN the user sends POST to `/api/categories/` with valid data
- THEN the response is 201
