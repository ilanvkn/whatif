# V1 capability and integration contract

## Implemented and tested

| Capability | Execution | Evidence |
|---|---|---|
| Scenario/workload planning | Original Node runtime and MCP | Plan, illustrative workload math, security matrix |
| Loopback HTTP smoke | Original capped runner | Status/header observations and response-header latency |
| Source review leads | Original bounded heuristic scanner | File digest, relative path, line and rule |
| Evidence integrity | Original verifier | Fresh-process hash checks; corruption rejection |
| k6 smoke preparation | Generated script | Requires separate installed k6 and exact target acknowledgement; not executed by the core |
| Host workflow | Skill and MCP | Plan/run/verify integration tested; local Codex install qualified separately |

## Reference engines, not bundled runtime integrations

The following repositories are cloned for study. Their execution environments have not been installed or qualified as part of WhatIF V1. This distinction is deliberate: source availability does not mean interchangeable APIs, compatible licenses, or valid outputs.

| Area | Candidates | Integration gate |
|---|---|---|
| Document/web evidence | Docling, Scrapling, Crawl4AI, Local Deep Research | Source spans, timestamps, provenance; controlled collection and extraction benchmark |
| Social/persona simulation | MiroFish, OASIS, TinyTroupe, AgentSociety | Fixed population, model identity, repeatability and held-out validation |
| Statistical/causal models | Mesa, DoWhy, NeuralForecast, Metaculus forecasting-tools | Question-specific assumptions, numerical baselines and scoring |
| Memory/observability/durable execution | Graphiti, Langfuse, Temporal | Data-destination review, explicit schema, cancellation and recovery proof |
| Load | k6, Locust | Qualified generator, budgets, allowed target/paths, server telemetry and dropped-work accounting |
| Security | Semgrep, ZAP | Reviewed rules/scope, synthetic data, passive/active distinction, reproduced evidence |
| Watchlist/research only | DeepAgentForecast, claude-mem, t3code, impeccable, Kronos | No automatic integration merely because a project is popular |

## Adapter contract for the next release

Each adapter must declare name, version, license scope, availability, required secrets by locator only, target scope, possible side effects, budget dimensions, cancellation behavior and output format. It receives a reviewed scenario and run ID, returns raw artifact paths and normalized observations, and never silently converts a forecast into measured behavior.

Required observations: timestamp, artifact identity, exact workload actually performed, success/failure counts, relevant timing units, skipped/dropped work and unresolved limitations. A tool unavailable or stopped early must return partial/unexecuted status. The report must preserve that status.

No connector uploads application source or case artifacts automatically. User authorization for a test does not imply publication of its data. Preserve upstream notices when future adapters incorporate actual third-party code.
