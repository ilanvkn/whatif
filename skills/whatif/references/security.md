# Authorized adversarial review

Apply an attacker's reasoning to the specified app: enumerate trust boundaries, assets, entry points and abuse cases. Source review and threat modeling can proceed without a live target. Live checks need current authorization matching the target and test actions. A general request to build this plugin does not authorize attacks on arbitrary applications it later encounters.

Prefer isolated staging, synthetic accounts and records, bounded request counts and reversible changes. Establish recovery and stop conditions for state-changing tests. Do not test unrelated hosts, exfiltrate real data, establish persistence or evade monitoring as a default workflow.

Useful test matrix:

| Boundary | Concrete check | Evidence required |
|---|---|---|
| Tenant/account isolation | Account A requests B's synthetic record | Expected denial plus actual response and identity context |
| Authentication | Missing, expired and revoked session on known protected route | Route contract and responses |
| Injection | Trace controlled input to query/shell/template sink | Source flow plus harmless reproduction in authorized environment |
| SSRF | URL reaches only intended destinations | Controlled callback fixture and outbound request evidence |
| Abuse | Duplicate submission, retries, race and rate-limit bypass | Bounded concurrent trace and final state |
| Data handling | Canary appears in unintended error/log/export | Redacted locator; no real sensitive material |

Classify: observed configuration, unverified review lead, reproduced failure, or unknown. Missing CSP is context-dependent; it is not an exploit demonstration. `eval` can be safe or unsafe depending on input flow; inspect before recommending removal.

Semgrep and ZAP are optional separately installed tools. Review rule set, scope and active/passive behavior before execution. Do not treat cloned tool source or a successful invocation as a completed security assessment. Proposed payloads and expected outcomes should be reviewable; reports should contain minimal evidence sufficient to reproduce safely.
