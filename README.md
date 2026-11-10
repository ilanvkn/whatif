# WhatIF V3

**Ask what could fail. Run the app. Challenge the evidence. Repair and replay.**

WhatIF turns application scenarios into bounded tests and traceable findings. Independent red, blue and critic AI sessions inspect source, debate measured failures, propose actual patches and review repeated tests. The controller enforces editable-file lists, unchanged test assertions, isolation, budgets and rollback.

V3 has run this loop on two pinned open-source apps—not only its synthetic fixture:

| Application | Observed change |
|---|---|
| [TodoMVC](https://github.com/tastejs/todomvc) | Added durable task storage, then found and fixed a quota-error regression in that repair; verified edits, completion, deletion and IDs across reload. |
| [Markdown editor](https://github.com/jbt/markdown-editor) | Repaired italic toggling and task-list conversion for Unicode and inline-formatted text. |

**18 independent AI sessions · 6 epochs · 76 browser journeys · 3 accepted source repairs.** These are finite application results, not claims of universal testing or superiority over another product. [Qualification and limits](docs/V3-QUALIFICATION.md) · [Benchmark protocol](docs/BENCHMARK-PROTOCOL.md)

## What you can use

- **26 MCP tools**, a CLI, a WhatIF skill and a local JavaScript API.
- Actual browser workflows, synthetic-account security checks and bounded local k6 workloads.
- Adaptive scenario generation, repeated failure confirmation and exact regression replay.
- Independent Codex red/blue/critic sessions with source patches, review gates and rollback.
- A reusable static-web app adapter with pinned source/assets and immutable application-specific tests.
- Cross-application reports that retain verified findings and usage without copying source or model-session identifiers into the public report.
- Population/workload planning, loopback smoke tests and before/after comparison.

Automatic repair is currently qualified for **static web applications on macOS**, plus the legacy Node test fixture. Browser/load/security campaigns support reviewed loopback and authorized HTTPS targets. Arbitrary backend builds, databases, OAuth, mobile/native apps, distributed million-user loads and behavioral prediction remain separate work. A million modeled users is not a million measured users.

## Install

Use a working Node22+ runtime and an authenticated compatible Codex CLI:

```sh
node scripts/install.mjs
```

Refresh plugins or open a new chat. Select `$whatif` through the host's skill picker; the exact slash-command alias depends on the host. The installer stages versioned releases, preserves prior versions and supports retrying an identical payload. Changed bytes under an installed version are refused. It does not install engines or upstream projects.

Playwright and k6 are optional, separately configured engines. See [engine setup](docs/ENGINE-GUIDE.md). AI teams require Playwright and Codex authentication; ordinary planning and verification make no model calls. Claude-compatible packaging is included but not live-qualified.

## Run a real app team

Follow [pinned application preparation](docs/REAL-APP-PREPARATION.md) to clone the exact upstream revisions and create a prepared app. No dependency install hooks are executed by the preparer.

```sh
node scripts/prepare-real-app.mjs --app todomvc --source /path/to/pinned/todomvc --out /tmp/todo-prepared
node src/cli.mjs app-plan --manifest /tmp/todo-prepared/app-spec.json --out /tmp/todo-team
# Review team.json: source disclosure, assets, editable files, assertions and budgets.
node src/cli.mjs team-run --team /tmp/todo-team --ack-source /tmp/todo-prepared/app
node src/cli.mjs team-verify --team /tmp/todo-team
```

Use the canonical source path returned by planning if `/tmp` resolves elsewhere on your OS. To test your own static app, adapt the [reviewable manifests](examples/real-apps) to its real files, selectors and business invariants. A template's selectors are not knowledge of your app.

Accepted patches stay in `run/app`, committed in its isolated Git checkout. The original checkout remains unchanged. Inspect `run/report.md`, `epochs.json`, `calls.json` and per-epoch source/test evidence before integrating a patch. A used run directory is never silently resumed.

AI execution sends reviewed source and evidence to the configured Codex provider. Different sessions do not imply different model weights. Call, request, input/output and time limits bound the loop; the reported-token threshold is checked between calls. **Tokens and dollars are not hard capped.** Missing usage remains unknown.

## Keep findings across apps

```sh
node src/cli.mjs qualify --teams /absolute/todo-team,/absolute/markdown-team --out /tmp/whatif-qualification
```

This verifies both evidence sets before creating report.json, report.md and a hash index. Findings retain exact application versions, tested invariants, observed failure-to-pass transitions and measurement limits. They are evidence to review, not automatic instructions for changing another app. Blocked, mock or single-app evidence cannot become complete cross-application qualification.

## Use the API or MCP

```js
import {planAppTeam, runTeam, verifyTeam, qualifyTeams} from './src/index.mjs';
await planAppTeam({manifest: '/absolute/app-spec.json', out: '/absolute/new-team'});
await runTeam('/absolute/new-team', {ackSource: '/absolute/reviewed-app'});
await verifyTeam('/absolute/new-team');
```

Importing the API starts no server or tests. The same workflows are exposed as `whatif_app_plan`, `whatif_team_run`, `whatif_team_verify` and `whatif_qualify`. There is no separately deployed HTTP API service in this release.

## Other application questions

For “test this app with one million users,” specify registered, daily-active or concurrent users; then define journeys, rates, latency/error targets and traffic limits. Population assumptions and measured traffic are reported separately.

- [Browser, load and security campaigns](docs/ENGINE-GUIDE.md): actual actions and assertions, browser-local fault injection, bounded k6 and synthetic owner/other/anonymous checks.
- [Adaptive labs](docs/V2-LAB.md): generate reviewed variations, confirm failures and prepare exact replay packs. These older lab roles are deterministic; AI teams are a separate runner.
- [Integration status](docs/INTEGRATIONS.md): implemented capabilities versus research/planning.
- [Branching scenarios](docs/BRANCHING-EXPERIMENTS.md): the sixteen starter cards are examples, not the scenario limit.

Remote testing still requires matching target, action and budget authorization. An acknowledgement string is not proof of ownership. Browser-local errors do not prove server recovery. A static-host load test is not a production capacity benchmark. Security checks cover declared boundaries, not arbitrary exploit discovery.

## Validate and contribute

```sh
npm test
npm run check
npm run test:engines
```

The default suite skips optional real-engine cases. The release qualification records which tests actually ran. Evidence verification detects changed bytes and inconsistent claims; unsigned local hashes are not independent execution attestations. Tests preserve original assertions after fixes.

Our runtime is original MIT code. Upstream apps and dependencies retain their licenses; the preparer preserves provenance and notices. Research clones stay outside this repository. See [provenance](docs/PROVENANCE.md), [V3 qualification](docs/V3-QUALIFICATION.md) and the [release checklist](docs/RELEASE-CHECKLIST.md). Public publication and production qualification are separate from a locally prepared release.
