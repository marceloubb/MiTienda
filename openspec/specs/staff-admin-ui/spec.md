# Staff Admin UI Specification

## Purpose

Define client-side route guards, role-conditional navigation, and frontend contract for staff operational surfaces. Client guards are UX-only; real enforcement is server-side.

## Requirements

### Requirement: Guarded Operational Routes

The system SHALL serve routes `/admin`, `/bodega`, `/despacho` under the frontend app. Each route tree MUST be wrapped with a `RequireRole` component that checks the authenticated user's `role` field.

#### Scenario: Admin accesses /admin route

- GIVEN an authenticated user with `role=admin`
- WHEN navigating to `/admin`
- THEN the admin dashboard renders

#### Scenario: Bodega accesses /bodega route

- GIVEN an authenticated user with `role=bodega`
- WHEN navigating to `/bodega`
- THEN the bodega dashboard renders

#### Scenario: Customer blocked from /admin

- GIVEN an authenticated user with `role=customer`
- WHEN navigating to `/admin`
- THEN the user is redirected to `/` or a not-authorized page

#### Scenario: Bodega blocked from /despacho

- GIVEN an authenticated user with `role=bodega`
- WHEN navigating to `/despacho`
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

The system SHALL display navigation links in the Navbar based on the authenticated user's role. Admin sees all staff links; bodega sees bodega link; despacho sees despacho link; customer sees only storefront links.

#### Scenario: Admin navbar shows all staff links

- GIVEN an authenticated user with `role=admin`
- WHEN the Navbar renders
- THEN links to `/admin`, `/bodega`, `/despacho` are all visible

#### Scenario: Customer navbar shows no staff links

- GIVEN an authenticated user with `role=customer`
- WHEN the Navbar renders
- THEN no links to `/admin`, `/bodega`, `/despacho` are visible

### Requirement: User.role in Frontend Contract

The frontend `User` type MUST include a `role` field with values `customer|admin|bodega|despacho`. The auth context MUST expose this field.

#### Scenario: Role available in auth context

- GIVEN an authenticated user
- WHEN the auth context is accessed
- THEN `user.role` is a string matching one of the valid role values
