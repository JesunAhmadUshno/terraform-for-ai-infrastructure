# Research review

Date: 2026-11-07. Scope: the repository as of the live-dashboard change. Graded against a PhD-level empirical rubric. Every gap that could be closed without engines, cloud spend or long runs is closed in this change; each remaining gap names the exact compute or data it needs.

## Overall grade

About 6,500 to 7,000 on the 10,000 scale used in AUDIT.md (AUDIT self-grade: 7,350). The pre-registration, provenance hashes and honest reporting of the expected misses are strong. Inferential statistics were absent and two of the four results are largely fixed by the study design, which caps the grade.

| Criterion | Grade | Evidence and reasoning |
| --- | --- | --- |
| Research questions | Strong | RQ1 to RQ3 are specific and measurable (HYPOTHESES.md). |
| Hypotheses and pre-registration | Strong | SPEC.md and HYPOTHESES.md committed in fee401d, before the harness and results in 90bf39e. Thresholds and expected misses declared in advance. |
| Method | Adequate | Clean, deterministic harness with normalised plan and state hashing. Construct validity is weak for RQ2 and RQ3 (below). |
| Baselines | Adequate, improved | RQ2 has a naive file-exists baseline (9 of 54). RQ3's syntax-only baseline was only asserted; it is now computed. |
| Statistics and uncertainty | Weak, improved | No intervals were reported. Wilson 95% intervals are now computed for every proportion. |
| Reproducibility | Good | Seeded mutation list, generated RESULTS.md, pinned provider, tool versions in AUDIT.md. Raw plan and state JSON for RQ1 are not committed. |
| Threats to validity | Adequate | README lists the single provider and single drift engine. Construct-validity and circularity threats were not stated; they are now. |
| Related work | Weak | An internal literature pack, citations without links or DOIs, no fresh 2024 to 2026 novelty search (AUDIT says so). |
| Limitations | Good | Plainly stated in README and ROADMAP, now also on the dashboard. |

## Findings

1. Construct validity of RQ2. The local provider's read checks only file existence and content checksum. Detection per mutation type is therefore set by provider design: 100% for content edit, append, delete and truncate, 0% for permission change and unmanaged file. The headline recall 0.7037 (38 of 54) mostly reflects the seeded mix: 46 managed and 8 unmanaged trials, from a 54-of-78 seeded shuffle. Per-type detection is the real finding.
2. H3 is fragile. 38 of 54 is one detection above the 0.70 cut; 37 of 54 = 0.6852 would be Refuted. The Wilson 95% interval, about 0.57 to 0.81, spans the threshold.
3. Circularity in RQ3. The corpus is generated from the same five fields the policy checks, so TP 28 of 28 on parseable cases and precision 1.0 are close to true by construction. Recall 0.9333 equals exactly the two hard cases chosen for inclusion.
4. H2 tests a stack built to be deterministic (DECISIONS D3: no random or null resources). 20 of 20 is expected by design and says little about providers with computed attributes.
5. RQ1 stores counts and hashes only. The 13 of 13 equivalence cannot be re-checked without re-running both engines.
6. Minor harness issues. verdict_h1's "Partially supported" branch does not check that mismatches are metadata-only, as HYPOTHESES.md requires (moot at 13 of 13). rq2_drift records a resource address for unmanaged-addition trials, where it has no meaning. The Rego encryption rule fires only on an explicit false, so a missing field passes silently and is not tested.

## Fixed in this change

| Gap | Fix | Where |
| --- | --- | --- |
| No uncertainty | Wilson 95% intervals for H3 recall, managed recall, H4 precision and H4 recall, plotted against the pre-registered cut lines, plus an interval calculator. The page says plainly that H3 sits one detection above its cut. | site/src/policy.js `wilson`, dashboard "verdicts.py" window |
| Headline recall hides design dependence | RQ2 shown per mutation type first, with a mix what-if that reweights the recorded per-type rates (labelled as reweighting, not a new run). | dashboard "drift-matrix" and "mix-whatif" windows |
| RQ3 depends on a tool not installed here | The five Rego rules ported to JavaScript with Rego's undefined semantics. The build fails unless the port reproduces the recorded conftest run file by file (TP 28, FP 0, TN 30, FN 2). | site/src/policy.js, site/src/policy.check.mjs |
| Syntax-only baseline asserted, not run | Computed in the build check and on the page: every corpus file is valid plan JSON, so it flags 0 files, recall 0 of 30. | site/src/policy.check.mjs |
| Missing-field encryption gap untested | Asserted in the build check (no deny) and shown as a labelled blind-spot example in the sandbox. Recorded results unchanged. | site/src/policy.check.mjs, dashboard sandbox |
| summary.json not checked against raw arrays | pytest recounts RQ1, RQ2 and RQ3 from the per-run, per-trial and per-record arrays and compares with summary.json. | tests/test_results_consistency.py |
| Verdict logic not independently checked | Verdicts recomputed with the same branches as generate_results_md.py and asserted equal to summary.json at build time. | site/src/policy.check.mjs |
| Threats not stated | Construct validity, circularity and design-determined reproducibility are stated on the dashboard and here. | dashboard "LIMITS.md" window |

## Remaining gaps and what each needs

| Gap | What it needs |
| --- | --- |
| RQ1 raw artifacts | OpenTofu v1.13.9 and Terraform v1.17.1 installed, one rerun of `python3 -m harness.rq1_plan_equivalence` and `rq1_reproducibility` that also writes the normalised plan and state JSON to results/. CPU only, minutes; engines are not installed on this machine. |
| Cross-engine drift | Terraform installed and a rerun of the 54-trial RQ2 set (about 54 apply and plan cycles, roughly 10 to 20 minutes on a laptop). |
| Drift construct validity | A second free, local provider or data source that reads back richer state (for example file mode), then a rerun of RQ2. Needs a provider choice and a harness change, so a new pre-registration entry. |
| RQ3 circularity | An external plan corpus not built from the policy fields, for example labelled samples derived from TerraDS or IaC-Eval, plus conftest 0.71.1 installed and a second policy tool. Needs data licensing review and labelling time. |
| Fixing H1 partial-support check and unmanaged-trial address | A harness code change that alters result-file semantics. It must be recorded in DECISIONS.md as post hoc and the results regenerated once engines are installed, so it is left to that rerun rather than edited here. |
| Related work and novelty | A literature search on 2024 to 2026 differential IaC testing and drift detection, with links or DOIs. Reading time, no compute. |
| Small samples | More drift trials per type would not change per-type rates (they are deterministic by provider design); a richer provider is the useful next step, not more trials. |
