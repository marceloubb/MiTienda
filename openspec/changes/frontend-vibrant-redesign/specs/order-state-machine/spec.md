# Delta for order-state-machine

## ADDED Requirements

### Requirement: Transitions Append Timestamped Events

Every successful status-changing action — bodega/despacho/admin advance, bodega/admin discrepancy flag, and admin resolve — MUST append a matching `OrderEvent` (`advanced` | `discrepancy` | `resolved`) inside the SAME transaction as the status change, with exact server timestamps and correct from/to status values (event model per the order-event-history spec). A rejected or failed transition MUST NOT append an event.

#### Scenario: Advance appends advanced event

- GIVEN an order in `pending` and a bodega user
- WHEN POST `/api/staff/orders/{id}/advance/`
- THEN status becomes `processing` and an `advanced` event (pending→processing) is appended atomically

#### Scenario: Discrepancy flag appends event

- GIVEN an order in `processing` and a bodega user
- WHEN POST `/api/staff/orders/{id}/discrepancy/` with `reason="damaged"`
- THEN status becomes `discrepancy` and a `discrepancy` event (processing→discrepancy) is appended

#### Scenario: Resolve appends event

- GIVEN a discrepancy order that was `processing` before the flag and an admin
- WHEN POST `/api/staff/orders/{id}/resolve-discrepancy/`
- THEN status returns to `processing` and a `resolved` event (discrepancy→processing) is appended

#### Scenario: Rejected advance appends nothing

- GIVEN an order in `pending` and a despacho user
- WHEN POST `/api/staff/orders/{id}/advance/`
- THEN the response is 403 and no event is appended

## MODIFIED Requirements

### Requirement: Admin Cancel with Stock Restore

The system SHALL allow admin users to cancel an order at any status except `cancelled` and `delivered`, including `discrepancy`. Cancel MUST atomically restore stock for all order items, set status to `cancelled`, and append a `cancelled` event with an exact server timestamp (`from_status` = prior status). This MUST use `select_for_update()`.

(Previously: cancel restored stock and set status to cancelled without recording an event.)

#### Scenario: Admin cancels pending order

- GIVEN an order in `pending` status with items (product A qty 2, product B qty 1) and admin user
- WHEN POST `/api/staff/orders/{id}/cancel/`
- THEN status is `cancelled`, stock for A and B is restored by 2 and 1 respectively, and a `cancelled` event (pending→cancelled) is appended

#### Scenario: Admin cancels shipped order

- GIVEN an order in `shipped` status
- WHEN POST `/api/staff/orders/{id}/cancel/` by admin
- THEN status is `cancelled`, stock is restored, and a `cancelled` event (shipped→cancelled) is appended

#### Scenario: Admin cancels discrepancy order

- GIVEN an order in `discrepancy` status
- WHEN POST `/api/staff/orders/{id}/cancel/` by admin
- THEN status is `cancelled`, stock is restored, and a `cancelled` event (discrepancy→cancelled) is appended

#### Scenario: Non-admin cannot cancel

- GIVEN an order in `processing` status and a user with `role=bodega`
- WHEN POST `/api/staff/orders/{id}/cancel/`
- THEN the response is 403 and no event is appended

#### Scenario: Cannot cancel delivered order

- GIVEN an order in `delivered` status and admin user
- WHEN POST `/api/staff/orders/{id}/cancel/`
- THEN the response is 400 and no event is appended

#### Scenario: Cannot cancel already cancelled order

- GIVEN an order in `cancelled` status and admin user
- WHEN POST `/api/staff/orders/{id}/cancel/`
- THEN the response is 400 and no event is appended