# Real application campaigns

V1.1 adds three executable adapters and branching experiment cards. The existing loopback smoke tools remain unchanged. Campaigns can target literal loopback HTTP(S) or an explicitly authorized HTTPS staging origin. Target acknowledgement is not proof of ownership: the host must establish current permission for the target, actions and limits.

## Optional engines

Core CLI, planning and security checks use Node 22+. Playwright and k6 are separate installations; no upstream code or browser binary is bundled. Qualified on macOS with Playwright 1.65.0, Chrome 157.0.8103.40 and k6 2.3.0. Other versions and Windows process-tree cancellation are not qualified.

Install Playwright from its official npm package in a dedicated directory, and a browser using its official installer or an existing supported Chrome. Install k6 from Grafana's official distribution. Configure absolute local paths:

```sh
node scripts/configure-engines.mjs --playwright-module /absolute/path/node_modules/playwright/index.mjs --k6-binary /absolute/path/k6 --browser-channel chrome
node src/cli.mjs engine-doctor
```

Configuration is stored at `~/.codex/whatif/engines.json`. Previous configuration is backed up. This command does not download or execute engines. Process workers have an isolated environment; inherited K6 cloud/output/proxy options are not forwarded. Browser credentials are not read from the user's regular Chrome session.

## Plan and run

```sh
node src/cli.mjs campaign-plan --question "What if checkout fails?" --target http://127.0.0.1:8080/ --out /tmp/checkout-campaign
# Edit campaign.json with actual selectors, routes, synthetic fixtures and assertions.
node src/cli.mjs campaign-run --campaign /tmp/checkout-campaign --ack-target http://127.0.0.1:8080/
node src/cli.mjs campaign-verify --campaign /tmp/checkout-campaign
```

Use one unused directory per intentional run. Engine failures and interrupted directories are not silently retried. A completed run with failed assertions exits 2; invocation errors exit 1. A stopped process can have unknown traffic count, which is reported as unknown, never zero. Hash verification is not a signature.

Branches execute sequentially. Browser checks are not automatically run simultaneously with k6 traffic.

Campaign limits: at most 10 branches, 10,000 total request budget, 100 VUs per k6 branch and five minutes overall. Each branch reserves its declared maximum; budget cannot be borrowed from another branch. Deadline expiry terminates worker process groups, cleans the recorded owned Chromium group, and records interruption. SIGINT/SIGTERM requests also stop the active worker. Declared assertion failures allow other independent branches to run; engine crashes or deadlines stop the campaign. Browser application state mutations require synthetic records and explicit cleanup; there is no generic database rollback.

## Browser configuration

`allowRequests` is an exact list of `{method,path}` pairs for the target origin. Include required assets and APIs. The path matches pathname, so query strings may vary; review endpoints for query-driven behavior. Supported methods: GET, POST, PUT, PATCH, DELETE. A click can mutate state only through reviewed routes. Cross-origin HTTP(S) requests, redirects, WebSockets, service workers and downloads are not supported. These routing checks are not an operating-system egress sandbox. External OAuth/payment journeys require a future reviewed multi-origin adapter.

Steps:

```json
[
  {"action":"goto","path":"/checkout"},
  {"action":"fill","selector":"#email","valueEnv":"WHATIF_TEST_EMAIL"},
  {"action":"click","selector":"#submit"},
  {"action":"text","selector":"#status","expected":"Order confirmed"},
  {"action":"visible","selector":"#receipt"}
]
```

A journey must contain an assertion. Literal values are for non-secret synthetic data; secrets use WHATIF_* environment references. No arbitrary script/evaluate step is accepted. Optional context settings: viewport `{width,height}`, locale, timezoneId, reducedMotion (`reduce` or `no-preference`).

Optional intervention: `{ "path":"/payment", "type":"status", "status":503 }`, or `type:"abort"`, or `type:"delay", delayMs:2000`. One intervention per branch. It must actually be exercised to pass. Synthetic status/abort responses do not contact that endpoint. These failures exist only in the test browser; they do not demonstrate server-side resilience.

Responses are buffered to enforce redirect checks; streaming is unqualified. Application responses and form values are not stored in reports. A pending unrelated background request may not finish before the journey closes; define assertions for the outcomes that matter.

## k6 configuration

Set `maxRequests`, `vus`, `durationMs`, `timeoutMs`, `paceMs`, `p95Ms`, `maxErrorRate`, and reviewed GET `endpoints` with expected statuses. The adapter generates and executes a local k6 script with shared iterations, one request per iteration, no redirects, discarded bodies, per-route thresholds and no cloud output. It records raw metric summary, generated script, normalized per-route results, and observed request count. Missing iterations fail completeness. This is a closed workload, not a guaranteed RPS/open-arrival test or distributed million-user execution. No server-resource telemetry is collected automatically.

## Security configuration

`checks` supports:

- `{ "type":"anonymous-denial", "path":"/account" }` — expected 401/403/404.
- `{ "type":"object-isolation", "path":"/account/alice", "ownerTokenEnv":"WHATIF_OWNER_TOKEN", "otherTokenEnv":"WHATIF_OTHER_TOKEN", "ownerMarker":"SYNTHETIC_ALICE_CANARY" }`.

Object isolation requires three GETs: anonymous, owner and another identity. Owner must return 200 and the synthetic marker; other and anonymous must deny access without the marker. Missing/equal tokens block execution before traffic. Only test account bearer tokens are supported. Response bodies are capped at 64 KiB, checked in memory and omitted from evidence. A failed positive control is inconclusive, not a reproduced exploit. These tests do not replace injection analysis, full authorization modeling, SAST or an authorized penetration test. Semgrep/ZAP execution is not bundled.

## Evidence and self-test

Every run contains input/configuration identity, engine-file hashes, per-engine results, a Markdown report, and a hash index. No screenshot/HAR or raw browser console is captured. Environment values are omitted; do not place secrets directly in campaign JSON.

`node scripts/integration-demo.mjs` launches a disposable app, reproduces a false-success checkout bug and cross-account read bug, corrects the fixture, reruns identical campaigns, verifies evidence in another process, and stops the fixture. `npm run test:engines` additionally tests browser redirect isolation and k6 failure/no-redirect behavior. These are real engines against a synthetic app, not proof that a user application has passed.
