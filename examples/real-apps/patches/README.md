# Reviewed source repairs

These are composite patches exported from accepted WhatIF AI repairs. They are not upstream submissions and were not applied to the original clones.

- `todomvc-durability.patch`: tastejs/todomvc at ff43b02e59dfa604386bb382034b2cd07c2bcd8a, MIT. Updates both identical source and checked-in distribution copies. Adds persistence plus current-session fallback when storage writes fail. This changes the deliberately memory-only variant's behavior. Full UI tests executed the distribution copy; patch applicability to both paths was checked without applying it.
- `markdown-formatting.patch`: jbt/markdown-editor at58aa8bfe18c5a30af2c6fb08221b00b841688dd9, ISC. Corrects delimiter lengths and task-list conversion for Unicode/inline formatting.

Upstream notices are included. Inspect patches and run your own application's tests before adopting them. Browser storage can still be unavailable or corrupted; the patch does not guarantee durable writes when the browser refuses them, nor merge concurrent tabs. The full app suite remains finite and scoped.

To check applicability on the exact upstream revision:

```sh
git apply --check /absolute/path/to/the.patch
```

Do not automatically apply patches to another project based on a similar symptom. See the V3 qualification report for provenance, actual replays and remaining gaps.
