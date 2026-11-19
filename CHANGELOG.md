# Changelog

All notable changes to this project. Format: Keep a Changelog 1.1.
Versions follow Semantic Versioning; no release is tagged yet.

## [Unreleased]

### Changed
- 2026-11-08: Adopted the portfolio standard v2. README opens with the
  question, headline (with Wilson 95% intervals), field, job family and
  verdict (Functional, pre-registered). REPORT.md gathers the old README
  body, RESEARCH.md, ROADMAP.md and docs/research-review.md, which are
  removed after the move (DECISIONS.md D12). The scored self-assessment
  in AUDIT.md and the review's rubric ratings left the public repo
  (scores are internal). The lock is tagged proposal-v1 on fee401d, and
  tests/test_layout.py fails if SPEC.md or HYPOTHESES.md changes by one
  byte. CI checks that RESULTS.md and results/summary.json regenerate
  unchanged and builds the dashboard. CodeQL and Dependabot added; main
  protected.

### Added
- 2026-11-07: Live dashboard in site/ with an in-browser policy
  playground; its build fails unless the JS port of policy.rego
  reproduces the recorded conftest run file by file. Pages workflow.
- 2026-11-07: tests/test_results_consistency.py recounts summary.json
  from the per-run, per-trial and per-record arrays.
- 2026-11-07: Research review with fixed and remaining gaps (now in
  REPORT.md, "Review").
- 2026-11-06: Lab, harness, corpus and measured results for RQ1 to RQ3
  (90bf39e); README, AUDIT and the claim-check record (e631c98).
- 2026-11-06: Pre-registration: SPEC.md and HYPOTHESES.md (fee401d),
  before any code or result.

### Security
- 2026-11-07: Pinned vite to 6.4.5 to clear the esbuild dev-server
  advisory.
