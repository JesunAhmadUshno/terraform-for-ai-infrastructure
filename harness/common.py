"""Shared helpers for the Terraform local lab harness.

All helpers use only the Python standard library.
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
STACK_DIR = REPO_ROOT / "lab" / "stack"
RESULTS_DIR = REPO_ROOT / "results"
TOOLS_BIN = Path.home() / "workspace" / "tools" / "bin"


def engine_path(name: str) -> str:
    """Find an engine binary by env var, PATH, or the workspace tools bin."""
    env_key = name.upper() + "_BIN"
    if os.environ.get(env_key):
        return os.environ[env_key]
    found = shutil.which(name)
    if found:
        return found
    candidate = TOOLS_BIN / name
    if candidate.exists():
        return str(candidate)
    raise FileNotFoundError(f"engine binary not found: {name}")


def tool_path(name: str) -> str:
    found = shutil.which(name)
    if found:
        return found
    candidate = TOOLS_BIN / name
    if candidate.exists():
        return str(candidate)
    raise FileNotFoundError(f"tool binary not found: {name}")


def run(cmd, cwd=None, check=False, timeout=300):
    result = subprocess.run(
        cmd, cwd=str(cwd) if cwd else None,
        capture_output=True, text=True, timeout=timeout,
    )
    if check and result.returncode != 0:
        raise RuntimeError(
            f"command failed ({result.returncode}): {' '.join(map(str, cmd))}\n"
            f"stdout: {result.stdout[-2000:]}\nstderr: {result.stderr[-2000:]}"
        )
    return result


def engine_version(binary: str) -> str:
    result = run([binary, "version"], check=True)
    first = result.stdout.strip().splitlines()[0] if result.stdout.strip() else ""
    return first.strip()


def clean_stack(keep_init: bool = False) -> None:
    """Remove state, build output and plan files from the stack dir."""
    for name in ["terraform.tfstate", "terraform.tfstate.backup", "plan.bin"]:
        target = STACK_DIR / name
        if target.exists():
            target.unlink()
    build = STACK_DIR / "build"
    if build.exists():
        shutil.rmtree(build)
    if not keep_init:
        terraform_dir = STACK_DIR / ".terraform"
        if terraform_dir.exists():
            shutil.rmtree(terraform_dir)
        # The lock file is kept on purpose. It pins provider selections
        # and is part of the reproducibility design, not run state.


def init_engine(binary: str) -> None:
    """Init with up to 3 attempts. Init is not a measured step.

    Registry access on this VM has transient timeout spikes, seen in
    the run logs. A retry changes no measured value: plan, apply and
    state capture all run after a successful init.
    """
    import time as _time
    last = None
    for attempt in range(3):
        result = run([binary, "init", "-no-color", "-input=false"], cwd=STACK_DIR, check=False)
        if result.returncode == 0:
            return
        last = result
        _time.sleep(5 * (attempt + 1))
    out = last.stdout[-1500:] if last else ""
    err = last.stderr[-1500:] if last else ""
    raise RuntimeError(f"init failed after 3 attempts: {binary} stdout: {out} stderr: {err}")


def plan_json(binary: str, out_name: str = "plan.bin") -> dict:
    plan_path = STACK_DIR / out_name
    run([binary, "plan", "-no-color", "-input=false", f"-out={out_name}"],
        cwd=STACK_DIR, check=True)
    result = run([binary, "show", "-json", str(plan_path)], cwd=STACK_DIR, check=True)
    return json.loads(result.stdout)


def state_json(binary: str) -> dict:
    result = run([binary, "show", "-json"], cwd=STACK_DIR, check=True)
    return json.loads(result.stdout)


def normalize_plan(plan: dict) -> list:
    """Sorted list of address, type and actions from a plan JSON document."""
    rows = []
    for change in plan.get("resource_changes", []):
        rows.append({
            "address": change.get("address", ""),
            "type": change.get("type", ""),
            "actions": list(change.get("change", {}).get("actions", [])),
        })
    rows.sort(key=lambda row: row["address"])
    return rows


def normalize_state(state: dict) -> list:
    """Sorted resource attributes from a state JSON document.

    Lineage, serial and timestamps are excluded by construction, because
    only values.root_module.resources attributes are read.
    """
    rows = []
    root = state.get("values", {}).get("root_module", {})

    def walk(module):
        for resource in module.get("resources", []):
            attrs = resource.get("values", {})
            keep = {k: attrs.get(k) for k in ("filename", "content", "file_permission", "id")
                    if k in attrs}
            rows.append({"address": resource.get("address", ""), "values": keep})
        for child in module.get("child_modules", []):
            walk(child)

    walk(root)
    rows.sort(key=lambda row: row["address"])
    return rows


def hash_rows(rows) -> str:
    payload = json.dumps(rows, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def precision_recall(tp: int, fp: int, fn: int) -> tuple:
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    return precision, recall


def write_result(name: str, data: dict) -> Path:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    path = RESULTS_DIR / name
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return path
