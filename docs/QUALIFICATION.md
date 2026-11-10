# V1.1 qualification

Date: 2026-11-10 (Asia/Kuala_Lumpur).

Local environment: Node 22.23.3, Playwright 1.65.0, isolated headless Chrome 157.0.8103.40, k6 2.3.0 on macOS arm64. Playwright was installed from the official npm package in a separate engine directory with lifecycle scripts disabled. Existing Chrome and the previously qualified official k6 binary were used. No upstream binaries are included in the plugin release.

## Executed evidence

- 31 core/control/protocol tests passed. These include original V1 behavior, all 15 MCP tools, campaign contracts, exact acknowledgement, missing credentials, security positive controls, canary leakage in a denial response, evidence tampering, deadline behavior, process-tree cleanup and interruption handling.
- Six explicit real-engine integration tests passed: browser failure/correction plus actual k6/security, foreign-origin redirect blocking, k6 unexpected-status/no-redirect behavior, concurrent browser request caps, deadline termination of the nested k6 generator, and cleanup of Chromium’s separate process group after a browser interruption.
- The default test command skips the six optional-engine tests; they were then explicitly executed with WHATIF_ENGINE_TESTS=1. Total distinct passing tests: 37.
- Self-test campaign: a disposable checkout app with a false-success-on-payment-error bug and cross-account record-read bug. Both failed their declared invariants, then passed after fixture corrections. Unchanged healthy checkout/load branches also passed. The two campaigns were compatible and comparison reported RECOVERY.
- Fixture counted 252 application requests across before/after runs, including exactly 240 k6 GETs (120 per run, 8 VUs). Browser-local synthetic 503 responses did not reach the payment route. Evidence verification passed in a fresh process.
- Manifests, skill frontmatter and references validated. Local source and installed MCP entrypoint qualification receipts are retained in the project-owned checkpoint folder after installation.

## Bugs found while building WhatIF

- Initial browser routing allowed an HTTP redirect to bypass the first request's scope check. A two-server fixture observed one disallowed request. Fixed using response fetch with maxRedirects=0/maxRetries=0, rejecting 3xx before delivery. Corrected test observes zero foreign-origin requests. This is why routing was tested with adversarial fixtures rather than assumed safe.
- Chromium also launches in a separate process group. The adapter records the exact owned browser PID and cleans that group after abnormal worker exit; the browser-interruption test checks the PID has exited.
- Nested k6 originally created its own process group. Updated it to remain in the worker group so campaign deadlines terminate the generator too; actual generator cessation verified.
- Initial CLI import insertion displaced the shebang and broke fresh-process verification. Corrected before final validation.
- Anonymous 403 containing the owner's synthetic marker was initially considered a denial. Updated the object-isolation check to reject canary leakage even with a denial status, and added regression coverage.

## Limits

These are real engines against a synthetic fixture and tests of WhatIF itself, as requested. No company app, production account, external website, cloud load or unrelated infrastructure was tested. HTTPS staging support is implemented but has not been qualified against a remote deployment. Windows process-tree cancellation and Claude host are unqualified. Browser context options and delay/abort interventions are available; qualification focuses on the status-failure journey and network boundaries, not every possible app/context combination.

No distributed million-user execution, open-arrival RPS guarantee, server telemetry, database rollback, arbitrary exploitation, Semgrep/ZAP invocation, social simulation or calibrated forecasting is claimed. Node tests ran locally because KHC's available supervised tasks are Python-only. The broken default Homebrew Node remains unchanged; a working Node 22 runtime is pinned by the installer.
