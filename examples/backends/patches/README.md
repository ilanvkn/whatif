# Accepted backend repairs

These are reviewable patches produced by independent AI repair sessions and accepted only after real HTTP regressions, database reset checks, process restart checks and independent review. They are examples against pinned revisions, not an upstream endorsement or a guarantee of general security.

| Patch | Upstream | Pinned revision | Change |
|---|---|---|---|
| [microblog.patch](microblog.patch) | [miguelgrinberg/microblog-api](https://github.com/miguelgrinberg/microblog-api) | `e250d7115b47010ff0e7051d5868485fff4e32fb` | Validate nonpositive pagination limits before either offset or cursor queries; retain the positive page cap. |
| [realworld.patch](realworld.patch) | [DataDog/flask-realworld-example-app](https://github.com/DataDog/flask-realworld-example-app) | `fff212220e9354bd358dd8e0fb0fcf5f32666192` | Require authentication for article deletion and return not-found when no owned article matches. |

Both patches pass `git apply --check` against the exact unmodified upstream revisions. No patch includes the trusted local bootstrap, environment configuration, tests or a manufactured vulnerability. Both upstreams use MIT; their original notices are retained in [microblog-LICENSE.txt](microblog-LICENSE.txt) and [realworld-LICENSE.txt](realworld-LICENSE.txt).

Separate independent holdouts used 101 real HTTP requests across fresh original/accepted copies. Microblog negative `-2` and zero cursor limits failed on original source and passed on the accepted repair; positive pagination and authenticated CRUD remained healthy. RealWorld anonymous deletion of missing/existing articles, denied nonowner deletion with record readback, and successful owner deletion passed on accepted source; original anonymous deletion returned500. All four independent server-restart checks passed. Private SQLite state was deleted after each run. These independent checks are additional to the [recorded release qualification](../../../docs/evidence/backend-rc-qualification.json).
