# Security Headers Specification

## Purpose

Apply a nonce-based Content-Security-Policy and standard security headers to all frontend responses, disable `X-Powered-By`, and document the deployment checklist for the new security environment variables.

## Requirements

### Requirement: Nonce-Based CSP

All HTML responses MUST include a Content-Security-Policy with a per-request nonce for inline scripts. `script-src` MUST NOT include `'unsafe-inline'`.

#### Scenario: Nonced inline script executes

- GIVEN an HTML response carrying an inline script with the page's nonce
- WHEN the browser enforces the CSP
- THEN the script executes

#### Scenario: Unnonced inline script blocked

- GIVEN an HTML response with an inline script without a valid nonce
- WHEN the browser enforces the CSP
- THEN the script is blocked

### Requirement: Frame Ancestors Denied

The CSP MUST include `frame-ancestors 'none'`.

#### Scenario: Framing blocked

- GIVEN an HTML response with `frame-ancestors 'none'`
- WHEN a third-party site tries to embed the page in an iframe
- THEN the browser blocks the frame

### Requirement: Standard Security Headers

All responses MUST include `X-Content-Type-Options: nosniff`, a `Referrer-Policy`, and a `Permissions-Policy`.

#### Scenario: Headers present

- GIVEN a response from the frontend
- WHEN the response headers are inspected
- THEN it carries nosniff, Referrer-Policy, and Permissions-Policy

### Requirement: Powered-By Disabled

Responses MUST NOT include the `X-Powered-By` header.

#### Scenario: No powered-by leak

- GIVEN a response from the frontend
- WHEN the response headers are inspected
- THEN `X-Powered-By` is absent

### Requirement: Deployment Checklist

The repository SHALL include a deployment checklist documenting all new security environment variables and their production values.

#### Scenario: Checklist is current

- GIVEN the deployment checklist document
- WHEN a deployer follows it
- THEN every new security env var (token TTL, secure mode, admin allowlist, 2FA gate) is listed with its production value