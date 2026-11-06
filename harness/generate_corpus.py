"""Generate the labelled RQ3 policy corpus.

Labels are set by construction. 30 compliant and 30 violating plan JSON
files. Secret values are test fixture markers, not real credentials.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

REPO_ROOT = Path(__file__).resolve().parent.parent
CORPUS_DIR = REPO_ROOT / "corpus"

BASE = {
    "name": "inference", "kind": "inference", "port": 8000,
    "bind": "127.0.0.1", "exposure": "private",
    "encryption_enabled": True, "api_key": "", "model": "local-echo-1",
    "replicas": 1,
}
KINDS = ["inference", "vector-store", "metadata-store", "gateway",
         "embedding", "evaluation", "observability", "model-registry"]


def plan_doc(service: dict, permission: str, content_override=None) -> dict:
    content = content_override if content_override is not None else json.dumps(service, sort_keys=True)
    name = service.get("name", "service")
    return {
        "format_version": "1.2",
        "resource_changes": [{
            "address": f'local_file.service["{name}"]',
            "type": "local_file",
            "name": "service",
            "change": {
                "actions": ["create"],
                "after": {
                    "filename": f"build/{name}.json",
                    "file_permission": permission,
                    "content": content,
                },
            },
        }],
    }


def build_cases() -> list:
    cases = []
    # 30 compliant cases.
    for i in range(30):
        service = dict(BASE)
        service["name"] = f"svc-compliant-{i:02d}"
        service["kind"] = KINDS[i % len(KINDS)]
        service["port"] = 8000 + i
        service["file_note"] = "public docs are served by another tier" if i % 5 == 0 else "standard"
        if i % 3 == 0:
            service.pop("api_key", None)
        permission = "0600" if i % 4 == 0 else "0644"
        cases.append({
            "file": f"compliant-{i:02d}.json",
            "label": "compliant",
            "violation_type": None,
            "doc": plan_doc(service, permission),
        })
    # 30 violating cases, by type.
    violating_specs = []
    for i in range(7):
        violating_specs.append(("public_exposure", {"exposure": "public"}, "0644", None))
    for i in range(7):
        violating_specs.append(("hard_coded_secret", {"api_key": "TEST-SECRET-0001"}, "0644", None))
    for i in range(6):
        violating_specs.append(("encryption_disabled", {"encryption_enabled": False}, "0644", None))
    for i in range(5):
        violating_specs.append(("world_writable", {}, "0777", None))
    for i in range(3):
        violating_specs.append(("bind_all_interfaces", {"bind": "0.0.0.0"}, "0644", None))
    # Two encoded forms the Rego policy does not parse, pre-registered as expected misses.
    violating_specs.append(("secret_in_plain_text_content", {}, "0644", "api_key=TEST-SECRET-0002\n"))
    violating_specs.append(("secret_alternate_key_name", {"apiKey": "TEST-SECRET-0003"}, "0644", None))
    for i, (vtype, overrides, permission, content_override) in enumerate(violating_specs):
        service = dict(BASE)
        service["name"] = f"svc-violating-{i:02d}"
        service["kind"] = KINDS[i % len(KINDS)]
        service["port"] = 9000 + i
        service.update(overrides)
        cases.append({
            "file": f"violating-{i:02d}.json",
            "label": "violating",
            "violation_type": vtype,
            "doc": plan_doc(service, permission, content_override=content_override),
        })
    return cases


def main() -> int:
    CORPUS_DIR.mkdir(parents=True, exist_ok=True)
    for old in CORPUS_DIR.glob("*.json"):
        if old.name != "labels.json":
            old.unlink()
    cases = build_cases()
    labels = []
    for case in cases:
        (CORPUS_DIR / case["file"]).write_text(
            json.dumps(case["doc"], indent=2, sort_keys=True) + "\n", encoding="utf-8")
        labels.append({"file": case["file"], "label": case["label"],
                       "violation_type": case["violation_type"]})
    (CORPUS_DIR / "labels.json").write_text(
        json.dumps(labels, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    compliant = sum(1 for c in cases if c["label"] == "compliant")
    violating = sum(1 for c in cases if c["label"] == "violating")
    print(f"corpus: {compliant} compliant, {violating} violating, {len(cases)} total")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
