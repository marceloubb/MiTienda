# Staff Admin UI Specification

## Purpose

Define client-side route guards, role-conditional navigation, and frontend contract for staff operational surfaces. Client guards are UX-only; real enforcement is server-side.

## Requirements

### Requirement: Guarded Operational Routes

The system SHALL serve routes `/admin`, `/admin/orders`, `/admin/staff`, `/bodega`, `/despacho` under the frontend app. Each route tree MUST be wrapped with `RequireRole` checking the authenticated user's `role`. `/admin` SHALL no longer render the combined task mashup; it SHALL redirect admins to `/admin/orders`.

(Previously: served `/admin`, `/bodega`, `/despacho`; `/admin` mixed order management, staff creation, and discrepancy resolution on one page.)

#### Scenario: Admin redirected from /admin

- GIVEN an authenticated user with `role=admin`
- WHEN navigating to `/admin`
- THEN the user is redirected to `/admin/orders`

#### Scenario: Admin accesses order management

- GIVEN an authenticated user with `role=admin`
- WHEN navigating to `/admin/orders`
- THEN the order management view renders with discrepancy resolution

#### Scenario: Bodega accesses /bodega route

- GIVEN an authenticated user with `role=bodega`
- WHEN navigating to `/bodega`
- THEN the bodega dashboard renders

#### Scenario: Despacho accesses /despacho route

- GIVEN an authenticated user with `role=despacho`
- WHEN navigating to `/despacho`
- THEN the despacho dashboard renders

#### Scenario: Customer blocked from admin routes

- GIVEN an authenticated user with `role=customer`
- WHEN navigating to `/admin`, `/admin/orders`, or `/admin/staff`
- THEN the user is redirected to `/` or a not-authorized page

#### Scenario: Bodega blocked from admin and despacho routes

- GIVEN an authenticated user with `role=bodega`
- WHEN navigating to `/admin/orders`, `/admin/staff`, or `/despacho`
- THEN the user is redirected to `/` or a not-authorized page

### Requirement: RequireRole Client Wrapper

The system SHALL provide a `RequireRole` React component that accepts a `roles` prop (array of allowed roles). It MUST read the user's role from auth context and either render children or redirect. This is a UX guard only — all API enforcement is server-side via DRF permissions.

#### Scenario: RequireRole allows matching role

- GIVEN a `RequireRole` with `roles={["admin"]}` and current user has `role=admin`
- WHEN the component renders
- THEN children are rendered

#### Scenario: RequireRole redirects non-matching role

- GIVEN a `RequireRole` with `roles={["bodega"]}` and current user has `role=customer`
- WHEN the component renders
- THEN the user is redirected away

### Requirement: Navbar Role-Conditional Links

The system SHALL display navigation links in the Navbar based on the authenticated user's role. Admin sees staff links for `/admin/orders`, `/admin/staff`, `/bodega`, `/despacho`; bodega sees `/bodega`; despacho sees `/despacho`; customer sees only storefront links.

(Previously: admin links pointed only to `/admin`, `/bodega`, `/despacho`.)

#### Scenario: Admin navbar shows single-task links

- GIVEN an authenticated user with `role=admin`
- WHEN the Navbar renders
- THEN links to `/admin/orders`, `/admin/staff`, `/bodega`, `/despacho` are visible

#### Scenario: Bodega navbar shows bodega links only

- GIVEN an authenticated user with `role=bodega`
- WHEN the Navbar renders
- THEN `/bodega` is visible and `/admin/orders`, `/admin/staff`, `/despacho` are not

#### Scenario: Customer navbar shows no staff links

- GIVEN an authenticated user with `role=customer`
- WHEN the Navbar renders
- THEN no staff links are visible

The `RequireRole Client Wrapper` and `User.role in Frontend Contract` requirements remain unchanged and valid.
### Requirement: User.role in Frontend Contract

The frontend `User` type MUST include a `role` field with values `customer|admin|bodega|despacho`. The auth context MUST expose this field.

#### Scenario: Role available in auth context

- GIVEN an authenticated user
- WHEN the auth context is accessed
- THEN `user.role` is a string matching one of the valid role values
### Requirement: Staff Management View

The system SHALL render staff management as ONE screen at `/admin/staff`: the staff creation form plus a registered-staff summary list sourced from `GET /api/staff/users/`. The summary SHALL refresh to include a user after successful creation.

#### Scenario: Admin sees create form and summary

- GIVEN an authenticated admin on `/admin/staff`
- THEN both the creation form and the summary list render

#### Scenario: Summary reflects a new user

- GIVEN an authenticated admin who creates a bodega user
- WHEN the summary refreshes after creation
- THEN the new user is listed with `role=bodega`

### Requirement: Bodega Inventory View

The system SHALL render on `/bodega` an inventory section showing each product's `stock` from the existing product payload (`getProducts`) and flagging low-stock items. The section SHALL show sales-flow indicators computed in-client from the staff orders payload (`getStaffOrders`); no aggregation endpoint is used. The order-preparation queue SHALL remain on `/bodega`.

#### Scenario: Bodega sees stock levels

- GIVEN an authenticated bodega user and products with stock values
- WHEN `/bodega` renders
- THEN each product's stock is displayed and low-stock items are flagged

#### Scenario: Sales flow computed in-client

- GIVEN staff orders with items
- WHEN `/bodega` renders
- THEN flow indicators derived from the orders payload display without a backend aggregation call
- AND the existing preparation queue still renders

### Requirement: Despacho Route Grouping

The system SHALL render on `/despacho` established routes as groups of orders sharing the same `shipping_city`, derived from existing order data with NO new route model. Per-order advance actions SHALL keep the `order-state-machine` transition scopes.

#### Scenario: Orders grouped by city

- GIVEN orders with `shipping_city` values A and B
- WHEN `/despacho` renders
- THEN orders appear grouped by city with their orders listed per group

#### Scenario: Advance actions unchanged

- GIVEN an authenticated despacho user and a `ready` order inside a city group
- WHEN the user triggers the advance action
- THEN the order transitions within the despacho scope (`ready → shipped`)

