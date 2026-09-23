# Staff User List Specification

## Purpose

Provide an admin-only read path for registered staff users so the staff management screen can render the create-staff form and the registered-staff summary on one view. Builds on `role-based-access` (`IsAdmin`, `UserSerializer` fields); staff APIs remain the server-side enforcement boundary per `admin-access-control`.

## Requirements

### Requirement: Staff User List Endpoint

The system SHALL expose `GET /api/staff/users/` restricted to `IsAdmin`. The endpoint SHALL return users whose `role` is `admin`, `bodega`, or `despacho`, each with `id`, `username`, `email`, `role`, and `is_staff`. The list SHALL be ordered deterministically by `id`.

#### Scenario: Admin lists staff users

- GIVEN an authenticated admin and a user with `role=bodega`
- WHEN GET `/api/staff/users/`
- THEN the response is 200 and includes that user with `id`, `username`, `email`, `role`, `is_staff`

#### Scenario: Customers excluded from the staff list

- GIVEN an authenticated admin and a user with `role=customer`
- WHEN GET `/api/staff/users/`
- THEN the response is 200 and omits the customer user

### Requirement: Staff List Authorization

The system SHALL return 403 for bodega, despacho, and customer roles on `GET /api/staff/users/` and SHALL NOT reveal staff data in denied responses. Unauthenticated requests SHALL return 401.

#### Scenario: Bodega denied the staff list

- GIVEN an authenticated user with `role=bodega`
- WHEN GET `/api/staff/users/`
- THEN the response is 403

#### Scenario: Despacho denied the staff list

- GIVEN an authenticated user with `role=despacho`
- WHEN GET `/api/staff/users/`
- THEN the response is 403

#### Scenario: Customer denied the staff list

- GIVEN an authenticated user with `role=customer`
- WHEN GET `/api/staff/users/`
- THEN the response is 403

### Requirement: Collection URL Coexistence

The system SHALL serve both `GET /api/staff/users/` (list) and `POST /api/staff/users/` (admin-only creation per `role-based-access`) on the same collection URL without either operation altering the other.

#### Scenario: Created user appears in later list

- GIVEN an authenticated admin who created a despacho user via POST
- WHEN GET `/api/staff/users/`
- THEN the response includes the newly created user with `role=despacho`