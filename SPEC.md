# SPEC: Terraform for AI Infrastructure, Local Lab

Date: 2026-11-06
Owner: Jesun Ahmad Ushno
Status: Pre-registered. This file and HYPOTHESES.md are committed before any experiment code.
Charter: AI Platform Research Programme Charter, 2026-11-05, Phase 4.
Research base: Claude Verdict Pack 02, Terraform for AI Infrastructure.

## Problem

AI platform work depends on infrastructure code. If the same code gives a different plan or a different result on rebuild, a reviewer cannot check the work. If out-of-band change is not detected, the recorded state and the real state diverge with no signal. If a policy tool misses insecure settings or flags safe settings, teams get false confidence or false alarms.

This risk affects students, reviewers and small teams who cannot pay for cloud accounts to test these questions. A local, zero spend lab can measure the core properties if the stack and the metrics are defined in advance.

## Purpose

Measure, on one fixed local AI platform stack, three properties:

- RQ1: plan equivalence between OpenTofu and Terraform, and rebuild reproducibility over repeated destroy and apply cycles.
- RQ2: drift detection recall when out-of-band changes are seeded, with misses classified.
- RQ3: precision and recall of Rego policies run with conftest against plan JSON, on a labelled corpus.

Societal impact claim, stated as intent and not as a measured outcome: a zero spend method lowers the cost of reproducible AI infrastructure work for students and researchers without cloud budgets. No outcome on people is measured in this build.

## Scope

In scope:
- One local stack defined in HCL, using only local providers: local and null is avoided for state determinism in the reproducibility stack, so the core stack uses the local provider only. The policy corpus uses plan JSON as data.
- Engines: OpenTofu as primary, Terraform as comparator.
- Policy tool: conftest with Open Policy Agent, policies in Rego, run against plan JSON.
- Twenty rebuild runs per engine for RQ1.
- At least 50 seeded drift mutations for RQ2.
- At least 30 compliant and 30 violating labelled configurations for RQ3.

Out of scope:
- Any cloud account, any AWS resource, any spend. Live AWS stays behind the owner spend tap.
- Any new credential.
- Serving throughput or latency as a model serving benchmark. The stack is CPU only and local. It proves wiring and reproducibility, not serving performance.
- Production, cloud scale, IAM, VPC or GPU claims.

## Licensing facts, stated plainly

- This repository code is Apache-2.0.
- Terraform is source available under the Business Source License 1.1, BSL 1.1. It is not OSI open source. This fact is stated wherever Terraform licensing is mentioned.
- OpenTofu is under Mozilla Public License 2.0, MPL-2.0. It is the ownership doctrine aligned primary engine in this lab.
- The local provider and conftest and OPA carry their own licences, recorded in AUDIT.md.

## Stack definition

The local AI platform stack is a set of generated files under a build directory, one file per service definition:

- inference service definition
- vector store service definition
- metadata store service definition
- gateway service definition
- embedding service definition
- evaluation service definition
- observability service definition
- model registry service definition
- data ingest service definition
- policy manifest
- platform manifest
- readme for the generated stack

Each file content is a deterministic JSON document built from variables with fixed defaults. No random resource is used in the reproducibility stack, because a random value would break the state hash comparison by design.

## Methods summary

Full detail is in METHODS.md, written after this spec and before results are interpreted.

RQ1 plan equivalence: run plan from an empty state with each engine on the same configuration, export plan JSON with show -json, normalise to a sorted list of resource address, resource type and planned actions, and compare. Report the count of matching addresses and the count of mismatches, with each mismatch listed.

RQ1 rebuild reproducibility: for each engine, repeat 20 runs. Each run does init, apply, capture a normalised state hash, destroy, and capture a normalised plan hash for the next apply. The normalised state hash is a SHA256 over the sorted resource attributes taken from state JSON, excluding lineage, serial and timestamps. Report the number of runs whose hash matches run 1, for each engine, and median wall time.

RQ2 drift: start from an applied stack. For each seeded mutation, apply fresh, make one out-of-band change outside the engine, then run plan with refresh and detailed exit code. A mutation is detected if plan reports a change for the mutated address, or reports the resource as missing or tainted in the plan JSON. Record detected or missed, and classify every miss by type. Mutation types: content edit, content append, file delete, file truncate, unmanaged file addition, directory level change that the provider does not track, and permission change. At least 50 mutations, spread across resources and types, from a fixed seed list committed with the harness.

RQ3 policy: generate a labelled corpus of plan JSON files. Each file holds one planned service definition. Ground truth labels are set by construction in the generator and stored in a labels file. Policies in Rego deny public exposure of data services, hard coded secrets in content, disabled encryption, and world writable file permission. Run conftest on each file. Predicted violating means conftest reports a deny. Compute true positives, false positives, true negatives and false negatives, and from them precision and recall, with arithmetic done in code.

## Reproducibility

- Tool versions and download SHA256 values are recorded in AUDIT.md.
- Provider versions are pinned in the configuration and the lock file is committed per engine where the format allows.
- One command reruns the harness tests: python -m pytest.
- One command per study reruns the measurement and regenerates its result file under results/.
- RESULTS.md is generated from the result files by a script. It is never hand typed.

## Failure handling

Failures, misses and negative results are published in RESULTS.md and in the result files. A failed hypothesis is a valid result. Tool failures during a run are recorded as run errors, not hidden and not counted as detections or matches.

## Gates

This build follows the ten gates in the charter. In particular, gate 4 is this file and HYPOTHESES.md committed before experiment code, gate 8 requires the Jev claim check on the headline claim, and gate 9 requires a verdict per hypothesis.
