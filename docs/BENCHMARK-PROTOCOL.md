# Measuring whether WhatIF is better

A scenario count is not a quality score. Use the same owned apps, known defects, withheld regression checks and spending/traffic limits for every compared system. Record the exact released versions and commands. Compare only capabilities both systems actually attempt; an unsupported task is coverage information, not a fabricated failure score.

## Initial benchmark set

| Application question | Current executable route | Additional qualification needed |
|---|---|---|
| What if payment fails while buying? | Browser intervention, assertions, AI fixture repair | Real payment staging adapter and transaction cleanup |
| What if a different account requests my record? | Synthetic-account boundary checks and AI fixture repair | More resource models and field-level leakage assertions |
| What if traffic rises or clients retry? | Bounded local k6 and browser retry caps | Arrival-rate workloads, distributed generators and capacity calibration |
| What if layout, locale or timezone changes? | Reviewed browser mutations and repeated assertions | Representative application-specific assertions |
| What if the fix passes visible tests but breaks another case? | Immutable repeated cases and fixed semantic checks | Independently authored hidden tests across multiple frameworks |
| What if the reviewer or model is wrong? | Separate role contexts, evidence citations, controller gates | Diverse model providers and blinded human adjudication |
| What if a dependency recovers after a real outage? | Browser-local fault only | Server-side fault injection and state recovery verification |
| What if real users change their behavior? | Scenario planning only | Calibrated behavioral data and validated simulation |

## Scorecard

Use defect precision/recall against an independently held defect inventory; accepted repairs that survive hidden regressions; reproducibility rate; false success claims; scope/budget violations; time to a verified repair; actual model usage and billed cost; and executed cases as a fraction of the reviewed space. Include rejected patches, model failures and interrupted runs. Distinguish symptoms from distinct root causes.

Run multiple seeds with matched budgets, preserve every trial and report uncertainty and distribution, not only the best example. Have reviewers score anonymized evidence before revealing the product. Publish raw synthetic fixtures, immutable oracle identities, commands and aggregate results without credentials or provider account identifiers.

The current two-defect fixture qualifies integration behavior. It is too small and known to the implementers to establish a comparative product advantage. No “100× better” claim is supported yet.
