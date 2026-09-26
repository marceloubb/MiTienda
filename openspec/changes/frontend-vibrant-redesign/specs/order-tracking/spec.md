# Order Tracking Specification

## Purpose

Add the customer route `GET /orders/[id]` combining a 5-step delivery timeline (from order events) and a delivered-order detail (items, shipping, payment, re-buy). Every rendered value comes from real backend data (D4); features without backend support are explicitly cut, never fabricated.

## Requirements

### Requirement: Tracking Route with 5-Step Timeline

`/orders/[id]` (customer) MUST render a 5-step timeline — Orden Recibida, Preparando en Bodega, Lista para Despacho, En Reparto, Entregada — mapped from `pending`, `processing`, `ready`, `shipped`, `delivered`, derived from the order's `events` via the existing `getOrder` client. Reached steps MUST show their exact event timestamps; the current-status step MUST be marked active; future steps MUST render pending without timestamps. The route MUST reuse `getOrder` (user-scoped) and redirect or 404 when the order is not the current user's.

#### Scenario: Delivered order shows five reached steps

- GIVEN a delivered order with events for all five statuses
- WHEN the owner opens `/orders/[id]`
- THEN all five steps render completed with their event timestamps
- AND the last step is marked active

#### Scenario: In-flight order shows partial timeline

- GIVEN an order currently `shipped` with three events
- WHEN the owner opens `/orders/[id]`
- THEN steps 1–3 render completed with timestamps, step 4 renders active, step 5 renders pending without a timestamp

#### Scenario: Foreign order not visible

- GIVEN a customer opens `/orders/{id}` for another user's order
- WHEN the page loads
- THEN the customer is redirected to their order list

### Requirement: Delivered Detail

When `status=delivered`, the page MUST additionally show order items (product name, quantity, unit price, subtotal), shipping information (name, address, city, postal code, phone), payment method, order total, and a re-buy action. Re-buy MUST add each item's product back to the cart through the existing add-to-cart API; products no longer active MUST be skipped with a visible notice.

#### Scenario: Delivered detail rendered fully

- GIVEN a delivered order
- WHEN the owner opens `/orders/[id]`
- THEN items, shipping, payment method, and total render below the timeline

#### Scenario: Re-buy skips inactive products

- GIVEN a delivered order whose items include a deactivated product
- WHEN the user clicks re-buy
- THEN the active products are added to the cart and a notice names the skipped one

#### Scenario: Re-buy adds all items

- GIVEN a delivered order with two active products
- WHEN the user clicks re-buy
- THEN the cart contains both products at the ordered quantities

### Requirement: Non-Happy-Path Status Rendering

Orders in `cancelled` or `discrepancy` status MUST NOT show false progress: the timeline MUST highlight only steps backed by events, and the terminal state MUST render with the error/destructive token and its exact event timestamp (cancelled event or discrepancy event).

#### Scenario: Cancelled order stops the timeline

- GIVEN a cancelled order with events through `processing` plus a `cancelled` event
- WHEN the owner opens `/orders/[id]`
- THEN steps 1–2 render completed, a cancellation marker shows the exact cancel timestamp, and no later step renders reached

### Requirement: Explicitly Cut Tracking Features

The page MUST NOT render courier identity, live location, ETA or delivery time windows, tax documents (boleta/factura), reviews, or coupon lines: no backend data exists for them (honest-data red line D1) and they are deferred to future changes.

#### Scenario: No fabricated tracking data

- GIVEN a shipped order with no courier data
- WHEN the owner opens `/orders/[id]`
- THEN no ETA, map, courier card, or tax document renders
- AND no segment of the page shows a value with no backing backend field