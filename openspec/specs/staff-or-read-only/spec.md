# Staff or Read Only Specification

## Purpose

Restrict write operations on products and categories to staff users only. Unauthenticated users MAY read; authenticated non-staff users MUST be denied writes.

## Requirements

### Requirement: Staff-Only Product Writes

The system MUST restrict POST, PUT, PATCH, DELETE on product resources to staff users only. Bodega and despacho roles are NOT staff — they have `is_staff=False` and MUST be denied product writes. Unauthenticated and customer users remain read-only. Only admin users (who have `is_staff=True` via role sync) may write products.

(Previously: any user with `is_staff=True` could write products)

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

#### Scenario: Bodega write rejected

- GIVEN an authenticated user with `role=bodega` and `is_staff=False`
- WHEN the user sends POST to `/api/products/`
- THEN the response is 403

#### Scenario: Despacho write rejected

- GIVEN an authenticated user with `role=despacho` and `is_staff=False`
- WHEN the user sends POST to `/api/products/`
- THEN the response is 403

#### Scenario: Unauthenticated read allowed

- GIVEN no authentication
- WHEN the user sends GET to `/api/products/`
- THEN the response is 200 with product list

### Requirement: Staff-Only Category Writes

The system MUST restrict POST, PUT, PATCH, DELETE on category resources to staff users only. Bodega and despacho roles are NOT staff and MUST be denied category writes.

(Previously: any user with `is_staff=True` could write categories)

#### Scenario: Non-staff category write rejected

- GIVEN an authenticated non-staff user
- WHEN the user sends POST to `/api/categories/`
- THEN the response is 403

#### Scenario: Staff category write succeeds

- GIVEN an authenticated staff user
- WHEN the user sends POST to `/api/categories/` with valid data
- THEN the response is 201

#### Scenario: Bodega category write rejected

- GIVEN an authenticated user with `role=bodega` and `is_staff=False`
- WHEN the user sends POST to `/api/categories/`
- THEN the response is 403
