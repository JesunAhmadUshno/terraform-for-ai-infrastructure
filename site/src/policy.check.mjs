// Known-answer check, run by "npm run build" before vite.
// Proves every number the page computes in the browser equals the committed result files.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RULES, evaluate, confusion, syntaxBaseline, driftRecount, mixRecall, perTypeRates, wilson, verdicts } from './policy.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (p) => JSON.parse(fs.readFileSync(root + p, 'utf8'));
const labels = read('corpus/labels.json');
const docs = Object.fromEntries(labels.map((l) => [l.file, read(`corpus/${l.file}`)]));
const rq1 = read('results/rq1_plan_equivalence.json');
const rep = read('results/rq1_reproducibility.json');
const rq2 = read('results/rq2_drift.json');
const rq3 = read('results/rq3_policy.json');
const summary = read('results/summary.json');

// RQ3: the JS port of policy/policy.rego reproduces the recorded conftest run, file by file.
const all = Object.fromEntries(RULES.map((r) => [r.id, true]));
const c = confusion(labels, docs, all);
assert.deepEqual([c.tp, c.fp, c.tn, c.fn], [rq3.true_positives, rq3.false_positives, rq3.true_negatives, rq3.false_negatives]);
assert.equal(c.precision, rq3.precision);
assert.equal(c.recall, rq3.recall);
for (const rec of rq3.records) assert.equal(evaluate(docs[rec.file], all).length > 0, rec.predicted_violating, rec.file);
assert.deepEqual(c.rows.filter((r) => r.outcome === 'false_negative').map((r) => r.file), ['violating-28.json', 'violating-29.json']);

// Rego undefined semantics: a missing encryption_enabled field and unparsable content emit no deny.
const one = (after) => ({ resource_changes: [{ address: 'local_file.x', type: 'local_file', change: { after } }] });
assert.equal(evaluate(one({ content: '{"bind":"127.0.0.1"}', file_permission: '0644' }), all).length, 0);
assert.equal(evaluate(one({ content: 'exposure=public', file_permission: '0644' }), all).length, 0);
assert.equal(evaluate(one({ content: 'not json', file_permission: '0777' }), all).length, 1);

// Syntax-only baseline from HYPOTHESES.md: every corpus file is valid plan JSON, so it flags nothing.
const b = syntaxBaseline(labels, docs);
assert.deepEqual([b.tp, b.fn, b.fp], [0, 30, 0]);

// RQ2: recounts from the per-trial array equal the recorded summary fields.
const d = driftRecount(rq2.trials);
assert.equal(d.detected, rq2.detected);
assert.equal(d.total, rq2.trials_total);
assert.equal(d.recall, rq2.recall);
assert.equal(d.managedDetected, rq2.managed_detected);
assert.equal(d.managed, rq2.managed_trials);
assert.equal(d.recallManaged, rq2.recall_managed_only);
assert.equal(d.naive, rq2.naive_exists_detected);
assert.equal(d.naiveRecall, rq2.naive_exists_recall);
assert.deepEqual(d.misses, rq2.misses_by_type);
// What-if at the recorded mix reproduces the recorded recall.
const rates = perTypeRates(rq2.trials);
assert.ok(Math.abs(mixRecall(rates, Object.fromEntries(Object.entries(rates).map(([k, v]) => [k, v.n]))) - rq2.recall) < 1e-12);

// Wilson 95% interval: H3 recall 38/54 is about 0.57 to 0.81 (textbook formula).
const w = wilson(38, 54);
assert.ok(Math.abs(w[0] - 0.5717) < 1e-3 && Math.abs(w[1] - 0.8086) < 1e-3, `wilson ${w}`);

// Verdicts recomputed with the logic of harness/generate_results_md.py equal summary.json.
assert.deepEqual(verdicts({ rq1, rep, rq2, rq3 }), summary.verdicts);

// RQ1: both engines hash identically in every run.
for (const e of Object.values(rep.per_engine)) assert.equal(e.runs.filter((r) => r.plan_hash === e.runs[0].plan_hash && r.state_hash === e.runs[0].state_hash).length, e.runs_matching_run1);

// The port has one rule per deny block in policy.rego, and the drift trials cover all 13 compared addresses.
assert.equal(RULES.length, (fs.readFileSync(root + 'policy/policy.rego', 'utf8').match(/^deny contains/gm) || []).length);
assert.equal(new Set(rq2.trials.map((t) => t.address)).size, rq1.addresses_compared);

console.log('policy ok', { tp: c.tp, fp: c.fp, tn: c.tn, fn: c.fn, drift: `${d.detected}/${d.total}`, wilsonH3: w.map((x) => x.toFixed(4)) });
