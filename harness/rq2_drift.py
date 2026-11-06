"""RQ2 drift detection: seeded out-of-band mutations versus refresh plan.

Primary engine is OpenTofu. Each trial applies fresh, mutates one file
outside the engine, then runs plan with refresh and checks plan JSON.
"""
from __future__ import annotations

import os
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from harness.common import (STACK_DIR, clean_stack, engine_path, engine_version,
                            init_engine, run, write_result)

# Managed build files and the plan address that owns each one.
MANAGED = {
    "inference.json": 'local_file.service["inference"]',
    "vector.json": 'local_file.service["vector"]',
    "metadata.json": 'local_file.service["metadata"]',
    "gateway.json": 'local_file.service["gateway"]',
    "embedding.json": 'local_file.service["embedding"]',
    "evaluation.json": 'local_file.service["evaluation"]',
    "observability.json": 'local_file.service["observability"]',
    "registry.json": 'local_file.service["registry"]',
    "ingest.json": 'local_file.service["ingest"]',
    "policy.json": 'local_file.service["policy"]',
    "platform-manifest.json": "local_file.platform_manifest",
    "policy-manifest.json": "local_file.policy_manifest",
    "README.txt": "local_file.stack_readme",
}
TYPES = ["content_edit", "content_append", "file_delete", "file_truncate",
         "permission_change", "unmanaged_addition"]


def build_mutation_list() -> list:
    files = sorted(MANAGED)
    combos = []
    for file_name in files:
        for mutation_type in TYPES:
            combos.append({"file": file_name, "type": mutation_type,
                           "address": MANAGED[file_name]})
    rng = random.Random(42)
    rng.shuffle(combos)
    # 54 trials: a fixed, seeded subset that covers every file and every type.
    selected = combos[:54]
    # Guarantee coverage: if a type is missing, swap it in.
    present = {c["type"] for c in selected}
    for missing in [t for t in TYPES if t not in present]:
        for candidate in combos[54:]:
            if candidate["type"] == missing:
                selected[-1] = candidate
                break
    return selected


def mutate(build_dir: Path, trial: dict) -> None:
    target = build_dir / trial["file"]
    kind = trial["type"]
    if kind == "content_edit":
        target.write_text('{"tampered": true, "note": "out of band edit"}\n', encoding="utf-8")
    elif kind == "content_append":
        with target.open("a", encoding="utf-8") as handle:
            handle.write("\n<!-- out of band append -->\n")
    elif kind == "file_delete":
        target.unlink()
    elif kind == "file_truncate":
        target.write_text("", encoding="utf-8")
    elif kind == "permission_change":
        os.chmod(target, 0o777)
    elif kind == "unmanaged_addition":
        (build_dir / "unmanaged-extra.json").write_text("{}\n", encoding="utf-8")
    else:
        raise ValueError(kind)


def main() -> int:
    binary = engine_path("tofu")
    version = engine_version(binary)
    mutations = build_mutation_list()
    clean_stack()
    init_engine(binary)
    build_dir = STACK_DIR / "build"
    trials = []
    for index, trial in enumerate(mutations, start=1):
        # Fresh apply for this trial.
        run([binary, "destroy", "-auto-approve", "-no-color", "-input=false"],
            cwd=STACK_DIR, check=False)
        run([binary, "apply", "-auto-approve", "-no-color", "-input=false"],
            cwd=STACK_DIR, check=True)
        mutate(build_dir, trial)
        naive_detected = not (build_dir / trial["file"]).exists()
        result = run([binary, "plan", "-no-color", "-input=false",
                      "-detailed-exitcode", "-out=plan.bin"], cwd=STACK_DIR, check=False)
        exit_code = result.returncode
        detected = False
        changed_addresses = []
        if exit_code == 2:
            shown = run([binary, "show", "-json", "plan.bin"], cwd=STACK_DIR, check=False)
            if shown.returncode == 0:
                import json as _json
                plan = _json.loads(shown.stdout)
                changed_addresses = [c.get("address", "") for c in plan.get("resource_changes", [])
                                     if c.get("change", {}).get("actions") not in ([], ["no-op"])]
                detected = trial["address"] in changed_addresses
        record = {
            "trial": index,
            "file": trial["file"],
            "type": trial["type"],
            "address": trial["address"],
            "plan_exit_code": exit_code,
            "detected": detected,
            "changed_addresses": changed_addresses,
            "naive_exists_check_detected": naive_detected,
            "managed_file_mutation": trial["type"] != "unmanaged_addition",
        }
        trials.append(record)
        print(f"trial {index}: {trial['type']} on {trial['file']} detected={detected} exit={exit_code}")
    run([binary, "destroy", "-auto-approve", "-no-color", "-input=false"],
        cwd=STACK_DIR, check=False)
    clean_stack(keep_init=False)
    total = len(trials)
    detected_count = sum(1 for t in trials if t["detected"])
    managed = [t for t in trials if t["managed_file_mutation"]]
    managed_detected = sum(1 for t in managed if t["detected"])
    naive_count = sum(1 for t in trials if t["naive_exists_check_detected"])
    misses = {}
    for t in trials:
        if not t["detected"]:
            misses.setdefault(t["type"], 0)
            misses[t["type"]] += 1
    result = {
        "study": "rq2_drift",
        "engine": "tofu",
        "engine_version": version,
        "trials_total": total,
        "detected": detected_count,
        "recall": (detected_count / total) if total else 0.0,
        "managed_trials": len(managed),
        "managed_detected": managed_detected,
        "recall_managed_only": (managed_detected / len(managed)) if managed else 0.0,
        "naive_exists_detected": naive_count,
        "naive_exists_recall": (naive_count / total) if total else 0.0,
        "misses_by_type": misses,
        "trials": trials,
    }
    path = write_result("rq2_drift.json", result)
    print(f"wrote {path}")
    print(f"recall {detected_count}/{total} = {result['recall']:.4f}")
    print(f"misses by type: {misses}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
