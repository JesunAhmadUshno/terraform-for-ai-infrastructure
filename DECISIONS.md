# DECISIONS

## D1: Measurement study, not a module collection

Decision: Build a local lab that measures plan equivalence, reproducibility, drift recall and policy precision and recall. Do not build a general module library.
Reason: Verdict Pack 02 and the charter. A repo that only provisions a stack has no research question and no measured result.

## D2: OpenTofu primary, Terraform comparator

Decision: OpenTofu is the primary engine. Terraform is run as a comparator on the identical configuration.
Reason: Licence facts. OpenTofu is MPL-2.0. Terraform is BSL 1.1 source available, not OSI open source. The ownership doctrine in the charter points to OpenTofu as primary, and job descriptions still name Terraform, so equivalence must be measured.

## D3: Local provider only in the core stack

Decision: The reproducibility stack uses only the hashicorp/local provider. No random, null or archive resource is used in it.
Reason: A random value changes state on every run by design. A null resource id also changes on recreate. Either one would make the state hash differ for a reason that has nothing to do with the engine. The local provider state for a file is a hash of its content, so the state hash is a clean test.

## D4: No account gated emulator in the default path

Decision: No LocalStack and no cloud emulator in the default path.
Reason: Verdict Pack 02 records that LocalStack Community support ended and an account is now needed. The FREE-ONLY rule and the ownership doctrine both point away from an account gated default path. This lab needs no emulator at all.

## D5: Lock file kept during a study, not committed per engine

Decision: clean_stack removes state and provider directories between engine phases but keeps the lock file during a study. The lock file is not committed.
Reason: The lock file pins provider selection, which is part of reproducibility. It is not committed because OpenTofu and Terraform record different default registry hosts, so one committed lock file would bias the other engine. This is recorded as a limitation.

## D6: Init retries are allowed and are not a measured step

Decision: harness init runs with up to 3 attempts and a short backoff.
Reason: Registry access from the build VM showed transient timeout spikes during the build, including one failed plan equivalence run and one failed reproducibility start. Init happens before any measured step. Retrying it changes no plan, apply, state or policy value. The alternative, treating a network spike as a study result, would be a false measurement.

## D7: Drift study runs on OpenTofu only

Decision: RQ2 uses OpenTofu. RQ1 covers the cross engine question.
Reason: The pre-registered question for RQ2 is about refresh plan detection on this stack, not about engine differences. Running the full mutation set on one engine keeps the trial count high where the question lives. A cross engine drift comparison is listed in REPORT.md, Future work (moved there from ROADMAP.md on 2026-11-08).

## D8: Two corpus cases are designed to be missed, and are declared in advance

Decision: The RQ3 corpus includes one secret in plain text content and one secret under an alternate key name. Both are labelled violating. Both were named in HYPOTHESES.md as expected false negatives before the corpus was generated.
Reason: A policy study with no hard cases measures nothing about the policy boundary. Declaring the expected misses in advance keeps the result honest: recall below 1.0 on those cases is a measured limit of this policy set, not a surprise and not a hidden flaw.

## D9: RESULTS.md is generated

Decision: RESULTS.md and results/summary.json are written by harness/generate_results_md.py from the result JSON files. Verdicts are computed in that script from the thresholds in HYPOTHESES.md.
Reason: Charter gate 8. A hand typed results page can drift from the data. A generated page cannot, and a rerun updates it.

## D10: Live AWS stays out

Decision: No AWS resource, account or credential is used. The AWS sandbox idea stays parked behind the owner spend tap.
Reason: Charter hard rule and the task scope. Nothing in RQ1 to RQ3 needs a cloud account.

## D11: OpenTofu provider comes from a local filesystem mirror on this VM

Decision: On this build VM, OpenTofu resolves the hashicorp/local provider from a local filesystem mirror under the workspace tools directory, through a CLI config file passed with TF_CLI_CONFIG_FILE. Terraform resolves its provider from its registry directly.
Reason: The OpenTofu registry discovery request timed out repeatedly from this VM, while the same request by curl and the Terraform registry both answered. The mirror holds the official provider zip for local 2.5.2, and its SHA256 matches the official SHA256SUMS file from releases.hashicorp.com, recorded in AUDIT.md. The provider binary is therefore the same file either way, and no measured value changes. On a machine with normal registry access, plain init works and the mirror is not needed. This is an environment fix, recorded here so the run history is honest.

## D12: Restructure to the portfolio standard v2 (2026-11-08)

Decision: README opens with the question, headline, field, job family and verdict. REPORT.md gathers the old README body, RESEARCH.md, ROADMAP.md and docs/research-review.md; those three files are removed after the move. SPEC.md and HYPOTHESES.md stay byte for byte as committed in fee401d, tagged proposal-v1, and tests/test_layout.py pins both SHA-256 values. Files named by the locked SPEC.md (METHODS.md, RESULTS.md, AUDIT.md, DECISIONS.md, results/) keep their names, and this file stands in for docs/decisions/. The scored self-assessment in AUDIT.md and the rubric ratings in the research review leave the public repo; scores are internal.
Reason: One layout across the portfolio, with the lock enforced in code. Renaming files that the locked plan names would break the lock's own references.
