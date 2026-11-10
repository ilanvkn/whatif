# V2.1 release checklist

Version 2.1.0 adds optional independent Codex red/blue/critic sessions, isolated fixture patching and measured replay. Existing adaptive labs retain deterministic roles. The release scope is a macOS disposable Node fixture (`examples/agent-app`), not arbitrary applications or autonomous production testing.

Before publishing, record evidence for each item:

- Package, Codex/Claude manifests, CLI and MCP report the same version; package validation and the full unit suite pass with Node 22+.
- CLI help and MCP discovery expose all 24 tools, including team planning, execution and verification. Invalid arguments fail before execution.
- Installer tests cover identical-stage retry, missing/transient Codex failures, descriptor rollback, prior receipt/release preservation and installed-version verification. Shipped tests run from a path containing spaces.
- Actual provider qualification records distinct session IDs, provider identity, usage completeness, red findings, blue patch proposals and critic evidence citations. Fake-provider tests are labeled as controller tests.
- The macOS fixture demonstrates a measured defect, isolated repair, unchanged oracles, repeated replay and a subsequent epoch. Original source remains unchanged. Rejected or failed patches roll back and processes stop.
- Fresh-process verification checks evidence integrity. Corruption, budget exhaustion, cancellation and provider failure remain visible; none become a success claim.
- README and skill state source disclosure, optional engine/authentication requirements, supported platform and fixture scope. Token thresholds are post-call checks; no hard token or dollar cap is advertised.
- Record finite executed tests separately from generated candidates. Do not claim million-user capacity, complete security, general app repair or superiority over MiroFish without relevant comparative evidence.
- Review the final tracked tree for credentials, generated evidence/source copies and unrelated files. Keep upstream research outside the release and retain provenance/license records.
- Verify the intended Git remote and publication authorization before pushing or announcing a release. Local package validation is not evidence of a published release or production qualification.

The source is original MIT code; optional engines and research references retain their own licenses. Claude-compatible packaging is included, but live host compatibility needs its own qualification. Public messaging must describe verified outcomes and unresolved limits rather than promise a universal simulator.
