# Provenance and extraction decisions

The WhatIF runtime, tests, installer and skill text are newly authored. No upstream application code is vendored. MIT applies to these original files only. Source clones remain separately licensed and stored outside the release tree. See upstream-manifest.json for exact commits, license-file hashes and checkout status.

## Source-backed lessons applied

- **MiroFish** `backend/app/services/simulation_runner.py`: explicit lifecycle and stored run state are necessary. V1 uses exclusive run directories and a final evidence index; interrupted cases cannot masquerade as completed or silently replay.
- **MiroFish CLI** `app/cli.py`, `_generate_verdict`: a model-generated confidence value is not calibration. V1 reports no invented confidence number and separates projection from measurement.
- **TinyTroupe** `tinytroupe/control.py`, `validation/simulation_validator.py`: replay and empirical validation should be distinct capabilities. V1 independently verifies saved evidence; it does not claim TinyTroupe simulation replay.
- **AgentSociety v2** `storage/replay_sink.py`, `replay_reader.py`: preserve event artifacts that can be inspected without the original service. V1 keeps portable JSON records and a standalone verifier.
- **Docling** `docling/document_converter.py`, DocumentConverter: conversion should have an explicit document interface rather than ad hoc text concatenation. Future adapter, not bundled.
- **Scrapling** `scrapling/spiders/checkpoint.py`: atomic checkpoint replacement is useful. Its checkpoint loader uses pickle; WhatIF does not import arbitrary checkpoint objects and uses JSON. This is a design choice, not a claim of a remotely exploitable Scrapling flaw.
- **Crawl4AI** `crawl4ai/async_webcrawler.py`: explicit cache modes matter for fresh versus replayed evidence. Future collector should record cache/fetch time.
- **Mesa** `mesa/model.py`: random generators are model state. A fixed population label is not reproducibility.
- **DoWhy** `dowhy/causal_model.py`: identification, estimation and refutation are separate stages. WhatIF should not treat a scenario narrative as causal evidence.
- **NeuralForecast** `neuralforecast/core.py`, cross_validation: time-series evaluation needs proper splits; it is not interchangeable with social agent agreement.
- **Metaculus forecasting-tools** `ai_models/resource_managers/monetary_cost_manager.py`: the source explicitly notes that parallel calls can exceed a budget when costs register after completion. WhatIF reserves each request slot synchronously before dispatch. Future monetary adapters must reserve estimated cost, then reconcile actual usage.
- **Graphiti** `graphiti_core/edges.py`: valid/invalid/expired time semantics matter. Future evidence memory should distinguish when a claim held from when it was recorded.
- **Langfuse** root LICENSE and ee/LICENSE: repository licenses differ by subtree. No enterprise components were imported.
- **k6** official constant-arrival-rate documentation: arrival rate and VUs answer different questions. Generated smoke script does not claim open-model load capacity.

These are focused source inspections, not exhaustive audits of every file or execution of the external engines. README claims, source mechanisms and tested runtime results remain separate evidence levels.

## License handling

MiroFish and its inspected forks are AGPL-3.0. The earlier survey found permissive licenses in several libraries, but every future incorporation must preserve the relevant actual notices and dependency terms. Langfuse has a mixed licensing boundary. Reference clones are not republished as part of WhatIF and are not relicensed by this repository.

## Additional inspected references

- Local Deep Research's `src/local_deep_research/database/models/citation.py` separates deduplicated paper metadata from appearances in research results. WhatIF's future evidence collector should retain both source identity and use context rather than duplicating a document for every claim.
- Locust's `locust/shape.py` exposes a load-shape tick interface; k6's `lib/executor/constant_arrival_rate.go` records dropped iterations. Both reinforce recording attempted work and generator limits, not only successful requests.
- ZAP's source separates active-scan components under `zap/.../extension/ascan/`; WhatIF keeps active testing distinct from header/source review. No ZAP scan was run.
- Temporal's source exposes workflow-task and mutable-state interfaces under `service/history/`. This is a future durable-workflow reference; no Temporal server was launched.
- claude-mem includes project filtering and redaction modules; WhatIF keeps case outputs project-owned and does not automatically install or use cross-session memory capture.
- T3 Code and Impeccable are agent-interface/design references. They are not forecasting engines and no code or skill text from them was imported.
- Kronos samples model logits in `model/kronos.py`; it is domain-specific research, not evidence for universal application testing.
- DeepAgentForecast is retained as an archived research reference, not selected as a maintained V1 dependency.
- Semgrep's `cli/src/semgrep/output.py` separates output handling/settings from scanning. Its root license is LGPL-2.1; subtree/dependency terms require their own review. WhatIF emits a distinct review-lead schema and does not vendor Semgrep code or claim to implement its analysis.
