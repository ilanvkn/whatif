# Changelog

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
