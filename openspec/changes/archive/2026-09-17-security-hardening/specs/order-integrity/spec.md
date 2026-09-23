# Delta for Order Integrity

## ADDED Requirements

### Requirement: Cumulative Stock Check on Add Item

The `add_item` operation MUST validate the sum of the existing cart quantity plus the added quantity against available stock and MUST reject the addition when the cumulative quantity exceeds stock.

#### Scenario: Cumulative addition rejected

- GIVEN a cart item with quantity 3 for a product with stock 5
- WHEN the user adds 3 more of the same product
- THEN the response is 400 and the cart quantity stays 3

#### Scenario: Cumulative addition within stock

- GIVEN a cart item with quantity 2 for a product with stock 5
- WHEN the user adds 2 more of the same product
- THEN the response is 201 and the cart quantity becomes 4

## MODIFIED Requirements

### Requirement: Cart Item Update Validation

The system SHALL validate cart item updates via a serializer. Quantity MUST be at least 1. Non-numeric values MUST be rejected. Quantity exceeding available stock MUST be rejected regardless of whether `product_id` was provided as an integer or as a numeric string.

(Previously: a string `product_id` in the initial data skipped the stock check, letting a numeric string bypass validation after DRF coercion.)

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

#### Scenario: String product_id does not bypass stock

- GIVEN an authenticated user with a cart item for a product with stock=3
- WHEN POST `/api/cart/update_item/` with quantity=5 and `product_id="3"` (string)
- THEN the response is 400