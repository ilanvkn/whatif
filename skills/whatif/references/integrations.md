# Engine selection

The runtime is original and dependency-free. Reference clones do not become installed engines, and their code/licenses are not merged into this plugin.

- Social reactions: MiroFish/OASIS or TinyTroupe; use comparable populations and repeated trials. Never interpret agent agreement as calibrated probability.
- Explicit rule-based systems: Mesa; encode resource, scheduling and behavioral assumptions.
- Numeric forecasting: NeuralForecast; compare simple baselines with time-separated validation.
- Causal intervention: DoWhy; state identification assumptions and data limits.
- Event forecasts: Metaculus forecasting-tools; use explicit resolution criteria, scoring and calibration.
- Evidence ingestion: Docling for files; choose Scrapling or Crawl4AI for permitted web collection; Local Deep Research for orchestration.
- Memory/reliability: evaluate Graphiti, Temporal and Langfuse when scale and queries justify the dependencies.
- Application load: k6 or Locust, installed and qualified separately. V1.1 has a bounded local k6 adapter; distributed million-user execution is not built in.
- Security: Semgrep for source analysis and ZAP for scoped web checks; neither proves absence of flaws.

For each future integration declare version/license, install requirements, data destinations, cost/traffic limits, cancellation, output schema and proof level. Preserve a shared run ID, source hashes, configuration, raw evidence and uncertainty across engines. If unavailable, produce a concrete plan and label the stage unexecuted rather than fabricating results.
