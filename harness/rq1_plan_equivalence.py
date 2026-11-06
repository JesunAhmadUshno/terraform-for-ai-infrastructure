"""RQ1 plan equivalence: OpenTofu plan versus Terraform plan on the same config."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from harness.common import (STACK_DIR, clean_stack, engine_path, engine_version,
                            init_engine, normalize_plan, plan_json, write_result)


def main() -> int:
    plans = {}
    versions = {}
    for name in ("tofu", "terraform"):
        binary = engine_path(name)
        versions[name] = engine_version(binary)
        clean_stack()
        init_engine(binary)
        plan = plan_json(binary)
        plans[name] = normalize_plan(plan)
        clean_stack()
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
        "study": "rq1_plan_equivalence",
        "engine_versions": versions,
        "resource_count_tofu": len(tofu_rows),
        "resource_count_terraform": len(tf_rows),
        "addresses_compared": len(addresses),
        "matches": matches,
        "mismatches": mismatches,
        "match_rate": (matches / len(addresses)) if addresses else 0.0,
    }
    path = write_result("rq1_plan_equivalence.json", result)
    print(f"wrote {path}")
    print(f"matches {matches} of {len(addresses)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
