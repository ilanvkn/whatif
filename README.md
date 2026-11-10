# WhatIF

**Explore scenarios. Test assumptions. Keep the evidence.**

WhatIF 2.1 is a plugin for turning an application question into a scoped test and a traceable report. Start with:

> Test this application with 1 million users, including an attacker's perspective.

WhatIF separates population assumptions from traffic actually measured. It helps define user journeys, capacity and security boundaries, runs bounded local checks, and prepares the next tests. It never turns a small test into a million-user capacity claim.

The V2.1 qualification ran six independent AI sessions across two epochs: red found two planted defects, blue repaired the source, and separate critics reviewed the measured replays. [See the evidence and limits](docs/V2.1-QUALIFICATION.md). Automatic repair currently supports the included macOS Node fixture; reviewed browser, load and security campaigns support broader app testing.

## V2.1 ships

- A WhatIF skill and Claude-compatible `/whatif:whatif` command (the exact shortcut shown depends on the host).
- Twenty-four MCP tools covering planning, actual engine campaigns, branching experiments, comparison and verification.
- A dependency-free Node 22+ core CLI with separately installed Playwright and k6 engines.
- Real browser form/click/assertion journeys and browser-local dependency failures.
- Actual bounded k6 execution with route metrics and request-count verification.
- Owner/other/anonymous synthetic-account security checks.
- Adaptive multi-epoch labs generated from reviewed application contracts, with failure confirmation, symptom grouping and exact regression replay.
- Optional independent Codex red/blue/critic sessions with isolated fixture repairs, repeated tests and evidence receipts.
- Red/user/tester/critic/blue policy artifacts for deterministic labs, conservative budgets, flaky/inconclusive classification and verified lab comparison.
- Branching campaigns plus 16 starter cards; scenario generation is not limited to those examples.
- Registered/DAU/concurrent population models with explicit illustrative assumptions.
- Bounded HTTP GET probes, per-route latency/error diagnostics and failure evidence IDs.
- Sequential baseline/parallel/recovery suites with aggregate budgets and stop-on-failure.
- Verified before/after comparison with configuration compatibility checks.
- Workload sensitivity and explicit alternatives for ambiguous population counts.
- Source review leads with hashes and line numbers, without copying source contents into reports.
- A generated k6 smoke script, adversarial test matrix and evidence-linked report.
- Tests for failures, limits, scope, corruption and a fresh-process verification path.

## Install locally in Codex

Use an existing working Node 22+ runtime:

```sh
node scripts/install.mjs
```

Each release uses a versioned staging directory and preserves prior releases. An identical staged release can be retried. If Codex registration fails, the previous marketplace descriptor and receipt are preserved; the error identifies any Codex-side state that may need inspection. Changed contents under an existing version are refused.

The installer stages only this plugin's release files, writes its exact runtime path, registers a local marketplace and installs WhatIF using the Codex CLI. It does not install upstream research repositories, dependencies or external engines. Open a new chat or refresh plugins to discover the skill and MCP tools. Use `$whatif` or select WhatIF in the host's skill picker; a literal `/whatif` alias is host-dependent.

For Claude-compatible hosts, the repository includes `.claude-plugin/plugin.json`, `.mcp.json` and `commands/whatif.md`; that host integration is packaged but not live-qualified in this release.

## CLI

```sh
node src/cli.mjs doctor
node src/cli.mjs plan --question "Test this app with 1Million users" --target http://127.0.0.1:8080/ --out /tmp/whatif-case
# Review scenario.json: endpoints, expected statuses, workload assumptions and limits.
node src/cli.mjs run --case /tmp/whatif-case --ack-target http://127.0.0.1:8080/ --source /path/to/app
node src/cli.mjs verify --case /tmp/whatif-case
```

The run acknowledgement is an execution guard, not proof of ownership. The host must use actual task authorization. Only literal loopback targets are supported by the built-in runner; no redirects are followed. GET endpoints still need review for side effects.

A run directory is exclusive: interrupted or completed runs are not silently restarted. Preserve it and create a new case for a deliberate retry. CLI exit 2 means completed measurements did not meet the smoke criteria; exit 1 means an invocation/execution error. JSON includes the actual result.

## Suites and comparisons

```sh
node src/cli.mjs suite-plan --question "Test 1 million daily users" --kind daily-active --target http://127.0.0.1:8080/ --out /tmp/whatif-suite
# Review suite.json, including endpoints, thresholds and total budget.
node src/cli.mjs suite-run --suite /tmp/whatif-suite --ack-target http://127.0.0.1:8080/
node src/cli.mjs suite-verify --suite /tmp/whatif-suite
node src/cli.mjs analyze --case /tmp/whatif-case
node src/cli.mjs compare --baseline /path/to/before --candidate /path/to/after
```

Suites execute up to five cases, 500 requests total and 120 seconds of probe budgets against one literal loopback target. They stop on a failed stage by default. The recovery stage repeats a serial measurement; it does not inject or demonstrate recovery from dependency failures. Comparison verifies both evidence sets and labels configuration changes incomparable. CLI exit 2 also identifies a failed suite or an observed SLO regression. Timing differences from single runs are descriptive, not statistical proof.

V1 requires every endpoint to receive a probe and meet its SLO. Existing V0.1 evidence remains hash-verifiable, but should be rerun for V1 per-route qualification; old aggregate pass/fail rules are not upgraded retroactively.

## Try the included demo

```sh
npm test
npm run check
npm run demo
```

The demo starts and stops its own loopback HTTP fixture. It includes a protected endpoint and a deliberately unavailable dependency; success means WhatIF detects the failing route, not that all routes pass. A fresh process verifies the resulting evidence. This is integration evidence for the plugin, not a benchmark of a production application.

## Adaptive V2 labs

[Read the V2 lab guide](docs/V2-LAB.md). Plan from a reviewed campaign, inspect generated experiments, record repeat-safe fixtures, run bounded epochs, and replay exact reproduced failures after a correction.

```sh
node src/cli.mjs lab-plan --campaign /path/to/campaign --out /tmp/new-lab
node src/cli.mjs lab-inspect --lab /tmp/new-lab
# Review lab.json and record actual fixture readiness/revision.
node src/cli.mjs lab-run --lab /tmp/new-lab --ack-target EXACT_TARGET
node src/cli.mjs lab-verify --lab /tmp/new-lab
node src/cli.mjs lab-replay --lab /tmp/new-lab --out /tmp/replay
node scripts/lab-demo.mjs
```

These lab roles use deterministic policies. The separate AI team runner below provides fresh model sessions and isolated fixture repair. Failure shrinking and durable mid-run continuation are not implemented. More generated cases do not equal more executed tests or proven coverage.

## Independent AI teams and repairs

The optional V2.1 team runner gives red, blue and critic roles separate Codex CLI sessions. Red proposes reviewed experiments, the controller measures failures, a critic challenges the evidence, and blue proposes a source patch. The controller applies an allowlisted patch in a disposable checkout, repeats tests and fixed contract checks, and asks a fresh critic to review the replay. Rejected patches roll back; accepted patches remain in the isolated checkout for the next epoch. Original source stays untouched.

The supported qualification scope is **macOS and the disposable Node fixture `examples/agent-app`**. This is not yet a general arbitrary-app repair adapter. It requires Node 22+, a compatible authenticated Codex CLI and the separately configured Playwright engine. Separate contexts do not imply different model providers or weights.

```sh
node src/cli.mjs team-plan --source "$PWD/examples/agent-app" --out /tmp/whatif-team
# Review team.json: canonical app.source, source disclosure, editable files and budgets.
node src/cli.mjs team-run --team /tmp/whatif-team --ack-source "$PWD/examples/agent-app"
node src/cli.mjs team-verify --team /tmp/whatif-team
```

Execution sends reviewed source and evidence to the Codex provider using existing authentication. Call, request, input/output and time limits bound the loop. The reported-token threshold is checked between calls: **tokens and dollars are not hard capped**. Missing usage stays unknown. A used run directory cannot be resumed automatically.

Read the [AI team workflow](skills/whatif/references/agents.md), `run/summary.json`, `run/epochs.json`, agent receipts and nested campaign evidence. Report actual model calls, distinct sessions, stop reasons and accepted repairs. Fake-provider tests establish controller behavior only; a real-provider qualification needs its own receipts. Finite fixture success is not general security assurance or a benchmark against MiroFish. Our [benchmark protocol](docs/BENCHMARK-PROTOCOL.md) defines how to measure broader usefulness and compare results fairly.

## Real journeys, load and security

See the [engine guide](docs/ENGINE-GUIDE.md) for optional engine setup, reviewed campaign configuration and execution. Explore [branching experiments](docs/BRANCHING-EXPERIMENTS.md) for the broader WhatIF design.

```sh
node src/cli.mjs explore
node src/cli.mjs engine-doctor
node src/cli.mjs campaign-plan --question "What if checkout loses payment?" --target http://127.0.0.1:8080/ --out /tmp/checkout
# Review campaign.json; configure actual selectors, request allowlists and fixtures.
node src/cli.mjs campaign-run --campaign /tmp/checkout --ack-target http://127.0.0.1:8080/
node src/cli.mjs campaign-verify --campaign /tmp/checkout
node src/cli.mjs campaign-compare --baseline /path/to/before --candidate /path/to/after
node scripts/integration-demo.mjs
```

Campaigns support authorized HTTPS staging as well as loopback. The original smoke runner remains loopback-only. Each browser uses a fresh isolated context, blocks redirects and non-reviewed requests, and retains neither credentials nor response bodies. k6 runs locally with no cloud output. Security checks require synthetic account tokens through environment references.

## What is not implemented yet

Distributed million-user execution, open-arrival load, arbitrary exploit reproduction, external OAuth journeys, transaction rollback, social/persona simulations, causal analysis and forecasting engines are not implemented. The security adapter reproduces declared account-boundary failures; it is not an autonomous penetration tester. The skill can prepare and coordinate those workflows using separately available tools, with matching target authorization. Their results must have their own evidence. See [integration status](docs/INTEGRATIONS.md) and [Qualification](docs/QUALIFICATION.md).

Latency from the built-in probe ends at response headers; it does not measure full response bodies or page rendering. Source scanning is heuristic and incomplete. A passing smoke test does not establish capacity or security. Evidence hashes detect later byte changes; they are not signed attestations.

## Research and reuse

The upstream reference collection lives outside this repository. `docs/upstream-manifest.json` pins source identities and license-file hashes. Research ideas inform the architecture; upstream application code has not been pasted into the runtime. Cloning a project does not make it an installed integration or establish license compatibility for future incorporation.

Our original code is MIT licensed. Upstream projects retain their own licenses. See [provenance](docs/PROVENANCE.md). This repository is release-prepared locally; public publication and production qualification are separate steps.
