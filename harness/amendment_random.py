"""D12 amendment: the RQ1 arms on a second provider, hashicorp/random.

Post-registration extension registered in DECISIONS.md D12 (2026-11-17).
Runs cross engine plan equivalence and rebuild reproducibility on
lab/stack-random with the same normalisers and match rules as RQ1, and
writes only new result files. The RQ2 drift arm is not run: the provider
reads no external system on refresh, so no equivalent mutation exists;
that assessment is written to amendment_random_drift.json.

The state normaliser is harness.common.normalize_state, unchanged. For
random resources it keeps the generated id, which is the generated value
(the hex string for random_id, the UUID for random_uuid, the name for
random_pet), so the state hash tests exactly the drawn values.
"""
from __future__ import annotations

import json
import shutil
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from harness.common import (REPO_ROOT, engine_path, engine_version, hash_rows,
                            normalize_plan, normalize_state, run, write_result)

STACK_DIR = REPO_ROOT / "lab" / "stack-random"
RUNS = 20
PROVIDER = "hashicorp/random"
PROVIDER_VERSION = "3.9.1"


def clean_stack_r() -> None:
    for name in ["terraform.tfstate", "terraform.tfstate.backup", "plan.bin"]:
        target = STACK_DIR / name
        if target.exists():
            target.unlink()
    terraform_dir = STACK_DIR / ".terraform"
    if terraform_dir.exists():
        shutil.rmtree(terraform_dir)


def init_engine_r(binary: str) -> None:
    """Same rule as harness.common.init_engine: up to 3 attempts."""
    last = None
    for attempt in range(3):
        result = run([binary, "init", "-no-color", "-input=false"],
                     cwd=STACK_DIR, check=False)
        if result.returncode == 0:
            return
        last = result
        time.sleep(5 * (attempt + 1))
    out = last.stdout[-1500:] if last else ""
    err = last.stderr[-1500:] if last else ""
    raise RuntimeError(f"init failed after 3 attempts: {binary} stdout: {out} stderr: {err}")


def plan_json_r(binary: str) -> dict:
    plan_path = STACK_DIR / "plan.bin"
    run([binary, "plan", "-no-color", "-input=false", "-out=plan.bin"],
        cwd=STACK_DIR, check=True)
    result = run([binary, "show", "-json", str(plan_path)], cwd=STACK_DIR, check=True)
    return json.loads(result.stdout)


def state_json_r(binary: str) -> dict:
    result = run([binary, "show", "-json"], cwd=STACK_DIR, check=True)
    return json.loads(result.stdout)


def plan_equivalence() -> dict:
    plans = {}
    versions = {}
    for name in ("tofu", "terraform"):
        binary = engine_path(name)
        versions[name] = engine_version(binary)
        clean_stack_r()
        init_engine_r(binary)
        plans[name] = normalize_plan(plan_json_r(binary))
        clean_stack_r()
    tofu_rows = {row["address"]: row for row in plans["tofu"]}
    tf_rows = {row["address"]: row for row in plans["terraform"]}
    addresses = sorted(set(tofu_rows) | set(tf_rows))
    mismatches = []
    matches = 0
    for address in addresses:
        a = tofu_rows.get(address)
        b = tf_rows.get(address)
        if a is not None and b is not None and a["actions"] == b["actions"] and a["type"] == b["type"]:
            matches += 1
        else:
            mismatches.append({"address": address, "tofu": a, "terraform": b})
    result = {
        "study": "amendment_random_plan_equivalence",
        "amendment": "D12",
        "provider": PROVIDER,
        "provider_version": PROVIDER_VERSION,
        "engine_versions": versions,
        "resource_count_tofu": len(tofu_rows),
        "resource_count_terraform": len(tf_rows),
        "addresses_compared": len(addresses),
        "matches": matches,
        "mismatches": mismatches,
        "match_rate": (matches / len(addresses)) if addresses else 0.0,
    }
    path = write_result("amendment_random_plan_equivalence.json", result)
    print(f"wrote {path}")
    print(f"plan equivalence: matches {matches} of {len(addresses)}")
    return result


def one_engine_reproducibility(name: str) -> dict:
    binary = engine_path(name)
    version = engine_version(binary)
    clean_stack_r()
    init_engine_r(binary)
    runs = []
    for index in range(1, RUNS + 1):
        start = time.time()
        plan_hash = hash_rows(normalize_plan(plan_json_r(binary)))
        run([binary, "apply", "-auto-approve", "-no-color", "-input=false"],
            cwd=STACK_DIR, check=True)
        state_hash = hash_rows(normalize_state(state_json_r(binary)))
        refresh = run([binary, "plan", "-no-color", "-input=false", "-detailed-exitcode"],
                      cwd=STACK_DIR, check=False)
        run([binary, "destroy", "-auto-approve", "-no-color", "-input=false"],
            cwd=STACK_DIR, check=True)
        elapsed = time.time() - start
        runs.append({
            "run": index,
            "plan_hash": plan_hash,
            "state_hash": state_hash,
            "refresh_plan_exit_code": refresh.returncode,
            "seconds": round(elapsed, 3),
        })
        print(f"{name} run {index} plan {plan_hash[:12]} state {state_hash[:12]} "
              f"refresh_exit {refresh.returncode} {elapsed:.2f}s")
    first_plan = runs[0]["plan_hash"]
    first_state = runs[0]["state_hash"]
    match_count = sum(1 for r in runs
                      if r["plan_hash"] == first_plan and r["state_hash"] == first_state)
    plan_match = sum(1 for r in runs if r["plan_hash"] == first_plan)
    state_match = sum(1 for r in runs if r["state_hash"] == first_state)
    refresh_clean = sum(1 for r in runs if r["refresh_plan_exit_code"] == 0)
    times = [r["seconds"] for r in runs]
    clean_stack_r()
    return {
        "engine": name,
        "version": version,
        "runs_total": RUNS,
        "runs_matching_run1": match_count,
        "runs_matching_run1_plan_only": plan_match,
        "runs_matching_run1_state_only": state_match,
        "refresh_plan_no_changes_after_apply": refresh_clean,
        "median_seconds": round(statistics.median(times), 3),
        "min_seconds": round(min(times), 3),
        "max_seconds": round(max(times), 3),
        "runs": runs,
    }


def reproducibility() -> dict:
    per_engine = {}
    for name in ("tofu", "terraform"):
        per_engine[name] = one_engine_reproducibility(name)
    tofu_states = {r["state_hash"] for r in per_engine["tofu"]["runs"]}
    tf_states = {r["state_hash"] for r in per_engine["terraform"]["runs"]}
    tofu_plans = {r["plan_hash"] for r in per_engine["tofu"]["runs"]}
    tf_plans = {r["plan_hash"] for r in per_engine["terraform"]["runs"]}
    result = {
        "study": "amendment_random_reproducibility",
        "amendment": "D12",
        "provider": PROVIDER,
        "provider_version": PROVIDER_VERSION,
        "per_engine": per_engine,
        "cross_engine": {
            "plan_hash_sets_identical": tofu_plans == tf_plans,
            "distinct_plan_hashes_total": len(tofu_plans | tf_plans),
            "distinct_state_hashes_total": len(tofu_states | tf_states),
            "state_hashes_shared_across_engines": len(tofu_states & tf_states),
        },
    }
    path = write_result("amendment_random_reproducibility.json", result)
    print(f"wrote {path}")
    for name, data in per_engine.items():
        print(f"{name}: {data['runs_matching_run1']} of {data['runs_total']} match run 1 "
              f"(plan only {data['runs_matching_run1_plan_only']}, "
              f"state only {data['runs_matching_run1_state_only']}, "
              f"refresh clean {data['refresh_plan_no_changes_after_apply']})")
    return result


def drift_assessment() -> dict:
    result = {
        "study": "amendment_random_drift",
        "amendment": "D12",
        "provider": PROVIDER,
        "provider_version": PROVIDER_VERSION,
        "status": "not_run_no_equivalent_resource",
        "equivalent_resource_exists": False,
        "reason": (
            "RQ2 measures whether a refresh plan detects an out-of-band change to a "
            "managed object. hashicorp/random resources have no external object: the "
            "provider stores the drawn value in state and reads nothing back from any "
            "external system on refresh, so no out-of-band mutation exists for a "
            "refresh plan to detect. No resource in the provider is an equivalent of "
            "local_file for this arm, so the arm is not run rather than approximated."
        ),
    }
    path = write_result("amendment_random_drift.json", result)
    print(f"wrote {path}")
    return result


def main() -> int:
    plan_equivalence()
    reproducibility()
    drift_assessment()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
