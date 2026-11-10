# WhatIF implementation and next steps

V1.0 delivers a repeatable local testing core. It is not the full original ambition of automatically testing an application at one million simultaneous users from all perspectives.

Implemented: inspect declared workload, preserve ambiguity, run bounded GET checks, diagnose routes, exercise serial/parallel/repeat conditions, stop on failure, compare verified runs, preserve evidence and prepare a k6 smoke test.

Next integrations, in order:

1. Application discovery: review source to suggest endpoints/journeys and expose confidence; never automatically run inferred side-effecting routes.
2. Browser journey adapter: separately installed Playwright with synthetic fixtures, success assertions, bounded duration, cleanup and redacted traces.
3. Load adapter: qualify a pinned k6 release, explicit arrival schedules and generator/server telemetry, request/VU/time/cost ceilings and cancellation. Pilot before distributed execution.
4. Security adapter: source-informed tenant/auth tests using synthetic accounts, bounded requests, evidence redaction and cleanup. Semgrep leads and ZAP findings retain their own proof labels.
5. Resilience adapter: explicit dependency fault injection only in a disposable environment with independent recovery verification.
6. Behavioral simulation: compare MiroFish/OASIS or TinyTroupe hypotheses against observed user data. Agent consensus is never a calibrated probability.

Each integration needs a version/license record, input/output contract, installation detection, data destinations, cancellation and failure tests, and a fixture demonstrating both a caught failure and a passing correction. Reference clones are research, not implemented adapters.
