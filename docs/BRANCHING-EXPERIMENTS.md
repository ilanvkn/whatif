# Branching experiments, beyond smoke tests

The useful narrative structure is: establish a world, change a pivotal condition, follow consequences, and compare outcomes. In software, the world is a versioned app and fixture; the condition is a controlled intervention; consequences must be measured. A compelling explanation is not evidence.

Research: Marvel's [official production brief](https://lumiere-a.akamaihd.net/v1/documents/what_if_production_brief_final_07-29-21_02c60f04.pdf) discusses building alternative stories around pivotal events. We studied the official brief and episode descriptions, not full episode scripts. No Marvel scripts, dialogue, art or characters are included in WhatIF. This is an original engineering workflow inspired by the general counterfactual structure.

## An experiment card

- Baseline: synthetic buyer checks out successfully.
- Divergence: payment API returns 503 to this browser.
- Invariant: never claim a charge succeeded; preserve the cart.
- Observed consequence: status assertion fails in the deliberately broken fixture.
- Correction: check the payment response before declaring success.
- Replay: the exact same campaign passes after the fixture correction.
- Unknown: actual provider outage recovery, real payment reconciliation and production capacity.

Branch `hypothesis` is required; optional `parentId` references an earlier branch. Engine configurations carry the actual change. Fresh browser contexts isolate browser state, but the application database is not automatically reset. Supply disposable fixtures and a cleanup plan before testing state changes in a real app. Avoid confounding changes when comparing branches.

## What else can WhatIF ask?

| Area | Question | Current execution |
|---|---|---|
| Dependency | What if payment is down, slow, or unreachable? | Browser-local status/delay/abort injection |
| User experience | What if the screen is narrow or motion is reduced? | Browser context and UI assertions |
| Geography | What if locale or timezone changes? | Browser context and declared assertions |
| Capacity | What if more sessions compete for the same read route? | Bounded actual k6 VUs and fixed requests |
| Identity | What if another account requests this record? | Owner/other/anonymous synthetic GET checks |
| Authentication | What if the session is missing? | Declared anonymous-denial checks |
| Transactions | What if retries charge twice? | Needs sandbox transaction ledger and cleanup adapter |
| Infrastructure | What if the region disappears? | Needs infrastructure fault and recovery adapter |
| Business | What if pricing doubles or a competitor launches? | Needs observed data and a calibrated causal model |
| Operations | What if a supplier fails or staffing halves? | Needs event simulation with validated constraints |
| AI | What if malicious instructions reach an agent? | Needs model/tool-boundary evaluation and spend limits |
| Adoption | What if the launch goes viral? | Needs behavioral hypotheses plus independent load evidence |

`whatif explore` / `whatif_explore` returns 16 experiment cards, each marked executable or planning-only. It does not simulate human behavior or forecast business outcomes merely by writing a narrative.

Technical foundations: [Playwright routing](https://playwright.dev/docs/network), [k6 shared iterations](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/shared-iterations/), and [OWASP object-level authorization testing](https://wstg.owasp.org/latest/4-Web_Application_Security_Testing/12-API_Testing/02-API_Broken_Object_Level_Authorization/).
