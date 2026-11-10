# Backend release-candidate qualification

This RC extends WhatIF's independent AI repair loop to reviewed Python backends with real authentication and SQLite databases. It uses local copies of pinned open-source applications, synthetic accounts and actual HTTP requests. It does not contact public deployments or production accounts.

## Observed results

| Application | AI sessions | Epochs | Accepted repairs | HTTP requests | Reset/restart trials |
|---|---:|---:|---:|---:|---:|
| Microblog API |6|2|1|348|6|
| RealWorld Flask |6|2|1|116|6|
| Total |12|4|2|464|12|

All 12 reset checks and restart checks passed. Both original source trees remained unchanged, private databases were removed, and fresh-process verification accepted the evidence. Each run stopped after its second epoch found no remaining failure in the declared cases. Five failing branch contracts became repeated passes while healthy auth/CRUD controls stayed passing. These finite cases do not establish exhaustive correctness.

The runs reserved 468 requests and reported 245,018 input-plus-output tokens across 12 distinct provider sessions. Each permitted 2 epochs, 8 role calls, 4,000 requests, 15 minutes of epoch time, 120 seconds per model call and a 350,000 reported-token threshold. Actual model output and timing are not deterministic. Research and HTTP preflights are separate from these team totals.

The [public evidence summary](evidence/backend-rc-qualification.json) retains application pins, metrics, case transitions and source/evidence hashes. Absolute paths, source code, response tokens and model-session identifiers are omitted. Full receipts remain in project-owned local evidence. This derivative report is not a signed execution attestation.

## What changes in the runner

The API engine runs declared registration, login, reads and mutations with captured temporary tokens and immutable response assertions. A backend manifest pins source assets, editable files, an immutable bootstrap and the Python environment. The controller restores the same empty database before each confirmation, runs the complete baseline suite, stops its owned server, restarts against that database and verifies committed records. Both API and restart checks gate acceptance.

Fresh Codex red, blue and critic sessions select reviewed hypotheses, challenge measured failures and propose bounded source repairs. The controller applies a repair only to a disposable copy, reruns exact cases twice and requires a fresh critic decision. It then starts a further epoch against the accepted source. Passing a source-only check is insufficient.

macOS containment denies outgoing connections and child processes, constrains writes to private database storage and binds only the assigned loopback listener. Runtime hashes are checked around launches. Verification reconstructs campaign oracles, checks resets, SQLite integrity, process ownership, source/runtime hashes and removal of private databases/session secrets. Raw response tokens and database rows are not exported in public reports.

## Selected applications

- [Microblog API](https://github.com/miguelgrinberg/microblog-api), MIT, commit `e250d7115b47010ff0e7051d5868485fff4e32fb`: real registration, password hashing, bearer tokens and author-only mutation. The defect accepts nonpositive limits in cursor pagination while rejecting them in offset pagination. Negative values can remove the intended SQL row limit.
- [RealWorld Flask reference backend](https://github.com/DataDog/flask-realworld-example-app), MIT, commit `fff212220e9354bd358dd8e0fb0fcf5f32666192`: real password authentication, JWT and article CRUD. Anonymous, nonowner and missing-article deletion produce 500 responses. These are incorrect denial/not-found responses; unauthorized deletion was not observed. Deliberately vulnerable `/security` training routes are excluded and never invoked.

The prepared profiles preserve selected upstream source bytes and add an immutable bootstrap. Microblog uses Python3.12.15 because the Mac's older Python lacks the required scrypt implementation; password hashing was not weakened to work around that. RealWorld uses Python3.9.6 and a documented low bcrypt cost solely for disposable synthetic tests. Its SQLite preparation omits the unused PostgreSQL driver. These are explicit test profiles, not recommended production settings.

## Independent patch review

A separate reviewer inspected both accepted source diffs and executed 101 additional HTTP requests against new copies of the original and repaired applications. Different negative cursor values and timestamps, anonymous missing/existing resources, nonowner deletion with record readback, and successful owner deletion all behaved correctly after repair. All 4 additional restart checks passed and private databases were removed. These requests are separate from the 464 team-run requests.

Microblog's repair moves limit validation and capping before the pagination branch. RealWorld requires JWT for deletion and checks for a missing owned article before dereferencing it. Both are general source changes; no test-specific responses or relaxed assertions were found. [Candidate patches and upstream MIT notices](../examples/backends/patches/README.md) are included; both patches passed applicability checks against the pinned originals. No upstream submission was made.

## Lessons retained

A failure status alone does not prove an authorization bypass. Pair denial checks with surviving-record assertions and successful owner controls. Pagination limits must be checked consistently across cursor and offset paths. Tests must exercise invalid boundaries alongside healthy requests so blanket denial cannot count as a repair. Restart checks should read records written before termination; merely checking a health endpoint cannot establish persistence. Repeated tests need identical starting data, not a growing shared fixture.

The recipes and assertion contracts are reusable; findings are review evidence, not instructions to patch unrelated applications automatically. Exact pins, dependency locks and upstream licenses remain part of preparation.

## Scope and remaining release gates

This is finite local qualification on macOS, a single-process server and SQLite. It does not qualify PostgreSQL/MySQL, migrations under live traffic, background queues, OAuth/SSO, external services, multi-process races, multi-tenant deployments or distributed capacity. Browser and k6 integrations are separately regression-tested; the backend repair runs are API journeys, not a million-user load benchmark.

Initialization and runtime inspection precede the epoch wall-clock budget and have separate bounded subprocess deadlines. Requests are reserved before trials. In interrupted trials the completed-measurement request total can be a lower bound; partial campaign receipts must be inspected. Reported-token thresholds are checked between AI calls, not hard dollar/token caps. Separate AI contexts can use the same model weights. Hash receipts detect tampering and inconsistent claims; they are not signed independent attestations.

Publication and broader production qualification remain separate from preparing this local RC. No comparative 100× claim has been measured.

## Package regression checks

129 distinct tests pass across the core and optional-engine invocations:119 core checks plus10 real browser/k6 cases. The optional invocation also repeats4 shared checks. Coverage includes API capture/redaction/allowlists, actual SQLite reset and restart, containment, runtime tampering, cancellation, timeouts, cleanup, changed-oracle rejection, backend proof counters, dependency recipes and reversible RC installation.
