# Role-Based Access Specification

## Purpose

Define a single-role field on UserProfile, DRF permission classes for server-side enforcement, is_staff sync for admin, and a staff-user creation endpoint restricted to admin.

## Requirements

### Requirement: UserProfile Role Field

The system SHALL expose an exclusive `role` field on UserProfile with values `customer|admin|bodega|despacho`, defaulting to `customer`. A data migration MUST backfill existing users where `is_staff=True` to `role=admin`.

#### Scenario: Default role on new user

- GIVEN a new user registers via the storefront
- WHEN the UserProfile is created
- THEN `role` is `customer` and `is_staff` is `False`

#### Scenario: Backfill migration

- GIVEN existing users with `is_staff=True` before migration
- WHEN the migration runs
- THEN those users have `role=admin` and `is_staff` remains `True`

#### Scenario: Invalid role rejected

- GIVEN an admin user
- WHEN PATCH to `/api/users/{id}/` with `role="manager"`
- THEN the response is 400

### Requirement: Admin is_staff Sync

The system SHALL enforce: when `role=admin` then `is_staff=True`, and when `role` is not `admin` then `is_staff=False`. This MUST be applied at model save time.

#### Scenario: Role set to admin

- GIVEN an authenticated admin
- WHEN PATCH to `/api/users/{id}/` with `role="admin"`
- THEN `is_staff` is `True` on the persisted user

#### Scenario: Role changed from admin to bodega

- GIVEN a user with `role=admin` and `is_staff=True`
- WHEN PATCH to `/api/users/{id}/` with `role="bodega"`
- THEN `is_staff` is `False` on the persisted user

### Requirement: DRF Permission Classes

The system SHALL provide four permission classes: `IsAdmin`, `IsBodega`, `IsDespacho`, `IsStaffRole`. Each MUST check `user.role`. `IsStaffRole` SHALL grant access to admin, bodega, and despacho.

#### Scenario: Admin accesses staff endpoint

- GIVEN an authenticated user with `role=admin`
- WHEN requesting a view guarded by `IsAdmin`
- THEN the response is 200 (or the expected success code)

#### Scenario: Bodega denied admin endpoint

- GIVEN an authenticated user with `role=bodega`
- WHEN requesting a view guarded by `IsAdmin`
- THEN the response is 403

#### Scenario: IsStaffRole includes bodega

- GIVEN an authenticated user with `role=bodega`
- WHEN requesting a view guarded by `IsStaffRole`
- THEN the response is 200 (not 403)

#### Scenario: Customer denied staff endpoint

- GIVEN an authenticated user with `role=customer`
- WHEN requesting a view guarded by `IsStaffRole`
- THEN the response is 403

### Requirement: Staff-User Creation Endpoint

The system SHALL expose `POST /api/staff/users/` restricted to `IsAdmin`. The endpoint MUST accept `username`, `email`, `password`, and `role` (admin|bodega|despacho). It SHALL create the user and return 201.

#### Scenario: Admin creates bodega user

- GIVEN an authenticated admin
- WHEN POST `/api/staff/users/` with valid data and `role="bodega"`
- THEN a user is created with `role=bodega` and `is_staff=False`

#### Scenario: Non-admin rejected

- GIVEN an authenticated user with `role=bodega`
- WHEN POST `/api/staff/users/`
- THEN the response is 403

### Requirement: UserSerializer Role Exposure

The system SHALL expose `role` and `is_staff` as read fields in `UserSerializer`. `is_staff` MUST be read-only in the serializer (derived from role sync).

#### Scenario: Role visible in user response

- GIVEN an authenticated admin
- WHEN GET `/api/users/{id}/`
- THEN the response includes `role` and `is_staff` fields
