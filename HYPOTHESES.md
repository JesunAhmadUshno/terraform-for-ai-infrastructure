# HYPOTHESES: Pre-registered

Date: 2026-11-06
Status: Committed before any experiment code. Thresholds in this file do not change after results are seen. Any later change must be recorded in DECISIONS.md with a reason and must be marked as post hoc.

## Research questions

- RQ1: Do OpenTofu and Terraform produce equivalent plans on the same local configuration, and is a full rebuild reproducible across 20 runs per engine?
- RQ2: What fraction of seeded out-of-band changes does a refresh plan detect, and how are the misses classified?
- RQ3: What precision and recall do Rego policies run with conftest reach on a labelled corpus of plan JSON configurations?

## H1: Plan equivalence

Statement: On the common feature subset used by the local stack, OpenTofu and Terraform produce the same normalised plan.

Operational test: Normalised plan is the sorted list of resource address, type and planned actions from plan JSON, from an empty state, on identical configuration and identical variable values.

Threshold: Supported if all resource addresses match with identical actions, that is 100 percent of addresses match. Partially supported if at least 90 percent match and every mismatch is a metadata or provider version difference, not a different action. Refuted if any resource has a different planned action between engines, or if fewer than 90 percent of addresses match.

Falsification: One address with a different action falsifies the strong form and moves the verdict to at most Partially supported, with the mismatch published.

## H2: Rebuild reproducibility

Statement: A destroy and apply rebuild of the local stack gives the same normalised state and the same normalised plan in repeated runs.

Operational test: 20 runs per engine. Normalised state hash and normalised plan hash are defined in SPEC.md. A run matches if both hashes equal the run 1 hashes for that engine.

Threshold: Supported if at least 19 of 20 runs match for each engine. Partially supported if at least 16 of 20 runs match for each engine and every mismatch has a named cause in the result file. Refuted if fewer than 16 of 20 runs match for either engine, or if a mismatch changes any file content.

Falsification: A run whose generated file content differs from run 1 falsifies the reproducibility claim for that engine.

## H3: Drift detection recall

Statement: A refresh plan detects most seeded out-of-band changes to managed files.

Operational test: At least 50 seeded mutations, one per trial, spread across resources and across the mutation types listed in SPEC.md. Detected means plan JSON or detailed exit code shows a change for the mutated address.

Threshold: Supported if recall is at least 0.90 over all mutations. Partially supported if recall is at least 0.70 and below 0.90, with every miss classified. Refuted if recall is below 0.70.

Pre-registered expectation on miss classes: Unmanaged file additions and changes that the local provider does not read back are expected to be missed. If they are missed, that is a classified limitation, not a surprise, and it still counts against recall in the headline number. A second number, recall over managed file mutations only, is reported beside the headline number.

Falsification: Recall below 0.70 falsifies the claim that refresh plan alone is a sufficient drift check for this stack.

## H4: Policy precision and recall

Statement: Rego policies run with conftest against plan JSON separate compliant from violating configurations with high precision and high recall.

Operational test: Labelled corpus of at least 30 compliant and at least 30 violating configurations, labels set by construction. Predicted violating means at least one deny. Precision is true positives divided by true positives plus false positives. Recall is true positives divided by true positives plus false negatives. Arithmetic is done in code.

Threshold: Supported if precision is at least 0.90 and recall is at least 0.90. Partially supported if both are at least 0.75 and at least one is below 0.90. Refuted if either precision or recall is below 0.75.

Pre-registered expectation on errors: Violating configurations whose secret or exposure is encoded in a form the policy does not parse, for example non JSON content or an alternate key name, are expected to be false negatives. Compliant configurations are expected to have no false positives unless a rule is over broad. Both error classes are published with file names.

Falsification: A false positive rate that pushes precision below 0.75, or missed violations that push recall below 0.75, falsifies the claim for this policy set and this corpus.

## Notes on baselines

- For RQ1, the baseline expectation is 100 percent plan match on the common subset, from Verdict Pack 02.
- For RQ2, the naive baseline is a check that a file exists. It detects deletes only. The harness records what the naive check would have detected for each mutation, for comparison.
- For RQ3, the baseline is syntax validation alone, which checks form and not security properties. It would detect none of the violating configurations in this corpus by design, because all corpus files are syntactically valid plan JSON.

## Verdict protocol

Each hypothesis gets one verdict in RESULTS.md and in README.md: Supported, Partially supported, Refuted, Inconclusive, or Not yet measured, per charter gate 9, with the measured number and the limitation beside it.
