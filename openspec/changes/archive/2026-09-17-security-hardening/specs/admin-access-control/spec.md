# Admin Access Control Specification

## Purpose

Remove the guessable default admin URL and gate admin access by an IP allowlist, both env-driven with safe dev defaults.

## Requirements

### Requirement: Env-Driven Admin URL

The Django admin site SHALL be served at the path derived from `DJANGO_ADMIN_URL`, defaulting to `admin/` when unset. The admin path MUST NOT be hard-coded elsewhere.

#### Scenario: Custom admin URL

- GIVEN `DJANGO_ADMIN_URL=backoffice/`
- WHEN a request is made to `/backoffice/`
- THEN the admin site responds and `/admin/` does not

#### Scenario: Default admin URL

- GIVEN `DJANGO_ADMIN_URL` unset
- WHEN a request is made to `/admin/`
- THEN the admin site responds

### Requirement: Env-Driven IP Allowlist

When `ADMIN_ALLOWED_IPS` is set, the system MUST deny admin access from other IPs. When unset (default), admin access MUST be unrestricted.

#### Scenario: Listed IP allowed

- GIVEN `ADMIN_ALLOWED_IPS="203.0.113.5"`
- WHEN a request from 203.0.113.5 reaches the admin site
- THEN access is allowed

#### Scenario: Unlisted IP denied

- GIVEN `ADMIN_ALLOWED_IPS="203.0.113.5"`
- WHEN a request from another IP reaches the admin site
- THEN the response is 403

#### Scenario: Allowlist unset permits access

- GIVEN `ADMIN_ALLOWED_IPS` unset
- WHEN a request from any IP reaches the admin site
- THEN access is allowed (dev default)