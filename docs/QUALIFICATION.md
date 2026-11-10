# WhatIF V2 qualification

For the current real-app release, see [V3 qualification](V3-QUALIFICATION.md). The earlier independent-agent fixture release is documented in [V2.1 qualification](V2.1-QUALIFICATION.md). The following records the earlier 2.0 release.

Date: 2026-11-10 (Asia/Kuala_Lumpur). Local Node 22.23.3; existing optional Playwright 1.65.0, Chrome 157.0.8103.40 and k6 2.3.0. No remote app or company infrastructure tested.

## Verified implementation

- 44 core/control/protocol tests passed, including the original core plus V2 generation, stable deduplication, unchanged assertions, candidate limits, baseline gating, scheduling, positive-control criticism, flaky classification, repeat-safety readiness, exact acknowledgement, actual security epochs, regression replay, comparison, nested tampering and cumulative reservations.
- Seven explicit real-engine integration tests passed, including browser checkout/fault/correction, redirect isolation, actual k6 statuses and request counts, browser parallel request caps, generator cancellation, Chromium cleanup and a retrying page whose injected responses also hit the attempt cap.
- Total distinct passing tests: 51. The default suite skips the seven optional-engine cases; those were separately executed with WHATIF_ENGINE_TESTS=1. Final lab/protocol checks additionally cover the completeness gate after the last control change.
- All 21 MCP tools are exercised through discovery and actual calls. The final installed entrypoint is tested separately after installation.

## Multi-epoch demo

The owned disposable app has four reviewed seeds: healthy checkout, payment-failure handling, a bounded read-load route, and synthetic account isolation. Default V2 operators generate 89 concrete candidates.

The vulnerable-revision lab executes nine trials over three epochs and covers six unique candidates. It reproduces three failure cases across two symptom groups. One additional observed failure remains unconfirmed, and 83 generated candidates remain unexecuted. This is not a claim of 89 tests or three independent bugs.

After correcting the fixture, its exact regression pack executes six trials over two epochs. All three previously reproduced cases become repeated passes. Comparison labels the others untested. The app observes 143 requests overall, including 120 actual k6 requests. Nested evidence is verified from a fresh process. Raw run paths and receipts are recorded in the project-owned checkpoint after the final run.

## Corrections and limits

V2 caps browser attempts including synthetic interventions, preventing an endless stream of intercepted retries from bypassing the attempt count. It propagates cancellation/deadline metadata so the lab does not launch another trial after interruption. The critic leaves unresolved actions, blocked scope, failed positive controls and unexercised interventions inconclusive. A fixture baseline that is inconclusive blocks its mutations. A single pass below the required confirmation count is incomplete.

Roles are deterministic policies and local artifacts, not independent LLM agents. No automatic application patch, independent user simulation, model training, statistical confidence guarantee, root-cause proof, distributed load, arbitrary exploit generation, failure shrinking or mid-run continuation is claimed. Fixture revision/reset safety remains an operator declaration. Browser intervention is local to the browser. Production/remote HTTPS and Windows cancellation remain unqualified.

Earlier V1.1 corrections remain regression-tested: redirect scope escape, nested k6/Chromium process cleanup, anonymous-denial canary leakage and CLI shebang ordering. Node tests run locally because the available KHC supervised jobs support Python, not these JavaScript checks. The working Node 22 runtime is pinned; the broken default Homebrew Node was not changed.
