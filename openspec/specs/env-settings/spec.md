# Environment Settings Specification

## Purpose

Fail early when the server is started in production mode (DEBUG=False) with the development placeholder SECRET_KEY. All other env-driven settings with dev-safe defaults are already implemented and out of scope.

## Requirements

### Requirement: ImproperlyConfigured Guard

The system MUST raise `ImproperlyConfigured` on startup when `DJANGO_DEBUG=False` and `DJANGO_SECRET_KEY` is the development placeholder default. The guard SHALL NOT fire when `DJANGO_DEBUG=True`.

#### Scenario: Production with placeholder key

- GIVEN DJANGO_DEBUG=False and DJANGO_SECRET_KEY unset (placeholder default used)
- WHEN Django starts
- THEN `ImproperlyConfigured` is raised

#### Scenario: Production with real key

- GIVEN DJANGO_DEBUG=False and DJANGO_SECRET_KEY="a-real-secret-key-value"
- WHEN Django starts
- THEN startup proceeds normally

#### Scenario: Debug mode with placeholder key

- GIVEN DJANGO_DEBUG=True and DJANGO_SECRET_KEY unset
- WHEN Django starts
- THEN startup proceeds normally (dev mode, no guard)
