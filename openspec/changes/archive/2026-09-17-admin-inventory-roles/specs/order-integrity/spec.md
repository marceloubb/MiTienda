# Delta for Order Integrity

## ADDED Requirements

### Requirement: Atomic Cancel with Stock Restore

The system SHALL provide an admin-only cancel path that atomically restores stock for all order items and sets order status to `cancelled`. This MUST be consistent with the existing atomic checkout behavior — no partial stock restore on failure. Cancel MUST use `select_for_update()` on the order row.

#### Scenario: Cancel restores all stock atomically

- GIVEN an order with items (product A qty 2, product B qty 3) and sufficient order stock
- WHEN admin triggers cancel
- THEN stock for A increases by 2, stock for B increases by 3, order status is `cancelled` — all or nothing

#### Scenario: Cancel is independent of checkout decrement

- GIVEN checkout decremented stock atomically at order creation
- WHEN admin cancels the order
- THEN stock is restored to pre-checkout levels for those items (full restore, not timing-dependent)

#### Scenario: Cancel does not affect other orders

- GIVEN two orders both containing product A
- WHEN admin cancels order 1
- THEN only order 1's stock is restored; order 2 is unaffected
