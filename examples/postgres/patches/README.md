# Reviewed PostgreSQL and queue repairs

These patches come from accepted independent AI repair sessions against pinned source. The controller required repeatable HTTP regressions, fresh database resets and actual process/database restarts. They are scoped examples, not an upstream endorsement or a general production-security guarantee.

| Patch | Upstream revision | Scope |
|---|---|---|
| [queue.patch](queue.patch) | [Procrastinate](https://github.com/procrastinate-org/procrastinate/tree/8b6398329d915b7299c0d936e567facaebea8903), `8b6398329d915b7299c0d936e567facaebea8903` | Extend the shipped sum demonstration with bounded retries and a durable, operand-keyed PostgreSQL result. |
| [realworld.patch](realworld.patch) | [Flask RealWorld](https://github.com/DataDog/flask-realworld-example-app/tree/fff212220e9354bd358dd8e0fb0fcf5f32666192), `fff212220e9354bd358dd8e0fb0fcf5f32666192` | Scope favorite reads to the article/user pair and serialize favorite mutations using an existing article-row lock. |

Both diffs pass `git apply --check` against their exact pinned upstream files. MIT notices are retained in [queue-LICENSE.txt](queue-LICENSE.txt) and [realworld-LICENSE.txt](realworld-LICENSE.txt).

The queue case is an explicitly requested enhancement, **not a discovered Procrastinate bug**. Its baseline task is the unchanged upstream print-only example. The diff uses the upstream `procrastinate/demos/demo_sync/tasks.py` path; our prepared application maps that file to `demo/tasks.py`. The repair requires the reviewed preparation recipe's `connection_kwargs` adapter and `whatif_effects` table. Textual applicability alone does not make this a standalone upstream deployment patch. The trusted adapter injects one lost acknowledgment after each job's first completed callback. A callback may execute twice; the tested guarantee is one final durable business row per operand key, not exactly-once execution.

The RealWorld case fixes a natural article-isolation defect and concurrent check-then-insert behavior. Its prepared baseline also includes the previously accepted [article-deletion repair](../../backends/patches/realworld.patch), which this new models-only patch leaves unchanged. The favorite repair uses the existing schema and application transaction boundaries; it does not assume a uniqueness migration occurred. Writers bypassing these application methods are outside the tested contract.

See the [preparation recipes](../README.md) and [independent HTTP review](../../../docs/evidence/postgres-independent-review.json) for exact source identities, additional unseen-input checks, request counts, restart and cleanup outcomes, and limitations. Failed original-source controls and the unsuccessful first RealWorld AI attempt remain recorded separately from qualified repairs. Overlapping client requests are measured; they are not proof that every database transaction overlapped.
