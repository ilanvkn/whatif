# PostgreSQL, queues and concurrent-user qualification

This release extends the existing reviewed backend workflow to PostgreSQL 17, separately owned queue workers and bounded concurrent API users on macOS. All trials use private disposable local clusters and synthetic inputs. No company service, public deployment or production account is a test target.

## Observed results

| Target | AI sessions | Epochs | Accepted repairs | HTTP requests | Reset trials | Passing restart checks |
|---|---:|---:|---:|---:|---:|---:|
| Procrastinate shipped sum demo |6|2|1|42|6|4 of 6|
| RealWorld Flask backend |6|2|1|240|6|4 of 6|
| Total |12|4|2|282|12|8 of 12|

All eight post-repair restart checks passed. The four pre-repair checks correctly retained the original failing behavior. Both runs finished their second epoch with no failure in the declared cases; original source stayed unchanged and private database/socket/secret cleanup verified. Four-user request overlap was observed, with a measured peak of four in-flight requests. Queue trials launched 24 separately owned worker processes across six confirmations and their restarts; this is repeated local execution, not 24 simultaneous workers.

The runs reserved 516 requests and reported 227,021 input-plus-output tokens across 12 distinct provider sessions. Each permitted two epochs, eight calls, 20 minutes of epoch time, 180 seconds per model call, 3,000 requests and a 300,000 reported-token threshold. These thresholds are not hard billing limits. Requests and model output are finite observations, not a capacity guarantee.

[Public qualification evidence](evidence/postgres-qualification.json) retains exact upstream revisions, case transitions, source/evidence bindings, reset/restart/worker counters and measured overlap. Absolute paths, provider-session identifiers, prompts, source snapshots, tokens and database rows are omitted. Full project-owned local evidence remains separate.

## Failed attempts and corrections

The initial RealWorld PostgreSQL bootstrap mistakenly encoded a Unix-socket directory as a network hostname. The prepared adapter was corrected and replanned. Early trials used an expensive runtime-check implementation and a 10-second startup window; subsequent bounded checks and a 30-second startup window resolved the integration issue. Those attempts are not counted as passing qualification.

A later RealWorld AI run executed three provider sessions and recorded 158 requests, but its final critic prompt exceeded the unchanged 60,000-character limit. The controller rolled back the otherwise passing candidate. That stopped run is excluded from the qualified totals above. Its reported 62,571 tokens and partial/lower-bound traffic accounting remain recorded locally.

The prompt assembler now avoids duplicated source text while retaining every confirmation and concurrent-user outcome. Reconstructing the failed prompt offline reduced 82,613 characters to 49,434 under the same limit. RealWorld then completed a fresh bounded run from its original prepared source. No failed evidence or test oracle was rewritten to manufacture success.

The verifier was aligned with the stronger app-role/SCRAM initialization receipt and now requires those security fields. Cleanup was hardened to preserve repeated-cleanup receipts and attempt every remaining worker, HTTP process, rollback and database cleanup after an earlier cleanup error.

## Execution and acceptance

The controller creates a private PostgreSQL cluster with TCP disabled and a private Unix socket. The application role cannot become a superuser, create roles/databases, read server files or execute server programs. The separate controller administrator uses a generated SCRAM secret outside the application's readable paths. Runtime binaries, supporting libraries and selected application files are pinned. PostgreSQL may fork its own server children; application and queue-worker processes cannot spawn arbitrary child processes.

Application initialization creates a real schema. WhatIF stops PostgreSQL cleanly, checks page checksums and seals a cold database seed. Before each confirmation it restores the exact physical seed and checks the restored hash and logical table counts. The main API journey then runs against the real application. Servers and workers are stopped; PostgreSQL and the app restart against the same committed data; an immutable restart journey checks persistence. Temporary clusters, sockets, application state and administrator secrets are removed afterward.

Each AI repair still requires two failure confirmations, an independent critic, an allowlisted source patch, two exact replays and another critic decision. A further epoch evaluates the accepted source. The models cannot edit test assertions, bootstraps, worker fault injection, dependencies or evidence. Original source remains untouched.

The API engine supports up to 20 independent users and up to 100 total requests per branch. Each user has separate captured values and cookies. Optional step barriers synchronize client requests; polling has explicit attempt and interval limits. Evidence records request intervals, maximum in-flight requests and overlapping users. These prove client-request overlap, not simultaneous database execution or production capacity.

## Applications and contracts

RealWorld uses the pinned DataDog Flask reference backend with the previously accepted article-delete fix and a separate immutable PostgreSQL/threaded-server bootstrap. Its favorite-scoping checks target a genuine source defect: whether a user's favorite on one article incorrectly affects another article. Positive authentication/CRUD controls and concurrent users remain part of the immutable suite. Deliberately vulnerable training routes are excluded.

The queue trial uses Procrastinate 3.10.0 and the exact shipped `demo_sync/tasks.py`, with a separately reviewed HTTP/worker adapter. The original demo prints a sum; durable storage and retry idempotency are an explicitly requested enhancement, not a defect attributed to Procrastinate. Two owned worker processes handle queued jobs. Immutable middleware raises one declared exception after each job callback returns, representing a lost acknowledgment after a possible business effect. Four duplicate deliveries must eventually succeed while producing one durable correct result. The task repair may add bounded retries and idempotent persistence; it may not modify queue internals, fault records or job states.

[Reproduction recipes](../examples/postgres/README.md) retain exact commits, selected source hashes, upstream licenses, dependency wheel locks and test-profile differences. Preparation executes no install hooks. Existing environments are fingerprinted; their historical installation source is not retroactively attested.

## Independent follow-up review

A separate reviewer executed 50 additional actual HTTP requests against fresh copies of the accepted sources. Queue checks used two unseen operand pairs with eight jobs, eight lost acknowledgments and 16 execution attempts, retaining exactly two correct durable results. RealWorld checks used new users/articles, repeated operations and four-client concurrent favorite and unfavorite, preserving other users' associations and unrelated articles. Both restart checks and all private-state cleanup checks passed.

The [sanitized independent review](evidence/postgres-independent-review.json) binds these outcomes to source and patch hashes. [Candidate patches with MIT notices](../examples/postgres/patches/README.md) apply cleanly to their pinned upstream modules. The queue patch requires the explicitly documented prepared connection adapter and business table; it is not a standalone library-wide fix. No upstream patch submission was made.

## Operational limits

These are local, finite macOS/PostgreSQL 17 experiments. They do not qualify Linux isolation, distributed workers, PostgreSQL failover, Redis/RabbitMQ, remote services, OAuth, online migrations, production cleanup or million-user capacity. Queue delivery-fault injection is an explicit controlled experiment, not a real network outage. A single durable effect under declared duplicate/retry cases does not establish universal exactly-once delivery.

Private setup and runtime inspections precede the epoch budget and have bounded subprocess deadlines. Token thresholds are checked between model calls and do not impose hard monetary limits. Interrupted request totals may be lower bounds and must be read alongside partial campaign receipts. Local hashes and source/runtime bindings establish consistency, not signed independent execution attestation.

## Release regression checks

The release runs the complete core suite and the separately enabled real browser/k6 cases. An archive test initially hit a two-second mock-provider startup deadline while testing invalid output; non-timeout mock cases now allow ten seconds, while the dedicated timeout test still uses 200 milliseconds and the cancellation assertion is unchanged. This is test-fixture startup tolerance, not a relaxation of application assertions or production call budgets. Failed logs are retained locally.
