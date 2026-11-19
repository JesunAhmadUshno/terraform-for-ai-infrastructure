# REPORT

Date: 2026-11-08. Studies run 2026-11-06 on a shared build VM; review
of 2026-11-07 folded in below. The locked plan is SPEC.md and
HYPOTHESES.md (fee401d, tag proposal-v1). The full method is
METHODS.md; the generated numbers are RESULTS.md and results/. This
file gathers what used to live in the README body, RESEARCH.md,
ROADMAP.md and docs/research-review.md (moved 2026-11-08, DECISIONS.md
D12).

## Problem

AI platform work rests on infrastructure code. If the same code gives a different plan or a different rebuild result, a reviewer cannot check the work. If out-of-band change is not detected, recorded state and real state diverge with no signal. If a policy tool misses insecure settings or flags safe ones, teams get false confidence or false alarms. These questions can be measured locally at zero spend, and this repo measures them.

## Purpose

Measure three properties of one fixed local AI platform stack, with hypotheses and thresholds registered before any experiment code was written:

- RQ1: plan equivalence between OpenTofu and Terraform, and rebuild reproducibility over 20 runs per engine.
- RQ2: drift detection recall over seeded out-of-band changes, with misses classified.
- RQ3: precision and recall of Rego policies run with conftest against plan JSON, on a labelled corpus.

Intent, not a measured outcome: a zero spend method lowers the cost of reproducible AI infrastructure work for students and researchers without cloud budgets.

## Background and prior work

Question as first framed: can one HCL codebase rebuild a local AI platform stack the same way every time, under both OpenTofu and Terraform, and can it detect injected drift and policy violations automatically, at zero spend? The full question set and thresholds are in SPEC.md and HYPOTHESES.md. The research base is Claude Verdict Pack 02, filed in the career goal record.

This background was written with the build (90bf39e), after the lock, so it is not part of the pre-registration.

### Search and sources

Primary sources used, as recorded in Verdict Pack 02 with its verification status:

- HashiCorp press release, August 10, 2023: Terraform source licence changed from MPL 2.0 to Business Source License 1.1 for future releases. Status in the pack: verified.
- IBM press release, February 27, 2025: IBM completed its acquisition of HashiCorp. Status: verified.
- CNCF project page: OpenTofu accepted as a Sandbox project on April 23, 2025. Status: verified.
- OpenTofu blog and docs: OpenTofu 1.7.0 shipped state encryption. State and plan files can be encrypted at rest, and this does not protect values from the person running the command. Status: verified.
- OpenTofu migration guides: migration is version staged, and some test features differ between engines. Status: verified.
- Terraform documentation: test mocking exists from Terraform 1.7.0, and mocked computed values rarely match real provider formats. Status: verified.
- Kon et al., IaC-Eval, NeurIPS 2024 Datasets and Benchmarks: 458 human curated scenarios, GPT-4 pass at 1 of 19.36 percent, against 86.6 percent on EvalPlus. Status: verified in the pack.
- Buehler et al., TerraDS, MSR 2025: a large corpus of Terraform code. The pack records a conflict: the paper page and the Zenodo record give different repository counts. Any use must state which count it used. This build does not use TerraDS numbers as results.
- Rahman, Parnin and Williams, The Seven Sins, ICSE 2019: security smells in 15,232 Puppet scripts, 21,201 smell occurrences including 1,326 hard coded passwords. Status: verified in the pack, with the limit that the study is on Puppet, so transfer to HCL is not shown.

Rows the pack marked unverified, and which this build does not claim: a specific OpenTofu 1.12 feature list from a mirrored release note, emulator feature claims, and a blanket claim that all named policy and platform tools are free and open source. This build only claims what it installed and ran, recorded in AUDIT.md.

### Past, present and future horizons

Past: Infrastructure as code security research is strongest on Puppet and on static smell counts. Differential testing of two engines on the same HCL is thin in the published record found by the pack. The pack states that a full literature search for prior Terraform against OpenTofu differential testing was not run, so no novelty claim is made here.

Present: The licence split is the live fact. Terraform is BSL 1.1 source available, not OSI open source. OpenTofu is MPL-2.0 and a CNCF Sandbox project. Employers name Terraform in AI Platform Engineer job descriptions today, which is why the charter rates this track as the highest immediate career value, and why compatibility must be measured rather than assumed.

Future: Engine divergence is the risk to track. Features that exist in only one engine shrink the shared subset. A local measurement harness like this one can be rerun on each new engine release to watch the subset change. That rerun path is under Future work below.

### What this build adds

Measured, local, zero spend evidence on three narrow questions: plan equivalence on a shared subset, rebuild reproducibility over 20 runs per engine, drift recall over 54 seeded mutations, and policy precision and recall over a 60 file labelled corpus. Every number comes from a generated result file in results/.

### Limits of the literature use

Background numbers from IaC-Eval, TerraDS and Seven Sins are motivation only. They are not this build's results, and no claim in README.md rests on them. Vendor and project claims are labelled with their source in this file.

## Method in brief

Full detail in METHODS.md.

- lab/stack/main.tf: the test object. Thirteen local_file resources: ten service definitions for a local AI platform (inference, vector store, metadata store, gateway, embedding, evaluation, observability, model registry, data ingest, policy), a platform manifest, a policy manifest and a stack readme. Only the hashicorp/local provider, version 2.5.2, pinned. No random resource, by design.
- policy/policy.rego: five deny rules in Rego: public exposure, bind to all interfaces, hard coded secret, disabled encryption, world writable permission.
- corpus/: 60 labelled plan JSON files, generated, with labels in corpus/labels.json.
- harness/: Python measurement code. RQ1 in rq1_plan_equivalence.py and rq1_reproducibility.py, RQ2 in rq2_drift.py, RQ3 in rq3_policy.py and generate_corpus.py, and RESULTS.md generation in generate_results_md.py.
- tests/: pytest tests for the harness, the results-consistency recounts, and the layout and lock checks.
- SPEC.md and HYPOTHESES.md: pre-registered before experiment code, in git history order.

## Results against the locked pass lines

Every number below is read from results/ (rq1_plan_equivalence.json, rq1_reproducibility.json, rq2_drift.json, rq3_policy.json, summary.json). Intervals are Wilson 95% intervals computed from those counts (commands at the end of this section); the dashboard computes the same intervals with site/src/policy.js.

| Hypothesis | Locked pass line | Measured | Verdict |
| --- | --- | --- | --- |
| H1 plan equivalence | Supported if 100 percent of addresses match with identical actions | 13 of 13 addresses match, same type and actions, match rate 1.0000 | Supported |
| H2 rebuild reproducibility | Supported if at least 19 of 20 runs match run 1 for each engine | 20 of 20 runs match run 1 for each engine; plan and state hashes identical across engines in the recorded run | Supported |
| H3 drift detection recall | Supported at 0.90 or above; Partially supported from 0.70 to below 0.90 with every miss classified | Recall 0.7037, 38 of 54 (95% interval 0.57 to 0.81); managed only recall 0.8261, 38 of 46 (0.69 to 0.91) | Partially supported |
| H4 policy precision and recall | Supported if both are at least 0.90 | Precision 1.0000, 28 of 28 (0.88 to 1.00); recall 0.9333, 28 of 30 (0.79 to 0.98); TP 28, FP 0, TN 30, FN 2 | Supported |

Key measured results:

| Study | Result |
| --- | --- |
| Plan equivalence | OpenTofu v1.13.9 and Terraform v1.17.1, 13 of 13 addresses match |
| Rebuild, OpenTofu | 20 of 20 runs match, median cycle 6.675 seconds on the build VM |
| Rebuild, Terraform | 20 of 20 runs match, median cycle 3.513 seconds on the build VM |
| Drift recall | 0.7037 overall; 0.8261 on managed file mutations; naive file exists baseline 0.1667 |
| Drift misses | Permission change 8 of 8 missed; unmanaged addition 8 of 8 missed; all content edits, appends, deletes and truncates detected |
| Policy | Precision 1.0000, recall 0.9333 on 60 files; the 2 false negatives are the two pre-registered unparsed forms |
| Policy baseline | Syntax validation alone flags 0 of 30 violating files (computed in site/src/policy.check.mjs) |

Wall times were measured on a shared build VM under load from other work. They show the runs completed at the stated scale. They are not a speed comparison between engines, and no speed claim is made.

The Jev claim check on the headline claim returned route REVIEW, and the claim was then verified by hand against the generated files. The gate record is in results/jev-claim-check.json.

Commands that regenerate the counts and intervals from the evidence:

```text
python -m harness.generate_results_md && git diff --exit-code RESULTS.md results/summary.json
python -m pytest -q tests/test_results_consistency.py
python -c "import json,math;w=lambda k,n,z=1.959964:tuple(round(((k/n+z*z/(2*n))+s*z*math.sqrt(k/n*(1-k/n)/n+z*z/(4*n*n)))/(1+z*z/n),2) for s in (-1,1));r=json.load(open('results/rq2_drift.json'));q=json.load(open('results/rq3_policy.json'));tp=q['true_positives'];print(w(r['detected'],r['trials_total']),w(r['managed_detected'],r['managed_trials']),w(tp,tp+q['false_positives']),w(tp,tp+q['false_negatives']))"
```

## Misses

- H3 is Partially supported, not Supported. Every permission change (8 of 8) and every unmanaged file addition (8 of 8) was missed, as HYPOTHESES.md expected; both count against headline recall as pre-registered.
- H3 is fragile: 38 of 54 is one detection above the 0.70 cut; 37 of 54 = 0.6852 would be Refuted. The 95% interval, 0.57 to 0.81, spans the threshold.
- H4's two false negatives are violating-28.json (secret in plain text content) and violating-29.json (secret under an alternate key name), the two cases declared in advance (DECISIONS.md D8).
- Run history: one reproducibility batch and one plan equivalence attempt were discarded, for an unisolated leftover state and registry timeouts; both are named in AUDIT.md and DECISIONS.md D6 and D11. The recorded files are the clean reruns.

## Field profile

This repo is assigned the systems reliability profile (METHOD section 4). Against it:

- Stated targets for availability, recovery time and data-loss window: not stated. The study's targets are plan equivalence, rebuild reproducibility, drift recall and policy precision and recall.
- Timed drills (restore from backup, planned component failure): the 20 destroy and apply cycles per engine are timed rebuilds, but there is no restore-from-backup drill and no recovery target to time against.
- Monitoring that would have caught each drill's fault: the refresh plan is the detector under test, and it misses permission changes and unmanaged files.
- A runbook a second person can follow, a postmortem per incident: METHODS.md and AUDIT.md record the run history, but there is no runbook.

So the profile is not met and the verdict stops at Functional. A timed drill under a newly locked proposal is the way to lift it.

## Threats to validity and limitations

- One provider only. All equivalence, reproducibility and drift evidence is bounded to the local provider. A provider that reads back richer state could change the drift numbers. This is the largest limit on the result.
- Local and CPU only. Nothing here shows cloud IAM, networking, quota or GPU behaviour, and nothing is a serving benchmark.
- Drift was measured on OpenTofu only. The cross engine drift comparison is under Future work.
- The policy corpus is 60 files and one policy tool. Precision and recall describe this policy set on this corpus only.
- The lock file is not committed, because the two engines record different default registry hosts. Provider version is pinned in the configuration instead. See DECISIONS.md D5.
- On the build VM, OpenTofu resolved its provider from a local mirror of the official provider zip, because the OpenTofu registry timed out repeatedly from that VM. The zip hash matches the official SHA256SUMS file. See DECISIONS.md D11.
- Median cycle times come from a shared, loaded VM and are not an engine speed comparison.
- CI runs the Python tests and the results regeneration only; engine runs are not in CI, and there are no engine-native test files.
- The literature base is the verdict pack; no fresh full literature search was run for this build.
- Construct validity of RQ2. The local provider's read checks only file existence and content checksum. Detection per mutation type is therefore set by provider design: 100% for content edit, append, delete and truncate, 0% for permission change and unmanaged file. The headline recall 0.7037 (38 of 54) mostly reflects the seeded mix: 46 managed and 8 unmanaged trials, from a 54-of-78 seeded shuffle. Per-type detection is the real finding.
- Circularity in RQ3. The corpus is generated from the same five fields the policy checks, so TP 28 of 28 on parseable cases and precision 1.0 are close to true by construction. Recall 0.9333 equals exactly the two hard cases chosen for inclusion.
- H2 tests a stack built to be deterministic (DECISIONS D3: no random or null resources). 20 of 20 is expected by design and says little about providers with computed attributes.
- RQ1 stores counts and hashes only. The 13 of 13 equivalence cannot be re-checked without re-running both engines.
- Minor harness issues. verdict_h1's "Partially supported" branch does not check that mismatches are metadata-only, as HYPOTHESES.md requires (moot at 13 of 13). rq2_drift records a resource address for unmanaged-addition trials, where it has no meaning. The Rego encryption rule fires only on an explicit false, so a missing field passes silently and is not tested.

Background numbers from the sources under "Background and prior work" are motivation only. Every measured number in this repo comes from its own generated result files.

## Review

A research review on 2026-11-07 read the repository as of the live-dashboard change. Its findings are the last five items under "Threats to validity and limitations". It is not the second-reader review of METHOD section 1 (re-deriving every headline number from raw evidence), which stays open, because the raw RQ1 plan and state JSON are not committed.

Assessment notes from that review, kept as evidence and reasoning:

- Research questions: RQ1 to RQ3 are specific and measurable (HYPOTHESES.md).
- Hypotheses and pre-registration: SPEC.md and HYPOTHESES.md committed in fee401d, before the harness and results in 90bf39e. Thresholds and expected misses declared in advance. The pre-registration, provenance hashes and honest reporting of the expected misses are strong.
- Method: clean, deterministic harness with normalised plan and state hashing. Construct validity is weak for RQ2 and RQ3.
- Baselines: RQ2 has a naive file-exists baseline (9 of 54). RQ3's syntax-only baseline was only asserted; it is now computed.
- Statistics and uncertainty: no intervals were reported; Wilson 95% intervals are now computed for every proportion. Two of the four results are largely fixed by the study design.
- Reproducibility: seeded mutation list, generated RESULTS.md, pinned provider, tool versions in AUDIT.md. Raw plan and state JSON for RQ1 are not committed.
- Threats to validity: the single provider and single drift engine were listed; construct-validity and circularity threats were not stated; they are now.
- Related work: an internal literature pack, citations without links or DOIs, no fresh 2024 to 2026 novelty search (AUDIT says so).
- Limitations: plainly stated, now also on the dashboard.

Fixed in that change:

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

Remaining gaps and what each needs:

| Gap | What it needs |
| --- | --- |
| RQ1 raw artifacts | OpenTofu v1.13.9 and Terraform v1.17.1 installed, one rerun of `python3 -m harness.rq1_plan_equivalence` and `rq1_reproducibility` that also writes the normalised plan and state JSON to results/. CPU only, minutes; engines are not installed on this machine. |
| Cross-engine drift | Terraform installed and a rerun of the 54-trial RQ2 set (about 54 apply and plan cycles, roughly 10 to 20 minutes on a laptop). |
| Drift construct validity | A second free, local provider or data source that reads back richer state (for example file mode), then a rerun of RQ2. Needs a provider choice and a harness change, so a new pre-registration entry. |
| RQ3 circularity | An external plan corpus not built from the policy fields, for example labelled samples derived from TerraDS or IaC-Eval, plus conftest 0.71.1 installed and a second policy tool. Needs data licensing review and labelling time. |
| Fixing H1 partial-support check and unmanaged-trial address | A harness code change that alters result-file semantics. It must be recorded in DECISIONS.md as post hoc and the results regenerated once engines are installed, so it is left to that rerun rather than edited here. |
| Related work and novelty | A literature search on 2024 to 2026 differential IaC testing and drift detection, with links or DOIs. Reading time, no compute. |
| Small samples | More drift trials per type would not change per-type rates (they are deterministic by provider design); a richer provider is the useful next step, not more trials. |

## Future work

Moved from ROADMAP.md. Items are in evidence order: what would most raise the value of the measured result comes first.

Deep pass, next:

1. Cross engine drift comparison. Run the same 54 mutation set under Terraform and compare recall by type with the OpenTofu result. This tests whether the permission change miss and the unmanaged addition miss are provider facts or engine facts.
2. Richer stack for drift. Add one resource type whose provider reads back more state, for example a local data source or a second provider that is still local and free, and rerun RQ2. The current miss classes are bounded by what the local provider reads.
3. Policy corpus growth. Grow the corpus from 60 to at least 200 files, add encoded and nested secret forms, and add a second policy tool as a comparator so precision and recall are reported per tool, as Verdict Pack 02 proposed.
4. Engine release watch. Rerun RQ1 plan equivalence on each new OpenTofu and Terraform minor release and record the shared subset over time. Divergence, if it appears, is a publishable finding.
5. Module level study. Split the stack into modules and test whether plan equivalence and reproducibility hold per module, including one module with a conditional resource and one with a for_each over a computed value, which are the cases most likely to diverge.
6. Native test layer. Add engine native test files with mocked providers for module contracts, and document any divergence in test behaviour between engines, which Verdict Pack 02 flagged from the migration guides.

Held behind owner decisions:

- Live AWS sandbox apply. Spend gated. Needs the owner tap, a budget, and a destroy plan. Not needed for any current claim.
- TerraDS scale differential study, the paper angle in Verdict Pack 02. Needs a literature search on 2024 to 2026 differential IaC testing first, to settle novelty, before any scale run.

Maintenance:

- Pin new tool versions in AUDIT.md with download hashes when tools are upgraded.
- Keep the corpus generator deterministic. Any corpus change after this build must be recorded in CHANGELOG.md with a reason, because recall numbers are only comparable on the same corpus.
- Rerun python -m pytest and the three studies before any README number is updated.

## Licensing

- This repository: Apache-2.0.
- Terraform: source available under the Business Source License 1.1, BSL 1.1. It is not OSI open source.
- OpenTofu: Mozilla Public License 2.0, MPL-2.0. OpenTofu is the primary engine in this lab for that reason.
- conftest and OPA and the local provider carry their own licences, noted in AUDIT.md.

## Citations

- HashiCorp, press release, August 10, 2023: Terraform licence change to BSL 1.1.
- IBM, press release, February 27, 2025: acquisition of HashiCorp completed.
- CNCF project page: OpenTofu accepted as a Sandbox project, April 23, 2025.
- OpenTofu documentation: state and plan encryption; migration guides.
- Terraform documentation: test mocking.
- Kon et al., IaC-Eval, NeurIPS 2024 Datasets and Benchmarks.
- Buehler et al., TerraDS, MSR 2025, with the repository count conflict noted under "Background and prior work".
- Rahman, Parnin and Williams, The Seven Sins, ICSE 2019.

## Conclusion

On the shared local subset the two engines agree and rebuild deterministically, which the stack was designed to allow. A refresh plan is not a sufficient drift check for this provider: it sees content and existence, never permissions or unowned files, and the headline recall sits at the edge of its cut. The policy result is strong but largely true by construction. The most useful next run is the cross-engine drift set with the raw RQ1 artifacts saved.
