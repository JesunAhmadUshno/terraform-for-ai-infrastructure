"""summary.json must equal recounts from the per-trial and per-record arrays in results/."""
import json
from pathlib import Path

RESULTS = Path(__file__).resolve().parent.parent / "results"


def load(name):
    return json.loads((RESULTS / name).read_text(encoding="utf-8"))


def test_rq2_summary_matches_trial_recount():
    rq2, summary = load("rq2_drift.json"), load("summary.json")["rq2_drift"]
    trials = rq2["trials"]
    detected = sum(t["detected"] for t in trials)
    managed = [t for t in trials if t["managed_file_mutation"]]
    misses = {}
    for t in trials:
        if not t["detected"]:
            misses[t["type"]] = misses.get(t["type"], 0) + 1
    assert (detected, len(trials)) == (summary["detected"], summary["total"]) == (rq2["detected"], rq2["trials_total"])
    assert summary["recall"] == detected / len(trials)
    assert summary["recall_managed_only"] == sum(t["detected"] for t in managed) / len(managed)
    assert rq2["naive_exists_detected"] == sum(t["naive_exists_check_detected"] for t in trials)
    assert summary["misses_by_type"] == misses


def test_rq3_summary_matches_record_recount():
    rq3, summary = load("rq3_policy.json"), load("summary.json")["rq3_policy"]
    count = lambda o: sum(r["outcome"] == o for r in rq3["records"])
    tp, fp, tn, fn = (count(o) for o in ("true_positive", "false_positive", "true_negative", "false_negative"))
    assert (tp, fp, tn, fn) == (summary["tp"], summary["fp"], summary["tn"], summary["fn"])
    assert summary["precision"] == tp / (tp + fp)
    assert summary["recall"] == tp / (tp + fn)
    assert len(rq3["records"]) == rq3["corpus_total"]


def test_rq1_summary_matches_per_run_hashes():
    rep, summary = load("rq1_reproducibility.json"), load("summary.json")["rq1_reproducibility"]
    for name, eng in rep["per_engine"].items():
        first = eng["runs"][0]
        matching = sum(r["plan_hash"] == first["plan_hash"] and r["state_hash"] == first["state_hash"] for r in eng["runs"])
        assert matching == summary[name]["matching"] == eng["runs_matching_run1"]
        assert len(eng["runs"]) == summary[name]["total"]
