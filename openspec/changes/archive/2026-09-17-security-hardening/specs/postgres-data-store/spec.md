# PostgreSQL Data Store Specification

## Purpose

Move the production data store from SQLite to PostgreSQL: psycopg-backed connectivity driven by `DATABASE_URL`, a clean migration path for existing data, and preserved lock semantics for atomic checkout and cancel.

## Requirements

### Requirement: PostgreSQL Backend

The system MUST connect through the PostgreSQL backend (psycopg) when `DATABASE_URL` specifies a `postgres://` URI and SHOULD keep the SQLite dev default when it does not. `psycopg[binary]` SHALL be the PostgreSQL driver.

#### Scenario: Postgres connection

- GIVEN `DATABASE_URL=postgres://user:pass@host:5432/mitienda`
- WHEN Django starts and runs a query
- THEN the query executes against PostgreSQL via psycopg

#### Scenario: Dev default preserved

- GIVEN no `postgres://` `DATABASE_URL`
- WHEN Django starts in a dev environment
- THEN the existing SQLite database is used

### Requirement: Data Migration Path

The project MUST provide a documented procedure to migrate existing SQLite data into PostgreSQL without loss, and `manage.py migrate` SHALL run cleanly against the PostgreSQL backend.

#### Scenario: Data migrated cleanly

- GIVEN a populated SQLite database and the documented migration procedure
- WHEN the procedure is executed against a fresh PostgreSQL instance
- THEN all rows are present in PostgreSQL and migrate completes without error

### Requirement: Lock Semantics Preserved

Atomic checkout and cancel SHALL keep their `select_for_update` semantics under PostgreSQL. Concurrent operations MUST NOT oversell stock.

#### Scenario: Concurrent checkout does not oversell

- GIVEN a product with stock=1 and two concurrent checkouts for quantity 1
- WHEN both requests race under PostgreSQL
- THEN exactly one checkout succeeds and the other is rejected