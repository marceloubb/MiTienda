# API Throttling Specification

## Purpose

Neutralize the account-enumeration oracle and brute-force risk on the authentication surface with scoped DRF throttles that require no new dependencies.

## Requirements

### Requirement: Scoped Throttles on Register and Login

The system MUST throttle the register endpoint at 5 requests per hour per client and the login endpoint at 10 requests per minute per client, using DRF scoped throttles. Exceeded limits MUST return 429.

#### Scenario: Register limit exceeded

- GIVEN a client that has made 5 register attempts within the hour
- WHEN the client sends a 6th register request
- THEN the response is 429

#### Scenario: Login limit exceeded

- GIVEN a client that has made 10 login attempts within the minute
- WHEN the client sends an 11th login request
- THEN the response is 429

#### Scenario: Within limits succeeds

- GIVEN a client under the register and login limits
- WHEN the client calls register or login
- THEN the response is 201 or 200 respectively

### Requirement: Throttling Applies Regardless of Payload Validity

Throttle counting SHALL occur before payload validation so invalid and valid attempts consume the same budget.

#### Scenario: Invalid attempts still count

- GIVEN a client sending repeated login requests with wrong credentials
- WHEN the client exceeds the login limit
- THEN the response is 429 (the oracle is not reachable past the limit)