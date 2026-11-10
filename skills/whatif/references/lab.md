# WhatIF V2: an adaptive trial laboratory

The 16 V1.1 cards remain examples. V2 generates experiments from the app's reviewed journeys and boundaries, executes them across epochs, and uses observed failures to prioritize subsequent trials. It is an original application-testing engine, not a benchmarked replacement for MiroFish or a calibrated human-behavior simulation.

## Roles and evidence

| Role | Implemented responsibility |
|---|---|
| Red | Propose bounded fault, concurrency and interaction mutations; prioritize neighbors of failing journeys |
| User advocate | Preserve declared user goals and assertions; vary viewport, locale, timezone, reduced motion and repeated clicks |
| Tester | Execute real Playwright, k6 or synthetic identity checks in exclusive trial directories |
| Critic | Verify evidence; reject unexercised faults, failed controls, blocked scope, unresolved actions and interrupted runs as inconclusive |
| Blue | Produce evidence-linked repair recommendations and exact regression cases; preserve the original oracle during replay |

These roles currently run deterministic policies. They are not separate LLMs, trained adversaries or human-user personas. The host assistant can read the role ledger, inspect source and implement authorized fixes, then replay the pack. WhatIF does not automatically edit arbitrary app code or purchase model inference. Independent model teams and their disagreement/calibration budgets remain future work.

## From a campaign to a lab

```sh
node src/cli.mjs lab-plan --campaign /path/to/reviewed-campaign --out /tmp/new-lab
node src/cli.mjs lab-inspect --lab /tmp/new-lab
# Review lab.json: fixture, app revision, operators, limits and original assertions.
node src/cli.mjs lab-run --lab /tmp/new-lab --ack-target EXACT_CAMPAIGN_TARGET
node src/cli.mjs lab-verify --lab /tmp/new-lab
```

Planning sends no traffic. `fixture.repeatSafe` starts false. Before execution, record an app revision and a concrete `resetStrategy`, and set repeat safety only for actual disposable/repeat-safe operations. This is an operator declaration, not an automatic database reset. Repeated-click scenarios can cause repeated allowed mutations: never enable them against real payments or irreplaceable production records.

The generator admits declared seed baselines first, then creates:

- HTTP 4xx/5xx, delay and abort variants only where a seed already declares an intervention path.
- Viewport, locale, timezone and motion variants with unchanged outcome assertions.
- Repeated copies of an existing click, within the same route/method permissions and step cap.
- k6 concurrency and pacing variants at an unchanged per-trial request ceiling.
- Second-order status × viewport and concurrency × pacing combinations when `interactionDepth` is 2.

No new endpoint, secret identity, shell command, arbitrary JavaScript or exploit payload is invented. Assertions remain the declared oracle; a wrong oracle can still produce a wrong interpretation. There is no universal app specification inference.

Concrete engine/configuration hashes deduplicate semantically identical candidates independent of JSON object-key order. The demo app's four seed journeys generate 89 candidates under the default operators. This number depends on the contract and operator settings; it is not a fixed scenario catalog or evidence of 89 executed tests.

## Epochs and stopping

Defaults: five epochs, three trials per epoch, 15 trials maximum, 2,000 reserved requests, five minutes of execution budget, two confirmations and a 300-candidate ceiling. Hard limits: 20 epochs, 100 trials, 50,000 reserved requests, 15 minutes and 1,000 retained candidates. Contracts are capped at 512 KiB and compiled space at 8 MiB. Truncation is reported explicitly.

Each candidate runs at most once per epoch. The scheduler establishes baselines, prioritizes a failure replay in another epoch, explores neighboring conditions, then other untested conditions and pass repeatability. A seed controls deterministic tie-breaking; timing and application behavior are not made deterministic.

The full request ceiling is reserved before each trial, even if it later uses fewer requests. Unknown traffic, engine failure, cancellation or deadlines stop further execution. Filesystem finalization may extend beyond the execution budget. A budget, trial/epoch limit, exhausted space or stagnation ends the lab; no automatic unbounded loop exists.

Two matching observations can mark a candidate `reproduced-failure`; they do not establish statistical confidence or a shared root cause. Mixed pass/fail results are `flaky`. Failed positive controls, unexercised interventions, scope blocks and unresolved action execution remain `inconclusive`. Retry-budget exhaustion is an observation; an infinite loop is an inference requiring source review. Browser network evidence records reviewed route attempt counts, not sensitive query strings or payloads.

## Repair and replay

```sh
node src/cli.mjs lab-replay --lab /tmp/new-lab --out /tmp/corrected-replay
# Fix the app within authorized scope. Record its new revision and fixture readiness.
node src/cli.mjs lab-run --lab /tmp/corrected-replay --ack-target EXACT_CAMPAIGN_TARGET
node src/cli.mjs lab-compare --baseline /tmp/new-lab --candidate /tmp/corrected-replay
```

Replay uses the exact reproduced configurations and assertions. It does not shrink a failure, change its expected result or apply a patch. A pack with more than ten reproduced cases must be split deliberately because the campaign seed contract is limited to ten branches. New replay plans reset fixture readiness and revision.

Comparison verifies both labs and matches concrete candidate hashes with compatible target, engine identity and confirmation policy. A reproduced failure must become a repeated pass to count as recovered. Unexecuted cases never count as fixed. App revision is declared by the operator, not independently attested from deployment.

Each lab directory is exclusive. Interrupted runs retain evidence and cannot silently restart. V2 does not yet resume mid-run or persist scheduling history across independent labs. Inspect the saved manifest, events and findings, then create an intentional new experiment.

## Artifacts and exit behavior

`run/space.json` records generated candidates; `events.jsonl` records role reasoning per trial; `findings.json` records repeatability; `regressions.json` preserves exact reproduced cases; the report links nested raw evidence. `lab-verify` checks the manifest, top-level index and every executed trial index and artifact.

`lab-run` exits 2 when failures, incomplete coverage or inconclusive outcomes need attention; JSON distinguishes those conditions. Exit 0 means no failure in the declared executed/repeated scope, never universal security. Exit 1 means invocation/execution error. Hashes are not signatures. All storage is local/project-owned and contains no runtime token values.

## Qualification and remaining work

Use `node scripts/lab-demo.mjs` for the owned failure/correction fixture. It generates a space, executes three bounded epochs, reproduces symptoms, corrects the fixture, replays confirmed cases and verifies nested evidence in another process. Tests also cover unknown controls, flaky outcomes, scope, reservations and tampering.

Next: source-informed oracle discovery, independently reasoning agent roles, verified app-state reset, minimal failure shrinking, durable continuation, concurrent browser/load orchestration, more security adapters and distributed generators. Increasing the scenario count alone does not establish any of these capabilities.
