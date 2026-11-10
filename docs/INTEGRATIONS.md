# Integration status — 1.1.0

| Capability | Status | What executes |
|---|---|---|
| Original local smoke | Implemented | Literal-loopback GET status/header checks, source leads, verified suites |
| Browser journeys | Implemented optional adapter | Isolated Playwright browser, declarative actions/assertions, exact origin/path/method scope |
| Browser counterfactuals | Implemented | Local response abort/delay/error; viewport, locale, timezone and reduced-motion contexts |
| Actual k6 load | Implemented optional adapter | Fixed total GET requests across bounded VUs, pacing, duration, route thresholds and metrics |
| Synthetic security boundaries | Implemented | Anonymous denial and owner/other-account GET checks with a positive-control marker |
| Campaign comparison | Implemented | Verified per-branch transitions with campaign/engine compatibility gates |
| Branch exploration | Implemented planning catalog | 16 cards, each labeled executable or planning-only |
| Semgrep / ZAP | Not integrated | Existing source heuristics are not these engines |
| Distributed load / open-arrival RPS | Not integrated | Requires generator topology, telemetry, cost/traffic limits and cancellation |
| Transaction races / real fault injection | Not integrated | Requires application-specific ledger assertions, cleanup and recovery |
| MiroFish / OASIS / TinyTroupe | Not integrated | Research references only; no persona execution |
| Causal / forecasting / event simulation | Not integrated | Requires data, assumptions and validation |

See [engine guide](ENGINE-GUIDE.md) for concrete schemas and limitations and [branching experiments](BRANCHING-EXPERIMENTS.md) for scenario design.

Playwright and k6 remain separately installed tools with their own licenses. WhatIF's adapters are original code; neither upstream source nor browser executables are copied into this repository. Qualification uses the recorded local versions, not an assertion that all future releases work.

## V2 adaptive layer

V2 adds lab planning/inspection, multi-epoch execution, nested verification, exact regression-pack replay and verified lab comparison. The generator derives candidates from reviewed campaign contracts; the old cards are examples. Red/user/tester/critic/blue responsibilities are implemented as deterministic policies and artifacts. See [V2 lab guide](V2-LAB.md) for concrete limits and non-capabilities. There are now 21 MCP tools.
