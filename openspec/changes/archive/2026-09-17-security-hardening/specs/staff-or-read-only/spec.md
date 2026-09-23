# Delta for Staff or Read Only

## RENAMED Requirements

### Requirement: Staff-Only Product Writes → Admin-Only Product Writes

(Reason: the permission check now derives from the profile role `ROLE_ADMIN`, not the `is_staff` flag; the old name misdescribed the enforced behavior.)
(Migration: tests and docs referring to "staff-only product writes" should reference admin-role writes.)

### Requirement: Staff-Only Category Writes → Admin-Only Category Writes

(Reason: the same role-based source of truth applies to category writes.)
(Migration: tests and docs referring to "staff-only category writes" should reference admin-role writes.)

## MODIFIED Requirements

### Requirement: Admin-Only Product Writes

The system MUST restrict POST, PUT, PATCH, DELETE on product resources to users whose profile role is `ROLE_ADMIN`. The permission check MUST read the profile role, not the `is_staff` flag. Bodega and despacho roles MUST be denied product writes. Unauthenticated and customer users remain read-only.

(Previously: the check used `User.is_staff`; bodega/despacho were denied only because they are not staff — a transient flag desync could mis-grant or mis-deny.)

#### Scenario: Non-admin write rejected

- GIVEN an authenticated user with a non-admin role
- WHEN the user sends POST, PUT, PATCH, or DELETE to `/api/products/`
- THEN the response is 403

#### Scenario: Unauthenticated write rejected

- GIVEN no authentication
- WHEN the user sends POST to `/api/products/`
- THEN the response is 403

#### Scenario: Admin write succeeds

- GIVEN an authenticated user with role `ROLE_ADMIN`
- WHEN the user sends POST to `/api/products/` with valid data
- THEN the response is 201

#### Scenario: Role is the source of truth

- GIVEN an authenticated user with role `ROLE_ADMIN` whose `is_staff` flag is transiently False
- WHEN the user sends POST to `/api/products/` with valid data
- THEN the response is 201 (role governs, not the flag)

#### Scenario: Bodega write rejected

- GIVEN an authenticated user with `role=bodega`
- WHEN the user sends POST to `/api/products/`
- THEN the response is 403

#### Scenario: Despacho write rejected

- GIVEN an authenticated user with `role=despacho`
- WHEN the user sends POST to `/api/products/`
- THEN the response is 403

#### Scenario: Unauthenticated read allowed

- GIVEN no authentication
- WHEN the user sends GET to `/api/products/`
- THEN the response is 200 with product list

### Requirement: Admin-Only Category Writes

The system MUST restrict POST, PUT, PATCH, DELETE on category resources to users whose profile role is `ROLE_ADMIN`, read from the profile role rather than the `is_staff` flag. Bodega and despacho MUST be denied category writes.

(Previously: the check used `is_staff`.)

#### Scenario: Non-admin category write rejected

- GIVEN an authenticated non-admin user
- WHEN the user sends POST to `/api/categories/`
- THEN the response is 403

#### Scenario: Admin category write succeeds

- GIVEN an authenticated user with role `ROLE_ADMIN`
- WHEN the user sends POST to `/api/categories/` with valid data
- THEN the response is 201

#### Scenario: Bodega category write rejected

- GIVEN an authenticated user with role `bodega`
- WHEN the user sends POST to `/api/categories/`
- THEN the response is 403