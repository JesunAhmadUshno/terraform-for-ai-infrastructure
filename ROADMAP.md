# ROADMAP

Items are in evidence order: what would most raise the value of the measured result comes first.

## Deep pass, next

1. Cross engine drift comparison. Run the same 54 mutation set under Terraform and compare recall by type with the OpenTofu result. This tests whether the permission change miss and the unmanaged addition miss are provider facts or engine facts.
2. Richer stack for drift. Add one resource type whose provider reads back more state, for example a local data source or a second provider that is still local and free, and rerun RQ2. The current miss classes are bounded by what the local provider reads.
3. Policy corpus growth. Grow the corpus from 60 to at least 200 files, add encoded and nested secret forms, and add a second policy tool as a comparator so precision and recall are reported per tool, as Verdict Pack 02 proposed.
4. Engine release watch. Rerun RQ1 plan equivalence on each new OpenTofu and Terraform minor release and record the shared subset over time. Divergence, if it appears, is a publishable finding.
5. Module level study. Split the stack into modules and test whether plan equivalence and reproducibility hold per module, including one module with a conditional resource and one with a for_each over a computed value, which are the cases most likely to diverge.
6. Native test layer. Add engine native test files with mocked providers for module contracts, and document any divergence in test behaviour between engines, which Verdict Pack 02 flagged from the migration guides.

## Held behind owner decisions

- Live AWS sandbox apply. Spend gated. Needs the owner tap, a budget, and a destroy plan. Not needed for any current claim.
- TerraDS scale differential study, the paper angle in Verdict Pack 02. Needs a literature search on 2024 to 2026 differential IaC testing first, to settle novelty, before any scale run.

## Maintenance

- Pin new tool versions in AUDIT.md with download hashes when tools are upgraded.
- Keep the corpus generator deterministic. Any corpus change after this build must be recorded here with a reason, because recall numbers are only comparable on the same corpus.
- Rerun python -m pytest and the three studies before any README number is updated.
