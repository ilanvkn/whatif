# Security scope

WhatIF V1's built-in runner only sends bounded GET requests to literal loopback addresses. It does not follow redirects, import user scripts, launch shell commands from scenario text, send traffic to arbitrary external targets, or run exploit payloads. A loopback app can still have side effects: review routes and scope before execution.

The source scanner emits heuristic leads, not vulnerability confirmations. Its output omits source lines and response bodies/header values, but paths, statuses and hashes can still reveal project information. Keep case artifacts in project-owned storage. Evidence indexes detect byte changes; anyone who can rewrite the index can rewrite its hashes, so they are not signatures.

Active security work through other tools must match current authorization. Use synthetic accounts and controlled callbacks. The skill does not authorize persistence, real-data exfiltration or testing unrelated targets.

Until a public repository contact is configured, report issues privately to the repository owner rather than publishing credentials or exploit details in a public issue.
