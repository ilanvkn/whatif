# Changelog

## 2.0.0 — 2026-11-10

- Generate bounded, deduplicated scenario spaces from reviewed campaigns, including second-order fault/context and load/pacing combinations.
- Execute adaptive epochs with deterministic scheduling, separate-trial confirmation, conservative request reservations, stopping rules and a local role ledger.
- Distinguish reproduced failure cases, symptom clusters, flaky outcomes, missing controls, unknown scope and interrupted execution.
- Preserve exact regression cases and compare verified corrected-revision replays; unexecuted cases never count as fixed.
- Record browser request attempts and cap injected-response retries as well as real network requests.
- Propagate cancellation/deadline metadata to the lab so it never starts a subsequent trial after interruption.
- Six new lab tools, 21 MCP tools total. Roles are policies, not separate LLMs; no automatic patching or model spend.

## 1.1.0 — 2026-11-10

- Real optional Playwright and k6 adapters; original synthetic-account security runner.
- Branching campaigns with explicit hypotheses, route allowlists, aggregate budgets, process-group deadlines and hash-indexed evidence.
- Browser form/click/assertions, local status/delay/abort injection, viewport, reduced motion, locale and timezone.
- k6 fixed-request/VU workloads, pacing, per-route thresholds and observed metric summaries; no cloud output.
- Owner/other/anonymous GET controls with canary checks and environment-only credential references.
- Verified campaign comparison and 16 scenario cards labeled executable or planning-only; 15 MCP tools total.
- Fixed a discovered browser redirect escape by fetching without redirects and rejecting redirect responses before delivery.
- Qualified failure/correction fixture and controls for budget, cancellation, credential redaction and corrupted evidence.

## 1.0.0 — 2026-11-10

- Nine CLI/MCP capabilities, adding workload sensitivity, suite planning/execution/verification and verified comparisons.
- Baseline, parallel and recovery measurements with 500-request aggregate limit, 120-second aggregate probe budgets, one loopback target and default stop-on-failure.
- Per-route p50/p95/p99, maximum header latency, error/status counts and failed-request evidence IDs. Every route must meet the reviewed thresholds; aggregate statistics cannot mask failures.
- Reject duplicate routes and request budgets that cannot cover every route.
- Comparison verifies both cases and rejects configuration/evaluator-version mismatches as incomparable. Labels single-sample SLO transitions without claiming statistical performance significance.
- k6 smoke export respects reviewed timeout and duration instead of hardcoded values.
- Versioned local upgrade staging and marketplace backup preserve the prior installation source.
- V0.1 evidence remains verifiable; rerun for per-route V1 qualification.

Still outside built-in execution: distributed capacity, authenticated browser journeys, active exploits, fault injection, model-driven agents, external targets and cloud provisioning.

## 0.1.0 — 2026-11-07

Initial local release: scenario modeling, bounded loopback probes, source heuristics, evidence verification and k6 smoke preparation.
