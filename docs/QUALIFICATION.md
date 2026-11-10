# V1.0 qualification

Date: 2026-11-10 (Asia/Kuala_Lumpur).

Executed locally with `/opt/homebrew/opt/node@22/bin/node`:

- 22 tests passed, including all nine MCP tools exercised against a self-owned HTTP fixture, exact suite traffic counts, stop-on-failure, skipped stages, fresh-process verification, nested evidence tampering, external-target refusal, mixed-target and aggregate-budget rejection, verified SLO comparison, per-route error detection and reviewed k6 export limits.
- Package manifests, skill frontmatter and linked references passed validation.
- Demo executed 20 requests across normal, protected and deliberately degraded routes. Normal and expected-authentication-denial checks passed; the deliberately degraded route failed. Separate-process verification passed.
- The previous four-tool MCP discovery assertion initially failed after adding five tools; updated discovery and added actual invocation coverage for all nine tools. Final suite passes.
- Default Homebrew Node failed before execution because a simdjson dynamic library was missing. Used the existing independent Node 22 installation; did not change global Node or libraries.

Scope: bounded local plugin integration. No production app, remote target, distributed load, exploit, browser journey, cloud job or behavioral simulation was executed. KHC supports specified Python checks, so these JavaScript checks ran locally.

The k6 export change is checked for honoring configured timeout/duration. Actual k6 execution was qualified for V0.1 only; V1 k6 execution has not been requalified. Claude host integration remains packaged but unqualified. Native tool discovery in an already-running chat may require a plugin refresh/new chat even after local installation.

V0.1 reports remain hash-verifiable. Their aggregate pass/fail semantics differ from V1 per-route checks; comparisons across evaluator versions are marked incomparable.
