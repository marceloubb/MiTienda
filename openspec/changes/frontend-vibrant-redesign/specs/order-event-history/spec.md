# Order Event History Specification

## Purpose

Add a backend per-status event model recording every order status change with an exact server timestamp, and expose the event trail in the order representations used by the tracking UI (D4). Event data is the only source for tracking timestamps.

## Requirements

### Requirement: OrderEvent Model

The system SHALL add an `OrderEvent` model owned by an order (`Order.events`) with fields: `event_type` (`created` | `advanced` | `discrepancy` | `resolved` | `cancelled`), `from_status` (nullable), `to_status`, and `timestamp` (exact DateTime). Events MUST be append-only and ordered by `timestamp` ascending. The `timestamp` MUST be set by the server clock, never supplied by the client.

#### Scenario: Event stores exact transition data

- GIVEN an order advanced from `processing` to `ready`
- WHEN its events are queried
- THEN exactly one `advanced` event exists with from_status `processing`, to_status `ready`, and a server-set timestamp

#### Scenario: Timestamps not client-controlled

- GIVEN a client sends a transition request with a fabricated timestamp field
- WHEN the transition succeeds
- THEN the recorded event timestamp is the server clock value, not the client value

### Requirement: Initial Event on Order Creation

Every order MUST have an initial `created` event with `to_status=pending` and the order's creation timestamp. New orders SHALL record it at creation; existing orders MUST be backfilled by migration from `created_at`, so every order carries a complete trail.

#### Scenario: New order starts with created event

- GIVEN a customer creates an order
- WHEN the order's events are read
- THEN the first event is `created` with to_status `pending` and timestamp equal to `created_at`

#### Scenario: Legacy orders backfilled

- GIVEN orders created before this change with no events
- WHEN the migration runs
- THEN each has a backfilled `created` event from its `created_at`

### Requirement: Events Appended on Transitions

Every status-changing action — advance, discrepancy flag, admin resolve, admin cancel — MUST append the matching event (`advanced` | `discrepancy` | `resolved` | `cancelled`) inside the SAME database transaction as the status change. A failed or rejected transition MUST NOT append an event.

#### Scenario: Forward advance appends event

- GIVEN a bodega user advances an order from `pending` to `processing`
- WHEN the transition commits
- THEN an `advanced` event (pending→processing) exists for the order

#### Scenario: Rejected transition appends nothing

- GIVEN a refused advance (403) on an order
- WHEN the response is returned
- THEN no new event exists for that order

### Requirement: Event Trail Exposed in Order Detail

The customer order representation (`OrderSerializer`) SHALL include an `events` array ordered ascending by timestamp; the staff representation (`StaffOrderSerializer`) SHALL include it too. Each event exposes `event_type`, `from_status`, `to_status`, and `timestamp` (ISO-8601). Customers MUST only see events of their own orders; the existing user-scoped order queryset SHALL enforce this.

#### Scenario: Customer detail carries full timeline

- GIVEN a delivered order with five events
- WHEN a customer GETs `/api/orders/{id}/`
- THEN the payload contains `events` with five ascending entries matching the order's history

#### Scenario: No cross-user event leakage

- GIVEN an order owned by another customer
- WHEN a customer GETs `/api/orders/{id}/`
- THEN the response is 404 (order not visible), with no event data