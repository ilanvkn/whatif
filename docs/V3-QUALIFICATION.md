# V3 real-application qualification

Date: 2026-11-10. Local macOS, Node 22.23.3, Codex CLI 0.166.0-alpha.5.1, Playwright 1.65.0 and Chrome 157.0.8103.40. These experiments used real open-source application workflows with synthetic inputs and local assets. No public deployment, production account or company service was targeted.

## Results

| Run | Actual AI sessions | Epochs | Accepted patches | Browser journeys | HTTP requests |
|---|---:|---:|---:|---:|---:|
| TodoMVC durability |6|2|1|24|480|
| Markdown formatting/task lists |6|2|1|18|558|
| TodoMVC quota-error continuation |6|2|1|34|672|
| Total |18|6|3|76|1,710|

The runs reserved 3,800 requests and reported 363,028 input-plus-output tokens. These provider counts include cached input where included by the provider; they are not a monetary bill. Usage was reported for all 18 sessions. Each run allowed at most 8 role attempts, 2 epochs, 10 minutes, 5,000 reserved requests, 120 seconds per role call, 100,000 prompt characters and 262,144 output bytes. A 350,000 reported-token threshold was checked between calls per run; tokens/dollars are not hard capped.

Each repair required two before measurements, two exact replays, and a fresh critic review. The next epoch ran new analysis and repeated tests against the accepted source. Red and blue are real, separately invoked AI contexts; test execution and acceptance gates are controlled by WhatIF. Separate contexts do not imply separate model weights. No model identifier was emitted by this CLI, so none is inferred.

The [public qualification summary](evidence/v3-qualification.json) retains source/evidence hashes and case transitions without absolute local paths, source code or session IDs. Complete local receipts, source snapshots and provider outputs remain in project-owned evidence. The public file is a derivative summary, not independently signed proof. Pinned preparation recipes and immutable scenarios make the experiments reproducible, but model output and timing may vary.

## TodoMVC: durability and a repair regression

Upstream: [tastejs/todomvc](https://github.com/tastejs/todomvc), commit ff43b02e59dfa604386bb382034b2cd07c2bcd8a, JavaScript ES5 distribution, MIT. The upstream variant intentionally uses in-memory storage. Adding persistence is a requested durability improvement, not an undisclosed security vulnerability.

The unchanged app passed normal task creation/completion but lost tasks after reload. The independent team implemented actual source changes in store.js. Repeated browser cases verified completion and identity after reload, edited/deleted task persistence, ordinary creation, and recovery from malformed persisted JSON. Only store.js was editable; assertions and other app assets remained immutable.

A separate reviewer then found a regression in the accepted repair: if localStorage reads worked but writes threw a quota error, new tasks disappeared. This was not hidden or retroactively changed into a passing first run. We retained that evidence, added a declared quota-failure case, and started a new bounded team from the accepted source. V3 verifies that the child's initial source snapshot exactly matches the included parent's final snapshot.

The follow-up patch keeps pending in-memory writes authoritative until storage can save again. The original regressions and quota case pass repeatedly; the second epoch also exercised mobile viewport variants. Independent follow-up browser checks confirmed task creation/completion while writes fail, preservation after writes recover and reload, Unicode/literal-markup titles, edit/delete behavior and subsequent IDs. The two independent review rounds used 108 additional HTTP requests, separate from the 1,710 team-run requests above.

This does not guarantee persistence when the browser refuses writes, nor solve cross-tab conflict merging. It demonstrates discovery and correction of a regression introduced by an AI repair.

## Markdown editor: real editing defects

Upstream: [jbt/markdown-editor](https://github.com/jbt/markdown-editor), commit 58aa8bfe18c5a30af2c6fb08221b00b841688dd9, ISC. The real CodeMirror UI rendered normal headings, bold, italic and ASCII task lists, but italic toggling incorrectly produced bold text. Task-list checkbox conversion also failed for non-Latin and inline-formatted content.

Blue changed index.js to use the actual delimiter lengths and to preserve task-list conversion across those content forms. The same assertions changed from repeated failures to repeated passes while the healthy rendering control stayed green. The second epoch confirmed the corrected behavior. Libraries, HTML and test definitions were not editable.

Two upstream CDN dictionary URLs were fulfilled from exact pinned local copies. The runner records those substitutions and makes no outgoing request to those URLs. Thus the result qualifies the reviewed offline asset set, not live CDN availability. Emoji assets, external equation rendering and malformed share links were not qualified. Deliberate raw-HTML support is not labeled a vulnerability.

## Source repairs and reusable findings

[Exported patches and upstream notices](../examples/real-apps/patches/README.md) include the final composite TodoMVC repair and Markdown repair. Patch applicability was checked against the exact original clones without changing them. TodoMVC's identical source and distribution paths both appear in its patch; full UI tests executed the distribution copy. These are local candidate contributions, not submitted upstream PRs.

The `qualify` workflow verifies every supplied run before producing a report. It rejects duplicate evidence/sessions and invalid parent history, distinguishes upstream preparation from a repaired continuation, and records exact case transitions. Retained observations are evidence for review, never authority to alter another application automatically.

New regression recipes capture durable state, identity after reload, malformed storage, rejected writes, reversible formatting and Unicode/inline task content. The generic adapter accepts reviewed app manifests rather than hardcoding either application's source logic.

## Verification and release controls

104 distinct tests pass: 94 core/control/protocol tests plus 10 separately executed optional browser/k6 cases. Relevant checks include source/asset pinning, static host confinement, paths containing spaces, traversal and unlisted-file denial, exact campaign reconstruction, rehashed weakened-oracle rejection, patch rollback, independent sessions, budgets, mirrors, storage faults, continuation lineage and report redaction. Existing load/security integrations remain tested; the real-app repair experiments above are browser journeys, not backend penetration or load benchmarks.

An initial high-parallelism test invocation produced two short mock-provider deadline failures while browsers were running. Bounded test concurrency resolved the resource contention; the final suite retains its actual timeout/cancellation tests. No failed trial is counted as a passing qualification.

Source acknowledgement, fresh sessions, local isolation and hashes are implementation controls. They do not establish user authorization, signed execution attestation, formal correctness, exhaustive security or independent organizational review. Automatic app repair remains qualified on macOS static-web apps. Database-backed servers, build pipelines, native/mobile apps, OAuth, production cleanup, distributed load and behavioral simulation need separate adapters and evidence. No 100× advantage over MiroFish has been measured.
