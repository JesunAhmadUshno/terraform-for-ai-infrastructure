# Terraform for AI Infrastructure: a local measurement lab

## Problem

AI platform work rests on infrastructure code. If the same code gives a different plan or a different rebuild result, a reviewer cannot check the work. If out-of-band change is not detected, recorded state and real state diverge with no signal. If a policy tool misses insecure settings or flags safe ones, teams get false confidence or false alarms. These questions can be measured locally at zero spend, and this repo measures them.

## Purpose

Measure three properties of one fixed local AI platform stack, with hypotheses and thresholds registered before any experiment code was written:

- RQ1: plan equivalence between OpenTofu and Terraform, and rebuild reproducibility over 20 runs per engine.
- RQ2: drift detection recall over seeded out-of-band changes, with misses classified.
- RQ3: precision and recall of Rego policies run with conftest against plan JSON, on a labelled corpus.

Intent, not a measured outcome: a zero spend method lowers the cost of reproducible AI infrastructure work for students and researchers without cloud budgets.

## Verdict

| Hypothesis | Verdict | Measured result |
| --- | --- | --- |
| H1 plan equivalence | Supported | 13 of 13 addresses match, same type and actions, match rate 1.0000 |
| H2 rebuild reproducibility | Supported | 20 of 20 runs match run 1 for each engine; plan and state hashes identical across engines in the recorded run |
| H3 drift detection recall | Partially supported | Recall 0.7037, 38 of 54; managed only recall 0.8261; misses are only permission changes and unmanaged additions |
| H4 policy precision and recall | Supported | Precision 1.0000, recall 0.9333; TP 28, FP 0, TN 30, FN 2 |

Full generated detail is in RESULTS.md. The result files are in results/. The Jev claim check on the headline claim returned route REVIEW, and the claim was then verified by hand against the generated files. The gate record is in results/jev-claim-check.json.

## Key measured results

| Study | Result |
| --- | --- |
| Plan equivalence | OpenTofu v1.13.9 and Terraform v1.17.1, 13 of 13 addresses match |
| Rebuild, OpenTofu | 20 of 20 runs match, median cycle 6.675 seconds on the build VM |
| Rebuild, Terraform | 20 of 20 runs match, median cycle 3.513 seconds on the build VM |
| Drift recall | 0.7037 overall; 0.8261 on managed file mutations; naive file exists baseline 0.1667 |
| Drift misses | Permission change 8 of 8 missed; unmanaged addition 8 of 8 missed; all content edits, appends, deletes and truncates detected |
| Policy | Precision 1.0000, recall 0.9333 on 60 files; the 2 false negatives are the two pre-registered unparsed forms |

Wall times were measured on a shared build VM under load from other work. They show the runs completed at the stated scale. They are not a speed comparison between engines, and no speed claim is made.

## Architecture

- lab/stack/main.tf: the test object. Thirteen local_file resources: ten service definitions for a local AI platform (inference, vector store, metadata store, gateway, embedding, evaluation, observability, model registry, data ingest, policy), a platform manifest, a policy manifest and a stack readme. Only the hashicorp/local provider, version 2.5.2, pinned. No random resource, by design.
- policy/policy.rego: five deny rules in Rego: public exposure, bind to all interfaces, hard coded secret, disabled encryption, world writable permission.
- corpus/: 60 labelled plan JSON files, generated, with labels in corpus/labels.json.
- harness/: Python measurement code. RQ1 in rq1_plan_equivalence.py and rq1_reproducibility.py, RQ2 in rq2_drift.py, RQ3 in rq3_policy.py and generate_corpus.py, and RESULTS.md generation in generate_results_md.py.
- tests/: pytest tests for the harness, 8 tests.
- SPEC.md and HYPOTHESES.md: pre-registered before experiment code, in git history order. METHODS.md, RESEARCH.md, DECISIONS.md, AUDIT.md and ROADMAP.md complete the dossier.

## Reproduction

```bash
python -m pytest
python -m harness.rq1_plan_equivalence
python -m harness.rq1_reproducibility
python -m harness.rq2_drift
python -m harness.generate_corpus
python -m harness.rq3_policy
python -m harness.generate_results_md
```

OpenTofu and Terraform and conftest must be installed. Versions and download hashes used for the recorded runs are in AUDIT.md. No cloud account, no credential and no spend is needed or used.

## Limitations

- One provider only. All equivalence, reproducibility and drift evidence is bounded to the local provider. A provider that reads back richer state could change the drift numbers. This is the largest limit on the result.
- Local and CPU only. Nothing here shows cloud IAM, networking, quota or GPU behaviour, and nothing is a serving benchmark.
- Drift was measured on OpenTofu only. The cross engine drift comparison is in ROADMAP.md.
- The policy corpus is 60 files and one policy tool. Precision and recall describe this policy set on this corpus only.
- The lock file is not committed, because the two engines record different default registry hosts. Provider version is pinned in the configuration instead. See DECISIONS.md D5.
- On the build VM, OpenTofu resolved its provider from a local mirror of the official provider zip, because the OpenTofu registry timed out repeatedly from that VM. The zip hash matches the official SHA256SUMS file. See DECISIONS.md D11.
- Median cycle times come from a shared, loaded VM and are not an engine speed comparison.

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
- Buehler et al., TerraDS, MSR 2025, with the repository count conflict noted in RESEARCH.md.
- Rahman, Parnin and Williams, The Seven Sins, ICSE 2019.

Background numbers from these sources are motivation only. Every measured number in this repo comes from its own generated result files.
