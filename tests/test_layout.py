"""Portfolio standard checks: the lock holds, the required files exist, no public grade."""
import hashlib
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# SHA-256 of each locked file as committed in fee401d (tag proposal-v1), before any code or result.
LOCKED_SHA256 = {
    "SPEC.md": "3497702f0f0a1f5fd0884ae5bb2f4e450b7431106bc6af1e9ff19322c060b0f6",
    "HYPOTHESES.md": "0b04c30874985db9705805b996bc83ed117f0459e7f600e65886fcd38e80908d",
}


def test_locked_proposal_is_unchanged():
    for name, want in LOCKED_SHA256.items():
        with open(os.path.join(ROOT, name), "rb") as f:
            assert hashlib.sha256(f.read()).hexdigest() == want, \
                name + " changed after its lock; record an amendment in DECISIONS.md instead"


def test_required_files_exist():
    need = ["README.md", "SPEC.md", "HYPOTHESES.md", "REPORT.md", "METHODS.md", "RESULTS.md", "AUDIT.md",
            "DECISIONS.md", "CHANGELOG.md", "CITATION.cff", "SECURITY.md", "LICENSE", "lab/stack/main.tf",
            "policy/policy.rego", "corpus/labels.json", "results/summary.json"]
    missing = [p for p in need if not os.path.exists(os.path.join(ROOT, p))]
    assert not missing, "missing: " + ", ".join(missing)


GRADE = re.compile(r"of 10,000|10,000 scale|/ ?10000|Grade:|grade:|\bself[- ]grade\b", re.I)


def test_no_public_grade():
    public = [n for n in os.listdir(ROOT) if n.endswith(".md")]
    public += [os.path.join("site", "src", n) for n in os.listdir(os.path.join(ROOT, "site", "src"))]
    for name in public:
        text = open(os.path.join(ROOT, name), encoding="utf-8").read()
        assert not GRADE.search(text), name + " carries a grade; grades are internal"
