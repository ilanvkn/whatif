# Application scenario workflow

Inspect the app's own instructions, entry points, storage, auth, background jobs and deployment shape. Identify user journeys and real bottleneck candidates. Do not run package lifecycle scripts simply to inspect dependencies.

Use four separate layers:
- Functional: real browser/API outcomes, data correctness and permission checks.
- Capacity: traffic arrival rate, concurrency, think time, payloads, cache mix, queues and server resources.
- Resilience: dependency failure, timeouts, retries, idempotency and recovery.
- Security: source-informed adversarial cases with synthetic accounts and isolation.

Original smoke execution provides bounded status/header checks and source heuristics. V1.1 campaign adapters add real Playwright journeys, k6 execution and synthetic account-boundary tests; follow references/engines.md for their scope. Use the host's browser tools for real user flows when available. Browser assertions and k6 results require their own evidence, not the built-in runner's proof label.

## Population model

Registered population needs an active fraction. DAU needs sessions per user, requests per session and a peak factor. Peak request rate estimate = DAU × sessions/day × requests/session ÷ 86400 × peak factor. Concurrent sessions estimate = peak session arrival rate × mean session duration. Explicit simultaneous users instead need a session duration and per-session work. These are workload models, not measured capacity. Correlated bursts, streaming and long-lived connections need different workloads.

## k6 escalation

The generated script is a tiny reviewed smoke test with fixed iterations, exact target acknowledgement, zero redirects and no cloud upload. It is not a scaled execution adapter. Before large tests: define ownership, environment, allowed routes, data setup/cleanup, duration, max request rate, max VUs, cloud budget and abort thresholds. Pilot at low load, monitor generator saturation and server telemetry, then increase deliberately. Do not silently scale an illustrative workload.

Arrival-rate executors are useful for throughput questions; VU-based tests answer different questions. Count dropped iterations, not just successful response latency. One million concurrent users typically requires distributed generators and a qualified test environment. Do not allocate resources without a concrete reviewed plan and matching authorization.

Official reference: https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/

## Evidence gates

The runner measures time to response headers and expected HTTP statuses only. It does not validate bodies, full user journeys, authentication correctness, throughput under open arrival, distributed capacity or predictive accuracy. Store separate raw artifacts for every expanded check. Confirm sensitive data retention before enabling full request/response logging in external tools.
