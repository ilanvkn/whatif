# WhatIF maintenance handover

WhatIF is a macOS-qualified application testing plugin with 26 MCP tools, a CLI and a local JavaScript API. Supported automatic repair runners are reviewed static applications, Python/SQLite backends and Python/PostgreSQL 17 backends. PostgreSQL can run separately owned Python queue workers. Application-specific assertions and budgets must be reviewed before execution.

Start with README.md and the qualification documents in docs/. Pinned preparation recipes are in examples/real-apps, examples/backends and examples/postgres. Research clones, raw provider transcripts, temporary databases, authentication material and private local evidence are not included in the public repository.

## Reproduce and verify

Use Node 22+ and a compatible authenticated Codex CLI. Optional Playwright and k6 setup is described in docs/ENGINE-GUIDE.md. PostgreSQL recipes need the reviewed PostgreSQL 17 installation and explicit pinned Python environments; the preparer never installs dependencies or runs upstream hooks. The repository's existing dependency locks describe the qualified profiles, not an endorsement of historical versions for production deployment.

Run `npm test`, `npm run check`, and the separately enabled optional-engine suite. PostgreSQL integration tests require the installed local PostgreSQL 17 binaries and can take several minutes. Default optional-engine skips are not passes. Review actual test receipts before calling a release qualified.

Plan a new team directory with `app-plan`; review the pinned manifest; run with the exact canonical source acknowledgement; then invoke `team-verify` from a fresh process. `qualify` combines verified runs. Never reuse a used team directory or silently continue past its declared budget. Fixes are committed in a disposable copy and must be reviewed before applying elsewhere.

## Findings and operational lessons

Prior browser trials fixed Markdown formatting and extended TodoMVC persistence, including a later quota-error regression in an AI repair. SQLite trials fixed Microblog cursor-limit validation and RealWorld deletion error handling. PostgreSQL trials extend the contracts to article favorites, concurrent requests and a genuine Procrastinate queue demonstration with explicit retry/idempotency requirements. See the individual qualification documents for final measured results, exact pins and limits.

Do not confuse a 500 response with a proven authorization bypass, a client-request overlap with a simultaneous database transaction, or a fixed-count workload with production capacity. The Procrastinate task enhancement is requested functionality beyond its original print-only demo; it is not an upstream queue vulnerability.

Private PostgreSQL uses an app role separate from the SCRAM-authenticated controller administrator. TCP is disabled. Preserve exact cold-seed reset checks, worker/process ownership, runtime pinning, immutable oracles and cleanup. Repeated cleanup must preserve the original verified receipt. Slow initialization and interpreter imports require bounded startup windows; first integration failures and corrections remain documented locally. Budget checks surround expensive lifecycle operations; interrupted traffic counts can be lower bounds.

## Publication and continuity

GitHub publication is authorized for public ilanvkn/whatif. Local Git credentials did not have access to that account, so source history is imported through the authenticated GitHub connector. Imported commit IDs differ; their source trees are verified identical to the corresponding local revisions. Do not infer that a different commit ID means different source bytes.

This document is a maintenance summary, not a full chat transcript. Public reports intentionally omit provider-session IDs, prompts, source snapshots, generated credentials and database contents. Full local evidence lives under the project-owned ignored .reverse-lab directory and is not recoverable from the public repository alone. Archiving a chat does not delete it or guarantee capture of every historical attachment.

Future work remains explicit: Linux containment, other queue brokers, distributed workers, failover, online migrations, OAuth/SSO, remote staging and production load qualification. No universal-security, complete-coverage or comparative 100× claim is supported.
