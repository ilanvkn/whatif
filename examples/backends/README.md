# Reproduce the backend release-candidate fixtures

These recipes prepare the exact open-source applications used for the macOS SQLite trials. They preserve upstream code and add a clearly separate, immutable WSGI bootstrap. They are bounded test fixtures, not production deployment recipes.

| Fixture | Upstream commit | Qualified Python | Dependencies |
| --- | --- | --- | --- |
| Microblog API | `e250d7115b47010ff0e7051d5868485fff4e32fb` | 3.12.15, macOS arm64 | 35 pinned wheel distributions |
| Flask RealWorld | `fff212220e9354bd358dd8e0fb0fcf5f32666192` | 3.9.6, Apple Command Line Tools, macOS arm64 | 40 pinned wheel distributions |

Both upstream projects use MIT licenses; the preparer retains their notices. The immutable bootstrap, exact copied file hashes, wheel names and dependency hashes are recorded in each `recipes/<fixture>/` directory. The RealWorld SQLite profile omits the PostgreSQL-only `psycopg2` requirement and does not install `ddtrace`. Existing historical dependency pins are preserved for reproduction; they are not a recommendation to deploy these versions publicly.

## Acquire source and an explicit runtime

Run these commands in fresh directories. Do not reset another working checkout with unpublished changes.

```sh
git clone https://github.com/miguelgrinberg/microblog-api.git /tmp/whatif-microblog-upstream
git -C /tmp/whatif-microblog-upstream checkout --detach e250d7115b47010ff0e7051d5868485fff4e32fb

git clone https://github.com/DataDog/flask-realworld-example-app.git /tmp/whatif-realworld-upstream
git -C /tmp/whatif-realworld-upstream checkout --detach fff212220e9354bd358dd8e0fb0fcf5f32666192
```

Supply already installed, reviewed interpreters with the exact versions above. For example, set `WHATIF_PYTHON312` to your absolute Python 3.12.15 executable path. On the qualified Mac, `/usr/bin/python3` resolves to Apple's Python 3.9.6; check the version on your machine first. The preparer rejects another version until a new runtime recipe is explicitly qualified.

```sh
"$WHATIF_PYTHON312" --version
"$WHATIF_PYTHON312" -m venv /tmp/whatif-microblog-venv
/usr/bin/python3 --version
/usr/bin/python3 -m venv /tmp/whatif-realworld-venv
```

Microblog requires `hashlib.scrypt` through its existing password hashing implementation. Apple's Python 3.9.6 lacks it. Do not change password hashing or disable authentication to make the wrong runtime pass. RealWorld uses bcrypt and passed with 3.9.6; its urllib3 dependency emits an Apple LibreSSL warning. Outbound TLS is not exercised or allowed by these fixtures.

## Explicit, wheel-only dependency setup

From the WhatIF repository, download only the locked wheels, then install from that local directory with hash checking. These are explicit user-run setup commands; `prepare-backend.mjs` never downloads, installs, builds, or runs upstream hooks.

```sh
/tmp/whatif-microblog-venv/bin/python -m pip download \
  --only-binary=:all: --require-hashes \
  --dest /tmp/whatif-microblog-wheels \
  -r examples/backends/recipes/microblog/requirements.lock
/tmp/whatif-microblog-venv/bin/python -m pip install \
  --no-index --find-links /tmp/whatif-microblog-wheels \
  --only-binary=:all: --require-hashes \
  -r examples/backends/recipes/microblog/requirements.lock

/tmp/whatif-realworld-venv/bin/python -m pip download \
  --only-binary=:all: --require-hashes \
  --dest /tmp/whatif-realworld-wheels \
  -r examples/backends/recipes/realworld/requirements.lock
/tmp/whatif-realworld-venv/bin/python -m pip install \
  --no-index --find-links /tmp/whatif-realworld-wheels \
  --only-binary=:all: --require-hashes \
  -r examples/backends/recipes/realworld/requirements.lock
```

No project installation (`pip install .`) is needed. A missing wheel or hash mismatch is a setup failure; do not silently permit source builds or substitute package versions. The locks cover the qualified macOS architectures and Python ABIs, not arbitrary operating systems.

## Prepare disposable app specifications

Each output must be new, outside the upstream checkouts and Python runtimes, with an existing parent directory.

```sh
node scripts/prepare-backend.mjs --app microblog \
  --source /tmp/whatif-microblog-upstream \
  --python /tmp/whatif-microblog-venv/bin/python \
  --out /tmp/whatif-microblog-prepared

node scripts/prepare-backend.mjs --app realworld \
  --source /tmp/whatif-realworld-upstream \
  --python /tmp/whatif-realworld-venv/bin/python \
  --out /tmp/whatif-realworld-prepared
```

Output consists of `app/`, `app-spec.json`, and `provenance.json`. The script requires exact upstream HEAD, verifies each selected file against both its pinned Git blob and the recipe hash, and copies only the manifest allowlist. It rejects changed selected source, scope expansion, unexpected installed distributions and reused output directories. It substitutes only the canonical prepared source and selected Python executable in the existing example specification.

Dependency versions are checked from installed distribution metadata without importing application packages. The complete venv/base-runtime tree, including bytecode, is fingerprinted. This binds the runtime used for a subsequent plan; it does not attest that an already existing venv was originally installed from the referenced wheel archives. The explicit hash-locked setup above establishes reproducible package inputs.

Preparation does not initialize the database, start the application, test endpoints, or call AI agents. Pass `app-spec.json` into `app-plan`, then use the normal reviewed team execution flow. Do not directly run the bootstrap outside the qualified runner.

## Fixture boundaries

The immutable bootstrap reads `WHATIF_MODE=init|serve`, `WHATIF_DATA_DIR`, `WHATIF_PORT` and `WHATIF_SOURCE_FILES`. Init creates the application's real empty SQLite schema. Serve binds the real WSGI application on loopback, without debugger/reloader, and emits a source identity receipt after binding. The runner restricts reads to reviewed code/runtime, confines writes to the disposable database directory, blocks outbound connections and subprocess creation, and resets the exact seed before each confirmation. Restart checks retain the same working database. Private database and session-secret files are removed after final inspection; reports retain hashes and aggregate counts, not rows.

Microblog keeps authentication enabled, suppresses mail, disables OAuth/CORS, and uses an explicitly synthetic local secret. Its measured defect concerns cursor pagination validation; authenticated users may read other users' posts, so owner-only reads are not invented as a contract.

RealWorld selects SQLite, disables debug/exception propagation, uses bcrypt rounds 4 for disposable-fixture speed and generates a per-dataset secret inside the private data directory. Its intentionally vulnerable `/security/*` demo routes remain unmodified but are excluded from the test scope. The measured article-delete failures concern denial/not-found error handling, not a demonstrated ownership bypass.

Neither profile qualifies PostgreSQL, production concurrency, external services, mail, OAuth, remote tracing, outbound TLS, or deployment hardening. Preparation and finite passing trials are not universal security attestations.
