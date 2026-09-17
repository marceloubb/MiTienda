# Order Discrepancy Specification

## Purpose

Allow bodega users to flag orders with discrepancies (missing or damaged items), block those orders from normal flow, and require admin resolution before the order can proceed.

## Requirements

### Requirement: Bodega Discrepancy Flag

The system SHALL allow bodega users to mark an order with a discrepancy via `POST /api/staff/orders/{id}/discrepancy/` with a `reason` field (missing|damaged). The order MUST transition to the `discrepancy` status — a valid, lateral blocked status that is not part of the forward happy path (`pending → processing → ready → shipped → delivered`) — and be blocked from normal state-machine transitions.

#### Scenario: Bodega flags order as damaged

- GIVEN an order in `processing` status and a user with `role=bodega`
- WHEN POST `/api/staff/orders/{id}/discrepancy/` with `reason="damaged"`
- THEN the order status becomes `discrepancy`

#### Scenario: Bodega flags order as missing

- GIVEN an order in `pending` status and a user with `role=bodega`
- WHEN POST `/api/staff/orders/{id}/discrepancy/` with `reason="missing"`
- THEN the order status becomes `discrepancy`

#### Scenario: Despacho cannot flag discrepancy

- GIVEN an order in `ready` status and a user with `role=despacho`
- WHEN POST `/api/staff/orders/{id}/discrepancy/`
- THEN the response is 403

### Requirement: Discrepancy Blocks Normal Flow

The system SHALL prevent any state-machine transition on an order with `discrepancy` status, except admin cancel or admin resolve. Advance and discrepancy endpoints MUST reject discrepancy-status orders.

#### Scenario: Bodega cannot advance discrepancy order

- GIVEN an order in `discrepancy` status and a user with `role=bodega`
- WHEN POST `/api/staff/orders/{id}/advance/`
- THEN the response is 403

#### Scenario: Despacho cannot advance discrepancy order

- GIVEN an order in `discrepancy` status and a user with `role=despacho`
- WHEN POST `/api/staff/orders/{id}/advance/`
- THEN the response is 403

#### Scenario: Admin can cancel discrepancy order

- GIVEN an order in `discrepancy` status and a user with `role=admin`
- WHEN POST `/api/staff/orders/{id}/cancel/`
- THEN the order status becomes `cancelled` and stock is restored

### Requirement: Admin Resolution

The system SHALL allow admin users to resolve a discrepancy via `POST /api/staff/orders/{id}/resolve-discrepancy/`. Resolution MUST return the order to its pre-discrepancy status (the status before `discrepancy` was set). Admin MAY adjust stock via the existing product PATCH flow before resolving.

#### Scenario: Admin resolves discrepancy on processing order

- GIVEN an order that was `processing` before discrepancy, now in `discrepancy` status, and admin user
- WHEN POST `/api/staff/orders/{id}/resolve-discrepancy/`
- THEN the order status returns to `processing`

#### Scenario: Admin resolves discrepancy on pending order

- GIVEN an order that was `pending` before discrepancy, now in `discrepancy` status, and admin user
- WHEN POST `/api/staff/orders/{id}/resolve-discrepancy/`
- THEN the order status returns to `pending`

#### Scenario: Non-admin cannot resolve

- GIVEN an order in `discrepancy` status and a user with `role=bodega`
- WHEN POST `/api/staff/orders/{id}/resolve-discrepancy/`
- THEN the response is 403

### Requirement: Discrepancy Surfaced to Admin

The system SHALL include discrepancy-status orders in the admin staff order viewset and SHALL expose the discrepancy `reason` field.

#### Scenario: Admin sees discrepancy orders in list

- GIVEN orders including some with `discrepancy` status
- WHEN admin GET `/api/staff/orders/`
- THEN discrepancy orders appear in the list with `reason` visible
