# Order State Machine Specification

## Purpose

Define the `ready` status, role-scoped order transitions with row locking, admin-only cancel with stock restore, and unauthorized-transition rejection.

## Requirements

### Requirement: Ready Status

The system SHALL add a `ready` status value ("Listo para despacho") to the Order model. The full valid status set is `pending`, `processing`, `ready`, `shipped`, `delivered`, `cancelled` plus `discrepancy` as a lateral blocked status: not part of the forward happy path (`pending → processing → ready → shipped → delivered`), but a valid status value entered only via the bodega discrepancy flag and left only by admin cancel or admin resolve.

#### Scenario: Order reaches ready

- GIVEN an order in `processing` status
- WHEN a bodega user advances it via the staff endpoint
- THEN status becomes `ready`

### Requirement: Bodega Transition Scope

The system SHALL allow bodega users to advance orders through: `pending → processing → ready`. Orders in `discrepancy` status MUST NOT be advanced by bodega — the advance endpoint SHALL reject them. Transitions MUST use `select_for_update()` to prevent race conditions.

#### Scenario: Bodega advances pending to processing

- GIVEN an order in `pending` status and a user with `role=bodega`
- WHEN POST `/api/staff/orders/{id}/advance/`
- THEN status becomes `processing`

#### Scenario: Bodega advances processing to ready

- GIVEN an order in `processing` status and a user with `role=bodega`
- WHEN POST `/api/staff/orders/{id}/advance/`
- THEN status becomes `ready`

#### Scenario: Bodega cannot advance ready to shipped

- GIVEN an order in `ready` status and a user with `role=bodega`
- WHEN POST `/api/staff/orders/{id}/advance/`
- THEN the response is 403

#### Scenario: Bodega cannot skip a state

- GIVEN an order in `pending` status and a user with `role=bodega`
- WHEN POST `/api/staff/orders/{id}/advance/` targeting `ready`
- THEN the response is 403

### Requirement: Despacho Transition Scope

The system SHALL allow despacho users to advance orders through: `ready → shipped → delivered`. Orders in `discrepancy` status MUST NOT be advanced by despacho — the advance endpoint SHALL reject them. Transitions MUST use `select_for_update()`.

#### Scenario: Despacho advances ready to shipped

- GIVEN an order in `ready` status and a user with `role=despacho`
- WHEN POST `/api/staff/orders/{id}/advance/`
- THEN status becomes `shipped`

#### Scenario: Despacho advances shipped to delivered

- GIVEN an order in `shipped` status and a user with `role=despacho`
- WHEN POST `/api/staff/orders/{id}/advance/`
- THEN status becomes `delivered`

#### Scenario: Despacho cannot advance pending orders

- GIVEN an order in `pending` status and a user with `role=despacho`
- WHEN POST `/api/staff/orders/{id}/advance/`
- THEN the response is 403

### Requirement: Admin May Also Advance

The system SHALL allow admin users to perform any transition that bodega or despacho may perform, in addition to cancel. Admin advance is subject to the same `discrepancy` block: a discrepancy-status order MAY only be cancelled or resolved by admin, never advanced.

#### Scenario: Admin advances pending to processing

- GIVEN an order in `pending` status and a user with `role=admin`
- WHEN POST `/api/staff/orders/{id}/advance/`
- THEN status becomes `processing`

### Requirement: Admin Cancel with Stock Restore

The system SHALL allow admin users to cancel an order at any status except `cancelled` and `delivered`, including `discrepancy`. Cancel MUST atomically restore stock for all order items and set status to `cancelled`. This MUST use `select_for_update()`.

#### Scenario: Admin cancels pending order

- GIVEN an order in `pending` status with items (product A qty 2, product B qty 1) and admin user
- WHEN POST `/api/staff/orders/{id}/cancel/`
- THEN status is `cancelled`, stock for A and B is restored by 2 and 1 respectively

#### Scenario: Admin cancels shipped order

- GIVEN an order in `shipped` status
- WHEN POST `/api/staff/orders/{id}/cancel/` by admin
- THEN status is `cancelled` and stock is restored

#### Scenario: Admin cancels discrepancy order

- GIVEN an order in `discrepancy` status
- WHEN POST `/api/staff/orders/{id}/cancel/` by admin
- THEN status is `cancelled` and stock is restored

#### Scenario: Non-admin cannot cancel

- GIVEN an order in `processing` status and a user with `role=bodega`
- WHEN POST `/api/staff/orders/{id}/cancel/`
- THEN the response is 403

#### Scenario: Cannot cancel delivered order

- GIVEN an order in `delivered` status and admin user
- WHEN POST `/api/staff/orders/{id}/cancel/`
- THEN the response is 400

#### Scenario: Cannot cancel already cancelled order

- GIVEN an order in `cancelled` status and admin user
- WHEN POST `/api/staff/orders/{id}/cancel/`
- THEN the response is 400

### Requirement: Unauthorized Transition Rejection

The system SHALL return 403 for any transition the requesting user's role is not permitted to perform.

#### Scenario: Customer cannot advance orders

- GIVEN an authenticated user with `role=customer`
- WHEN POST `/api/staff/orders/{id}/advance/`
- THEN the response is 403
