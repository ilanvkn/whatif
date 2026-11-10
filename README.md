# WhatIF

**Explore scenarios. Test assumptions. Keep the evidence.**

WhatIF is a V1 plugin for turning an application question into a scoped test and a traceable report. Start with:

> Test this application with 1 million users, including an attacker's perspective.

WhatIF separates population assumptions from traffic actually measured. It helps define user journeys, capacity and security boundaries, runs bounded local checks, and prepares the next tests. It never turns a small test into a million-user capacity claim.

## V1 ships

- A WhatIF skill and Claude-compatible `/whatif:whatif` command (the exact shortcut shown depends on the host).
- Nine MCP tools covering planning, analysis, suites, comparison, source review and verification.
- A dependency-free Node 22+ CLI.
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

Version 1.0.0 uses a new versioned staging directory and preserves the old staged plugin. It backs up the marketplace descriptor before selecting the new release.

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

## What is not implemented yet

Distributed million-user execution, browser journeys, automatic exploit reproduction, tenant-auth fixtures, social/persona simulations, causal analysis and forecasting engines are not bundled. The skill can prepare and coordinate those workflows using separately available tools, with matching target authorization. Their results must have their own evidence. See [integration status](docs/INTEGRATIONS.md) and [V1 qualification](docs/QUALIFICATION.md).

Latency from the built-in probe ends at response headers; it does not measure full response bodies or page rendering. Source scanning is heuristic and incomplete. A passing smoke test does not establish capacity or security. Evidence hashes detect later byte changes; they are not signed attestations.

## Research and reuse

The upstream reference collection lives outside this repository. `docs/upstream-manifest.json` pins source identities and license-file hashes. Research ideas inform the architecture; upstream application code has not been pasted into the runtime. Cloning a project does not make it an installed integration or establish license compatibility for future incorporation.

Our original code is MIT licensed. Upstream projects retain their own licenses. See [provenance](docs/PROVENANCE.md). This repository is release-prepared locally; public publication and production qualification are separate steps.
