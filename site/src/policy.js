// Logic that runs live in the browser. Checked against results/*.json by policy.check.mjs.

// Rego's json.unmarshal is undefined on invalid JSON, and field access on a non-object is
// undefined, so any rule that needs the parsed content simply does not fire.
function unmarshal(content) {
  if (typeof content !== 'string') return undefined;
  try { const v = JSON.parse(content); return v && typeof v === 'object' && !Array.isArray(v) ? v : undefined; } catch { return undefined; }
}

// Faithful port of the five deny rules in policy/policy.rego, in file order.
export const RULES = [
  { id: 'public', label: 'Public exposure', test: (svc) => svc?.exposure === 'public', msg: (a) => `public exposure in ${a}` },
  { id: 'bind', label: 'Bind to 0.0.0.0', test: (svc) => svc?.bind === '0.0.0.0', msg: (a) => `bind to all interfaces in ${a}` },
  // object.get(svc, "api_key", "") then key != "": a missing key defaults to "" and passes.
  { id: 'secret', label: 'Non-empty api_key', test: (svc) => svc !== undefined && (Object.hasOwn(svc, 'api_key') ? svc.api_key : '') !== '', msg: (a) => `hard coded secret in ${a}` },
  // Only an explicit false fires. A missing field is undefined in Rego and passes silently.
  { id: 'encryption', label: 'encryption_enabled false', test: (svc) => svc?.encryption_enabled === false, msg: (a) => `encryption disabled in ${a}` },
  // The one rule that reads plan attributes directly, so it works even when content is not JSON.
  { id: 'perm', label: 'file_permission 0777', raw: true, test: (_, after) => after?.file_permission === '0777', msg: (a) => `world writable permission in ${a}` },
];

// Returns the deny set (Rego sets drop duplicates) for one plan JSON document.
export function evaluate(doc, enabled) {
  const out = new Set();
  const changes = Array.isArray(doc?.resource_changes) ? doc.resource_changes : [];
  for (const rc of changes) {
    if (rc?.type !== 'local_file') continue;
    const after = rc.change?.after;
    const svc = unmarshal(after?.content);
    for (const r of RULES) if (enabled[r.id] && r.test(svc, after)) out.add(r.msg(rc.address));
  }
  return [...out];
}

export function confusion(labels, docs, enabled, predict = (doc) => evaluate(doc, enabled).length > 0) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const rows = labels.map((l) => {
    const pred = predict(docs[l.file]), actual = l.label === 'violating';
    const outcome = pred ? (actual ? 'true_positive' : 'false_positive') : (actual ? 'false_negative' : 'true_negative');
    if (outcome === 'true_positive') tp++; else if (outcome === 'false_positive') fp++; else if (outcome === 'false_negative') fn++; else tn++;
    return { ...l, pred, outcome };
  });
  // Same convention as harness/common.py precision_recall: 0 when the denominator is 0.
  return { tp, fp, tn, fn, rows, precision: tp + fp ? tp / (tp + fp) : 0, recall: tp + fn ? tp / (tp + fn) : 0 };
}

// Syntax-only baseline (HYPOTHESES.md): flags a file only if it is not well-formed plan JSON.
export const validPlan = (doc) => Array.isArray(doc?.resource_changes) && doc.resource_changes.every((rc) => typeof rc?.address === 'string' && typeof rc?.type === 'string' && rc.change?.after);
export const syntaxBaseline = (labels, docs) => confusion(labels, docs, {}, (doc) => !validPlan(doc));

export function driftRecount(trials) {
  const managed = trials.filter((t) => t.managed_file_mutation);
  const misses = {};
  for (const t of trials) if (!t.detected) misses[t.type] = (misses[t.type] || 0) + 1;
  const detected = trials.filter((t) => t.detected).length, naive = trials.filter((t) => t.naive_exists_check_detected).length;
  const managedDetected = managed.filter((t) => t.detected).length;
  return { total: trials.length, detected, recall: detected / trials.length, managed: managed.length, managedDetected, recallManaged: managedDetected / managed.length, naive, naiveRecall: naive / trials.length, misses };
}

export function perTypeRates(trials) {
  const out = {};
  for (const t of trials) { const o = (out[t.type] ||= { n: 0, det: 0 }); o.n++; if (t.detected) o.det++; }
  for (const o of Object.values(out)) o.rate = o.det / o.n;
  return out;
}

// Reweights the recorded per-type detection rates. Not a new run: engines cannot run in a browser.
export function mixRecall(rates, weights) {
  let num = 0, den = 0;
  for (const [k, w] of Object.entries(weights)) { num += w * rates[k].rate; den += w; }
  return den ? num / den : 0;
}

// Wilson score 95% interval for k successes in n trials.
export function wilson(k, n, z = 1.959964) {
  const p = k / n, den = 1 + z * z / n, c = (p + z * z / (2 * n)) / den;
  const h = (z / den) * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

// Pre-registered thresholds, copied from HYPOTHESES.md (committed in fee401d before any experiment code).
export const THRESHOLDS = {
  H1: { supported: 1.0, partial: 0.90 }, // address match rate
  H2: { supported: 19, partial: 16, of: 20 }, // runs matching run 1, per engine
  H3: { supported: 0.90, partial: 0.70 }, // drift recall over all mutations
  H4: { supported: 0.90, partial: 0.75 }, // precision and recall, both
};

// Same branches as harness/generate_results_md.py.
export function verdicts({ rq1, rep, rq2, rq3 }) {
  const T = THRESHOLDS;
  const h1 = rq1.mismatches.length === 0 && rq1.match_rate === T.H1.supported ? 'Supported' : rq1.match_rate >= T.H1.partial ? 'Partially supported' : 'Refuted';
  const counts = Object.values(rep.per_engine).map((e) => e.runs_matching_run1);
  const h2 = counts.every((c) => c >= T.H2.supported) ? 'Supported' : counts.every((c) => c >= T.H2.partial) ? 'Partially supported' : 'Refuted';
  const h3 = rq2.recall >= T.H3.supported ? 'Supported' : rq2.recall >= T.H3.partial ? 'Partially supported' : 'Refuted';
  const pr = [rq3.precision, rq3.recall];
  const h4 = pr.every((v) => v >= T.H4.supported) ? 'Supported' : pr.every((v) => v >= T.H4.partial) ? 'Partially supported' : 'Refuted';
  return { H1_plan_equivalence: h1, H2_rebuild_reproducibility: h2, H3_drift_recall: h3, H4_policy_precision_recall: h4 };
}
