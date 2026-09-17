# Order Integrity Specification

## Purpose

Protect order and cart surfaces from unauthorized mutation. Ensure checkout is atomic with stock re-validation, and cart item updates are validated. This includes regression tests as the first test-bearing capability.

## Requirements

### Requirement: Order and Cart Write Lockdown

The system SHALL return 405 Method Not Allowed for direct PUT, PATCH, DELETE on orders and cart resources, and for bare POST to `/api/orders/`. Only `create_from_cart` action SHALL be permitted to create orders.

#### Scenario: Generic CRUD rejected on orders

- GIVEN an authenticated user with an existing order
- WHEN the user sends PUT, PATCH, or DELETE to `/api/orders/{id}/`
- THEN the response is 405

#### Scenario: Generic CRUD rejected on cart

- GIVEN an authenticated user with a cart
- WHEN the user sends PUT, PATCH, or DELETE to `/api/cart/`
- THEN the response is 405

#### Scenario: Bare POST to orders rejected

- GIVEN an authenticated user
- WHEN the user sends POST directly to `/api/orders/`
- THEN the response is 405

#### Scenario: create_from_cart succeeds

- GIVEN an authenticated user with a non-empty cart and sufficient stock
- WHEN the user sends POST to `/api/orders/create_from_cart/`
- THEN the response is 201 and an order is created

### Requirement: Atomic Checkout with Stock Re-validation

The system SHALL execute checkout within a single atomic transaction. It SHALL re-verify stock availability during checkout, recompute the total from the cart at order time, and roll back entirely on any failure — no partial order or stock decrement.

#### Scenario: Checkout succeeds atomically

- GIVEN an authenticated user with a cart containing items
- WHEN POST `/api/orders/create_from_cart/` with valid shipping data
- THEN order is created, stock is decremented, cart is cleared — all or nothing

#### Scenario: Insufficient stock rolls back

- GIVEN an authenticated user with a cart item for a product with stock=2 and quantity=5 in cart
- WHEN POST `/api/orders/create_from_cart/`
- THEN response is 400, no order exists, stock is unchanged, cart is intact

#### Scenario: Total recomputed from cart

- GIVEN an authenticated user with a cart containing items priced at $10 (qty 2) and $5 (qty 3)
- WHEN POST `/api/orders/create_from_cart/`
- THEN the order total is 35.00, reflecting the cart total at checkout time

### Requirement: Cart Item Update Validation

The system SHALL validate cart item updates via a serializer. Quantity MUST be at least 1. Non-numeric values MUST be rejected. Quantity exceeding available stock MUST be rejected.

#### Scenario: Valid quantity update

- GIVEN an authenticated user with a cart item (product, quantity=2, product stock=10)
- WHEN POST `/api/cart/update_item/` with quantity=4
- THEN cart item quantity is updated to 4

#### Scenario: Quantity below minimum

- GIVEN an authenticated user with a cart item (product, quantity=2)
- WHEN POST `/api/cart/update_item/` with quantity=0
- THEN the response is 400

#### Scenario: Non-numeric quantity

- GIVEN an authenticated user with a cart item
- WHEN POST `/api/cart/update_item/` with quantity="abc"
- THEN the response is 400

#### Scenario: Quantity above stock

- GIVEN an authenticated user with a cart item for a product with stock=3
- WHEN POST `/api/cart/update_item/` with quantity=5
- THEN the response is 400
