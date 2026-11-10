# Prepare PostgreSQL and real queue scenarios

These recipes reconstruct the reviewed local applications for PostgreSQL17.11 on macOS. They do not initialize a database, run tests or invoke AI during preparation. Execution belongs to the owned PostgreSQL/backend runner; do not run these adapters directly against another database.

| Profile | Exact upstream | Runtime | Scope |
|---|---|---|---|
| `queue` | Procrastinate3.10.0, commit `8b6398329d915b7299c0d936e567facaebea8903` | Python3.12.15; 11 locked wheels | Actual PostgreSQL queue with two workers, four duplicate deliveries, declared lost-acknowledgment faults and a requested durable/idempotent sum enhancement |
| `realworld` | Flask RealWorld commit `fff212220e9354bd358dd8e0fb0fcf5f32666192` | Apple Python3.9.6; 41 locked wheels | Genuine article-favorite scoping defect and same-article concurrent mutations on PostgreSQL |

The queue's editable `demo/tasks.py` is copied unchanged from upstream `procrastinate/demos/demo_sync/tasks.py`. Upstream only prints sums; it does not promise our new durable-effect/retry contract. The custom HTTP adapter and fault injection are explicitly local testing components, not a claimed vulnerability in Procrastinate. The task repair must use actual queue retry behavior and actual business rows.

RealWorld carries forward the previously accepted [RC deletion repair](../backends/patches/realworld.patch). Its replacement `conduit/articles/views.py` is immutable here. The recipe pins both the original upstream Git blob and exact accepted replacement SHA256; provenance records this prerequisite rather than claiming a wholly unmodified checkout. Favorite logic remains original and is the only editable module. The PostgreSQL bootstrap is separate from upstream, uses a threaded local HTTP server, and accepts a Unix socket via SQLAlchemy's `host` connection parameter.

## Reconstruct without install hooks

Clone into fresh directories and select the exact commits:

```sh
git clone https://github.com/procrastinate-org/procrastinate.git /tmp/whatif-procrastinate
git -C /tmp/whatif-procrastinate checkout --detach 8b6398329d915b7299c0d936e567facaebea8903

git clone https://github.com/DataDog/flask-realworld-example-app.git /tmp/whatif-realworld-pg
git -C /tmp/whatif-realworld-pg checkout --detach fff212220e9354bd358dd8e0fb0fcf5f32666192
```

Use separately reviewed Python interpreters with the exact versions above. Set `WHATIF_PYTHON312` to an absolute Python3.12.15 executable, then create fresh environments. `/usr/bin/python3` was Python3.9.6 on the qualified Mac; verify your installation rather than assuming another machine matches.

```sh
"$WHATIF_PYTHON312" -m venv /tmp/whatif-queue-venv
/usr/bin/python3 -m venv /tmp/whatif-realworld-pg-venv

/tmp/whatif-queue-venv/bin/python -m pip download --only-binary=:all: --require-hashes \
  -r examples/postgres/recipes/queue/requirements.lock --dest /tmp/whatif-queue-wheels
/tmp/whatif-queue-venv/bin/python -m pip install --no-index --find-links /tmp/whatif-queue-wheels \
  --only-binary=:all: --require-hashes -r examples/postgres/recipes/queue/requirements.lock

/tmp/whatif-realworld-pg-venv/bin/python -m pip download --only-binary=:all: --require-hashes \
  -r examples/postgres/recipes/realworld/requirements.lock --dest /tmp/whatif-realworld-pg-wheels
/tmp/whatif-realworld-pg-venv/bin/python -m pip install --no-index --find-links /tmp/whatif-realworld-pg-wheels \
  --only-binary=:all: --require-hashes -r examples/postgres/recipes/realworld/requirements.lock
```

The wheel names/hashes cover the recorded macOS Python ABIs. A missing wheel is a qualification boundary; no source builds, project installation hooks or silent dependency upgrades are used. The RealWorld app's carried-forward dependency metadata is historical RC documentation; the runtime's authoritative PostgreSQL dependency lock is `recipes/realworld/requirements.lock`, which adds the PostgreSQL driver.

Select an existing reviewed PostgreSQL17.11 binary directory explicitly:

```sh
node scripts/prepare-postgres-app.mjs --app queue \
  --source /tmp/whatif-procrastinate --python /tmp/whatif-queue-venv/bin/python \
  --postgres-bin /opt/homebrew/opt/postgresql@17/bin --out /tmp/whatif-queue-prepared

node scripts/prepare-postgres-app.mjs --app realworld \
  --source /tmp/whatif-realworld-pg --python /tmp/whatif-realworld-pg-venv/bin/python \
  --postgres-bin /opt/homebrew/opt/postgresql@17/bin --out /tmp/whatif-realworld-pg-prepared
```

Output directories must be new, with existing parents, outside source/runtime/recipe directories. Preparation verifies Git HEAD, each selected upstream Git blob, local asset hashes, the accepted prerequisite, dependency metadata and exact Python/PostgreSQL versions. It copies the explicit allowlist and emits `app-spec.json` plus `provenance.json`. It never clones, installs dependencies, initializes a service, starts a worker, runs HTTP or calls a model. An existing venv's installed versions/tree are recorded; preparation does not retroactively attest that its installation used the referenced wheels.

Pass the prepared specification to `app-plan`, review the resulting asset/runtime/oracle pins, then execute the normal team workflow. The owned runner supplies `WHATIF_POSTGRES_CONNECTION`, private state paths, source identity inputs and separate server/worker modes. The fixture never assumes a shared PostgreSQL service or public listener. All users, credentials, articles and queue effects are synthetic. Queue auth uses a deliberately fixed fixture bearer value; it is not a production authentication design.

Original upstream MIT notices are retained in each recipe's `UPSTREAM-LICENSE.txt` and copied into prepared application assets. Finite local correctness/concurrency tests do not establish production capacity, general security, or exactly-once distributed execution beyond the checked idempotent business effect.
