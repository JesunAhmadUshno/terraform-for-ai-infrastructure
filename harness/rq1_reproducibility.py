"""RQ1 rebuild reproducibility: 20 destroy and apply runs per engine."""
from __future__ import annotations

import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from harness.common import (clean_stack, engine_path, engine_version, hash_rows,
                            init_engine, normalize_plan, normalize_state,
                            plan_json, run, state_json, write_result, STACK_DIR)

RUNS = 20


def one_engine(name: str) -> dict:
    binary = engine_path(name)
    version = engine_version(binary)
    clean_stack()
    init_engine(binary)
    runs = []
    for index in range(1, RUNS + 1):
        start = time.time()
        plan = plan_json(binary)
        plan_hash = hash_rows(normalize_plan(plan))
        run([binary, "apply", "-auto-approve", "-no-color", "-input=false"],
            cwd=STACK_DIR, check=True)
        state_hash = hash_rows(normalize_state(state_json(binary)))
        run([binary, "destroy", "-auto-approve", "-no-color", "-input=false"],
            cwd=STACK_DIR, check=True)
        elapsed = time.time() - start
        runs.append({
            "run": index,
            "plan_hash": plan_hash,
            "state_hash": state_hash,
            "seconds": round(elapsed, 3),
        })
        print(f"{name} run {index} plan {plan_hash[:12]} state {state_hash[:12]} {elapsed:.2f}s")
    first_plan = runs[0]["plan_hash"]
    first_state = runs[0]["state_hash"]
    match_count = sum(1 for r in runs if r["plan_hash"] == first_plan and r["state_hash"] == first_state)
    times = [r["seconds"] for r in runs]
    clean_stack()
    return {
        "engine": name,
        "version": version,
        "runs_total": RUNS,
        "runs_matching_run1": match_count,
        "median_seconds": round(statistics.median(times), 3),
        "min_seconds": round(min(times), 3),
        "max_seconds": round(max(times), 3),
        "runs": runs,
    }


def main() -> int:
    per_engine = {}
    for name in ("tofu", "terraform"):
        per_engine[name] = one_engine(name)
    result = {"study": "rq1_reproducibility", "per_engine": per_engine}
    path = write_result("rq1_reproducibility.json", result)
    print(f"wrote {path}")
    for name, data in per_engine.items():
        print(f"{name}: {data['runs_matching_run1']} of {data['runs_total']} match run 1")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
