"""RQ3 policy precision and recall: conftest against plan JSON corpus."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from harness.common import precision_recall, run, tool_path, write_result
from harness.generate_corpus import CORPUS_DIR, REPO_ROOT

POLICY_DIR = REPO_ROOT / "policy"


def main() -> int:
    conftest = tool_path("conftest")
    version_run = run([conftest, "--version"])
    version = (version_run.stdout or version_run.stderr).strip().splitlines()[0]
    labels = json.loads((CORPUS_DIR / "labels.json").read_text(encoding="utf-8"))
    records = []
    tp = fp = tn = fn = 0
    for entry in labels:
        file_path = CORPUS_DIR / entry["file"]
        result = run([conftest, "test", "--policy", str(POLICY_DIR), str(file_path)],
                     check=False)
        predicted_violating = result.returncode != 0
        actual_violating = entry["label"] == "violating"
        if predicted_violating and actual_violating:
            outcome = "true_positive"; tp += 1
        elif predicted_violating and not actual_violating:
            outcome = "false_positive"; fp += 1
        elif not predicted_violating and actual_violating:
            outcome = "false_negative"; fn += 1
        else:
            outcome = "true_negative"; tn += 1
        records.append({
            "file": entry["file"], "label": entry["label"],
            "violation_type": entry["violation_type"],
            "predicted_violating": predicted_violating, "outcome": outcome,
        })
        print(f"{entry['file']}: label={entry['label']} predicted_violating={predicted_violating} {outcome}")
    precision, recall = precision_recall(tp, fp, fn)
    result = {
        "study": "rq3_policy",
        "tool": "conftest",
        "tool_version": version,
        "corpus_total": len(labels),
        "true_positives": tp, "false_positives": fp,
        "true_negatives": tn, "false_negatives": fn,
        "precision": precision, "recall": recall,
        "records": records,
    }
    path = write_result("rq3_policy.json", result)
    print(f"wrote {path}")
    print(f"TP={tp} FP={fp} TN={tn} FN={fn} precision={precision:.4f} recall={recall:.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
