# Independent AI teams (2.1)

The optional team runner uses fresh Codex CLI sessions for red, blue and critic roles. Separate session identity and context do not imply different models or independent model weights. The existing adaptive lab still uses deterministic policies.

The supported qualification target is `examples/agent-app` on macOS with Node 22+, the macOS sandbox, a compatible authenticated Codex CLI and the separately configured Playwright engine. This is a disposable synthetic fixture, not a general application repair platform. Do not substitute company applications, production services or real accounts.

Discover `whatif_team_plan`, `whatif_team_run` and `whatif_team_verify`. CLI equivalents, from the plugin root:

```sh
node src/cli.mjs team-plan --source "$PWD/examples/agent-app" --out /tmp/whatif-team
# Review team.json and the exact canonical app.source before running.
node src/cli.mjs team-run --team /tmp/whatif-team --ack-source "$PWD/examples/agent-app"
node src/cli.mjs team-verify --team /tmp/whatif-team
```

Planning reads the reviewed source and creates a new exclusive directory without model calls or test traffic. Execution discloses the allowlisted source and test evidence to the configured Codex provider using existing authentication. Apply current user authorization for that source disclosure and inference use; do not assume authentication grants permission for unrelated data or unlimited spend. The acknowledgement must exactly match `app.source` in `team.json`, including canonical path resolution.

Red selects reviewed test candidates. The controller runs real browser/security checks and fixed contract checks. A fresh critic session challenges findings against evidence IDs. Blue proposes complete replacement contents for allowlisted files with exact base hashes. Only the controller applies patches to the disposable checkout; the original source stays untouched. The controller reruns the same tests and contract checks, obtains another critic verdict, retains accepted repairs and rolls back rejected ones. Later epochs test the resulting revision. No role can redefine the test oracle to force a pass.

Review epoch, call, request, input/output and time budgets in `team.json`. The reported-token threshold is checked between calls and may be exceeded by a single call. Missing usage is unknown, not zero. There is no hard token or dollar cap; stopping a local process is not a provider billing guarantee. Do not silently launch successor runs to bypass limits.

Read `run/summary.json`, `run/epochs.json`, role receipts in `run/calls.json`, nested campaign evidence and `run/final-source.json`. An accepted repair requires measured replay and a critic acceptance. Report stop reasons, failed calls, usage completeness, actual session IDs and accepted/rejected patch counts. A fixture pass does not prove arbitrary application security, full coverage, million-user capacity or superiority over MiroFish. Keep fake-provider tests distinct from real-provider qualification.

A run directory is single-use, including interrupted runs. Preserve it and plan a new directory for an intentional retry. Verification checks recorded integrity; it neither repeats the experiments nor authenticates claims cryptographically. Review any accepted patch before applying it outside the disposable checkout.
