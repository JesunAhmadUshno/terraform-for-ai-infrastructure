# RESEARCH

## Question

Can one HCL codebase rebuild a local AI platform stack the same way every time, under both OpenTofu and Terraform, and can it detect injected drift and policy violations automatically, at zero spend? The full question set and thresholds are in SPEC.md and HYPOTHESES.md. The research base is Claude Verdict Pack 02, filed in the career goal record.

## Search and sources

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

## Past, present and future horizons

Past: Infrastructure as code security research is strongest on Puppet and on static smell counts. Differential testing of two engines on the same HCL is thin in the published record found by the pack. The pack states that a full literature search for prior Terraform against OpenTofu differential testing was not run, so no novelty claim is made here.

Present: The licence split is the live fact. Terraform is BSL 1.1 source available, not OSI open source. OpenTofu is MPL-2.0 and a CNCF Sandbox project. Employers name Terraform in AI Platform Engineer job descriptions today, which is why the charter rates this track as the highest immediate career value, and why compatibility must be measured rather than assumed.

Future: Engine divergence is the risk to track. Features that exist in only one engine shrink the shared subset. A local measurement harness like this one can be rerun on each new engine release to watch the subset change. That rerun path is in ROADMAP.md.

## What this build adds

Measured, local, zero spend evidence on three narrow questions: plan equivalence on a shared subset, rebuild reproducibility over 20 runs per engine, drift recall over 54 seeded mutations, and policy precision and recall over a 60 file labelled corpus. Every number comes from a generated result file in results/.

## Limits of the literature use

Background numbers from IaC-Eval, TerraDS and Seven Sins are motivation only. They are not this build's results, and no claim in README.md rests on them. Vendor and project claims are labelled with their source in this file.
