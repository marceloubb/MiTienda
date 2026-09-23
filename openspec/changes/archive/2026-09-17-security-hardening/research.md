# Research: security-hardening

Schema: gentle-ai.sdd-research/v1
Change: security-hardening
Revision: r1
Request ID: sec-hardening-research-2026-09-17-01
Outcome: **blocked**
Store: hybrid (this file + Engram `sdd/security-hardening/research`)

## Request

- change: security-hardening
- requested_source_classes: [documentation, open-web]
- questions: Q1–Q8 (below)

## Admission

- Requested classes: `documentation`, `open-web`
- Observed exact runtime grants: `documentation=[]`, `open-web=[]` (zero granted classes)
- Result: **denied** — admission failed before evidence collection.

The collector is output-only and must not substitute local knowledge, generic MCP
(Context7), persistence channels (Engram), or inherited named tools for evidence.
No claim was produced for any question.

## Questions

- Q1. Token expiry and rotation with DRF authtoken (Token model has no expiry field) without new dependencies — recommended pattern and tradeoffs.
- Q2. Nonce-based CSP in Next.js 16 App Router with streaming/RSC — mechanism and required directives for a SPA calling a separate API origin.
- Q3. TOTP two-factor authentication for a DRF API with TokenAuthentication — recommended integration and enrollment/verification patterns.
- Q4. Safe conditional unique constraint on `User.email` in Django — data-cleanup migration steps and SQLite vs PostgreSQL behavior.
- Q5. Scoped DRF throttling for login/register (ScopedRateThrottle vs AnonRateThrottle vs UserRateThrottle) — recommended rates and default throttle state storage.
- Q6. Env-gated Django production security settings and restricting the Django admin to an IP allowlist.
- Q7. SQLite to PostgreSQL migration for a small Django app using `select_for_update()` — required steps and behavior changes.
- Q8. Next.js App Router (no BFF) to a different-origin Django API: short-lived bearer tokens + refresh vs httpOnly SameSite cookies — tradeoffs and required infrastructure.

## Sources

None — no evidence class was granted; nothing was collected or validated.

## Claims

None — zero claims emitted. Q1–Q8 remain unsupported.

## Gaps

All eight questions are unaddressed. No external evidence exists for this revision.

## Contradictions / Uncertainty / Freshness

Not applicable — no sources were admitted.

## Product Choices (non-authoritative)

None recorded in this research artifact. Product decisions are owned by the
orchestrator and recorded separately in the pre-proposal state.

## Recovery

Re-run `sdd-research` for request `sec-hardening-research-2026-09-17-01` (revision r1)
only under a runtime that actually grants `documentation` or `open-web` and
redeclares the exact grants. Alternatively, revert the research selection to
`unselected` and proceed to `propose` on internal evidence (audit + exploration),
without presenting this artifact as external evidence.
