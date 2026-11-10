# V1 qualification

Date: 2026-11-07 (Asia/Kuala_Lumpur).

Executed on the local Mac with existing Node 22 runtime:
- 12 Node tests passed: workload ambiguity/math, invalid plan domains, exclusive case creation, exact request budget, fresh-process verification and tamper detection, external-target/scope refusal, redirect refusal, expected authentication denial, deadline behavior, evidence-path rejection, source redaction/symlink skipping, and full MCP tool lifecycle.
- Manifest/frontmatter/reference checks passed.
- A self-owned loopback demo executed 20 probes across normal, protected and deliberately degraded routes. It observed a 30% expected-status failure rate and correctly failed its smoke criterion. Its evidence was verified in a separate process from another working directory.

This proves bounded plugin integration behavior. It does not establish production-app capacity, exploit resistance, full browser behavior, external engine integrations or a million-user test. The demo uses a synthetic HTTP fixture, not a supplied real application.

No target application has yet been supplied. No remote attack, distributed test, cloud provisioning or model inference was run. Node checks were executed locally; the configured KHC route supports specific Python tasks, not this JavaScript test suite.

The generated k6 smoke script passed integration qualification using official k6 v2.3.0 on macOS arm64: exactly five requests observed on a disposable loopback fixture, exit code zero. Downloaded asset SHA-256 matched the GitHub release asset digest. The binary remains in the local research tools folder, outside the release package. Claude-host packaging is unqualified. Codex local installation is recorded in the local install receipt after completion. A host refresh/new chat may be needed to expose installed tools.

The standard Skill Creator validator initially could not import PyYAML from system Python. It passed using an isolated uv environment with PyYAML. That local YAML/artifact validation is outside the KHC source-only Python check contract.

Local Codex installation completed as `whatif@whatif-local` version 0.1.0. The installed MCP entrypoint was exercised through discovery and actual plan/run/verify calls against a self-owned loopback fixture; that integration test passed. This verifies the installed process, not that this already-running chat has refreshed its tool catalog. Host refresh/new chat is required for normal discovery.

The reference inventory completed with 26/26 clean Git working trees. Temporal's initial filtered checkout failed; bulk unfiltered refetch and checkout of the fetched revision repaired it. The final pinned revision is recorded in the manifest rather than inferred from the failed first attempt.
