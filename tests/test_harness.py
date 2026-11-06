import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from harness.common import hash_rows, normalize_plan, normalize_state, precision_recall
from harness.generate_corpus import build_cases
from harness.rq2_drift import build_mutation_list


def test_normalize_plan_sorts_and_extracts():
    plan = {"resource_changes": [
        {"address": "local_file.b", "type": "local_file", "change": {"actions": ["create"]}},
        {"address": "local_file.a", "type": "local_file", "change": {"actions": ["create"]}},
    ]}
    rows = normalize_plan(plan)
    assert [r["address"] for r in rows] == ["local_file.a", "local_file.b"]
    assert rows[0]["actions"] == ["create"]


def test_normalize_state_excludes_lineage():
    state = {"values": {"root_module": {"resources": [
        {"address": "local_file.a", "values": {"filename": "build/a.json", "content": "{}", "file_permission": "0644", "id": "abc"}},
    ]}}, "lineage": "should-not-appear", "serial": 9}
    rows = normalize_state(state)
    assert rows[0]["address"] == "local_file.a"
    assert "lineage" not in json.dumps(rows)


def test_hash_rows_is_deterministic():
    rows = [{"address": "a", "values": {"content": "x"}}]
    assert hash_rows(rows) == hash_rows([dict(rows[0])])
    assert len(hash_rows(rows)) == 64


def test_precision_recall_arithmetic():
    precision, recall = precision_recall(tp=28, fp=0, fn=2)
    assert precision == 1.0
    assert abs(recall - (28 / 30)) < 1e-9
    precision, recall = precision_recall(tp=0, fp=0, fn=5)
    assert precision == 0.0 and recall == 0.0


def test_corpus_counts_and_labels():
    cases = build_cases()
    compliant = [c for c in cases if c["label"] == "compliant"]
    violating = [c for c in cases if c["label"] == "violating"]
    assert len(compliant) == 30
    assert len(violating) == 30
    types = {c["violation_type"] for c in violating}
    assert "public_exposure" in types
    assert "hard_coded_secret" in types
    # Corpus secrets are fixture markers only.
    blob = json.dumps(cases)
    assert "TEST-SECRET" in blob
    assert "sk-live" not in blob


def test_corpus_docs_are_valid_plan_json():
    for case in build_cases():
        doc = case["doc"]
        assert doc["resource_changes"][0]["type"] == "local_file"
        content = doc["resource_changes"][0]["change"]["after"]["content"]
        assert isinstance(content, str)


def test_mutation_list_coverage():
    mutations = build_mutation_list()
    assert len(mutations) >= 50
    files = {m["file"] for m in mutations}
    kinds = {m["type"] for m in mutations}
    assert len(files) >= 10
    assert "unmanaged_addition" in kinds
    assert "permission_change" in kinds
    assert "file_delete" in kinds


def test_mutation_list_is_deterministic():
    assert build_mutation_list() == build_mutation_list()
