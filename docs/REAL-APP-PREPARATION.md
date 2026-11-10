# Prepare the pinned real applications

The preparer copies reviewed files from existing local Git checkouts into a new disposable application directory. It does not clone, download, install dependencies, run hooks, build applications, start a browser, or call a model. Run it from the WhatIF repository with Node 22 or newer and Git available on PATH.

Acquire the exact upstream revisions first. Use fresh directories; do not reset an existing working checkout with unpublished changes.

```sh
git clone https://github.com/tastejs/todomvc.git /tmp/whatif-todomvc-upstream
git -C /tmp/whatif-todomvc-upstream checkout --detach ff43b02e59dfa604386bb382034b2cd07c2bcd8a

git clone https://github.com/jbt/markdown-editor.git /tmp/whatif-markdown-upstream
git -C /tmp/whatif-markdown-upstream checkout --detach 58aa8bfe18c5a30af2c6fb08221b00b841688dd9

git clone https://github.com/NextStepWebs/codemirror-spell-checker.git /tmp/whatif-dictionaries-upstream
git -C /tmp/whatif-dictionaries-upstream checkout --detach 76b6450a6395c86524dee19de4bf478336df4bbf
```

Prepare either application. Each output path must be new, its parent must already exist, and it must be outside the upstream checkouts.

```sh
node scripts/prepare-real-app.mjs \
  --app todomvc \
  --source /tmp/whatif-todomvc-upstream \
  --out /tmp/whatif-todomvc-prepared

node scripts/prepare-real-app.mjs \
  --app markdown \
  --source /tmp/whatif-markdown-upstream \
  --dictionaries /tmp/whatif-dictionaries-upstream \
  --out /tmp/whatif-markdown-prepared
```

Each output contains:

- `app/`: selected source, runtime assets and original license notices.
- `app-spec.json`: the checked-in `examples/real-apps/<app>.json` template with `app.source` set to the canonical prepared path. Its reviewed source files, asset allowlist, contracts, browser journeys and budgets remain from the template.
- `provenance.json`: repository pins, template hash and per-file original Git paths, commits, byte lengths and SHA-256 hashes.

The preparer requires the exact Git HEAD and byte-compares every copied file with its blob at that commit. Modified selected files, unexpected template assets and reused output paths fail. Files outside the allowlist, including untracked files and Git metadata, are never copied. Unrelated working-tree changes are not a whole-repository cleanliness assertion; the copied bytes are what is verified. Preparation preserves application behavior and does not inject a defect.

## TodoMVC scope

The selected application is `examples/javascript-es5/dist` at `ff43b02e59dfa604386bb382034b2cd07c2bcd8a`. Eleven checked-in runtime files are copied without a build; root `license.md` is preserved as `app/LICENSE` (MIT). Only `store.js` is editable in the application template.

The upstream example explicitly documents in-memory storage. Persistence is a requirement enhancement measured against TodoMVC's broader application requirements, not a newly discovered security vulnerability. Healthy creation and completion must continue working after any persistence repair. The base script requests `/learn.json`, which is intentionally absent; no remote learn metadata is fetched.

## Markdown editor scope

The selected application is `jbt/markdown-editor` at `58aa8bfe18c5a30af2c6fb08221b00b841688dd9` (ISC). The preparer copies 34 reviewed files rather than the entire repository. Only `index.js` is editable. The ordinary Markdown preview remains the healthy control; the italic toggle is a natural existing delimiter-handling defect.

The vendored spell checker contains two unversioned CDN dictionary URLs. Its local mirrors serve `vendor/en_US.aff` and `vendor/en_US.dic`, copied from `dist/` in the pinned official dictionary repository. That project's `LICENSE` is preserved as `vendor/dictionary-LICENSE`. This records the upstream distribution notice; it is not a separate legal audit of dictionary data. The unchanged browser template explicitly maps only those two URLs to local assets and blocks other external requests.

These preparations qualify the measured offline asset set, not current CDN availability. Emoji images and the remote equation renderer are outside these initial journeys; adding them requires a reviewed asset and request scope. Raw HTML support is deliberate upstream behavior and is not labeled a vulnerability here.

Preparation alone is not an application test or security attestation. Use the generated specification in the team planning flow, review source disclosure and budgets, and inspect the resulting browser and model receipts before claiming an observed repair.
