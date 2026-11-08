import { useMemo, useState, useEffect, useId } from 'react';
import summary from '../../results/summary.json';
import rq1 from '../../results/rq1_plan_equivalence.json';
import rep from '../../results/rq1_reproducibility.json';
import rq2 from '../../results/rq2_drift.json';
import rq3 from '../../results/rq3_policy.json';
import labels from '../../corpus/labels.json';
import mainTf from '../../lab/stack/main.tf?raw';
import { RULES, evaluate, confusion, syntaxBaseline, validPlan, driftRecount, perTypeRates, mixRecall, wilson, THRESHOLDS, verdicts } from './policy.js';

const REPO = 'https://github.com/JesunAhmadUshno/terraform-for-ai-infrastructure';
const blob = (p) => `${REPO}/blob/main/${p}`;
const base = (p) => p.split('/').pop();
const f4 = (x) => x.toFixed(4);
const f2 = (x) => x.toFixed(2);

// The 60 corpus files, parsed and raw, imported at build time.
const docs = Object.fromEntries(Object.entries(import.meta.glob('../../corpus/*-*.json', { eager: true, import: 'default' })).map(([k, v]) => [base(k), v]));
const raws = Object.fromEntries(Object.entries(import.meta.glob('../../corpus/*-*.json', { eager: true, query: '?raw', import: 'default' })).map(([k, v]) => [base(k), v]));
const ALL_ON = Object.fromEntries(RULES.map((r) => [r.id, true]));

const TYPES = ['content_edit', 'content_append', 'file_delete', 'file_truncate', 'permission_change', 'unmanaged_addition'];
const TYPE_LABEL = { content_edit: 'Content edit', content_append: 'Append', file_delete: 'Delete', file_truncate: 'Truncate', permission_change: 'Permission change', unmanaged_addition: 'Unmanaged file added' };
const drift = driftRecount(rq2.trials);
const rates = perTypeRates(rq2.trials);
const fileToAddress = Object.fromEntries(rq2.trials.map((t) => [t.file, t.address]));
const FILES = Object.keys(fileToAddress).sort();
const engines = Object.entries(rep.per_engine); // [['terraform', …], ['tofu', …]]
const ENGINE_NAME = { tofu: 'OpenTofu', terraform: 'Terraform' };
const providerVersion = (mainTf.match(/source\s*=\s*"hashicorp\/local"\s*\n\s*version\s*=\s*"([^"]+)"/) || [])[1];
const verdictTone = (v) => (v === 'Supported' ? 'good' : v === 'Partially supported' ? 'warn' : 'bad');

const SECTIONS = [['top', 'Overview', '◎'], ['stack', 'Stack', '▤'], ['plan', 'Plan diff', '≡'], ['rebuild', 'Rebuilds', '↻'], ['drift', 'Drift', '▦'], ['mix', 'Mix what-if', '⚖'], ['policy', 'Policy', '§'], ['sandbox', 'Sandbox', '{}'], ['verdicts', 'Verdicts', '±'], ['limits', 'Limits', '!']];

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.08 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

function MenuBar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  return (
    <div className="menubar" role="banner">
      <span className="apple" aria-hidden="true">◆</span>
      <a className="app" href="#top">tofu-lab</a>
      <a className="m" href={blob('HYPOTHESES.md')}>Hypotheses</a>
      <a className="m" href={blob('METHODS.md')}>Methods</a>
      <a className="m" href={blob('RESULTS.md')}>Results</a>
      <a className="m" href={blob('REPORT.md')}>Report</a>
      <span className="spacer" />
      <span className="status"><i /> Zero spend</span>
      <a href={REPO}>GitHub ↗</a>
      <span className="clock">{now.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>
    </div>
  );
}

function Dock() {
  const [active, setActive] = useState('top');
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-45% 0px -50% 0px' });
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  return (
    <nav className="dock" aria-label="Sections">
      {SECTIONS.map(([id, label, icon]) => (
        <a key={id} href={`#${id}`} className={active === id ? 'on' : ''} aria-current={active === id ? 'true' : undefined} aria-label={label}>
          <span className="ico" aria-hidden="true">{icon}</span><span className="lbl">{label}</span>
        </a>
      ))}
    </nav>
  );
}

function Range({ label, value, min, max, step, onChange, show }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label} <span>{show}</span></label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}

export default function App() {
  useReveal();
  const [picked, setPicked] = useState('violating-28.json');
  return (
    <div className="wrap">
      <MenuBar />
      <div className="glow" aria-hidden="true" />
      <Hero />
      <Stack />
      <PlanDiff />
      <Rebuild />
      <Drift />
      <Mix />
      <Policy onPick={(f) => { setPicked(f); document.getElementById('sandbox')?.scrollIntoView({ behavior: 'smooth' }); }} />
      <Sandbox picked={picked} setPicked={setPicked} />
      <Verdicts />
      <Limits />
      <Dock />
      <footer>
        <p style={{ margin: '0 0 12px' }}>Reproduce the recorded runs (needs OpenTofu, Terraform and conftest installed; no cloud account):</p>
        <p style={{ margin: '0 0 16px' }}><code>python3 -m pytest</code> <code>python3 -m harness.rq1_plan_equivalence</code> <code>python3 -m harness.rq1_reproducibility</code> <code>python3 -m harness.rq2_drift</code> <code>python3 -m harness.generate_corpus</code> <code>python3 -m harness.rq3_policy</code> <code>python3 -m harness.generate_results_md</code></p>
        Code: Apache-2.0 · <a href={REPO} style={{ color: '#e9e4da' }}>Repository</a> · Every number here is read from <code>results/</code>, <code>corpus/</code>, <code>policy/</code> and <code>lab/</code> at build time, or computed in your browser from them. No engine was re-run to build this page.
      </footer>
    </div>
  );
}

function Hero() {
  const tofu = rep.per_engine.tofu, tf = rep.per_engine.terraform;
  const ci = wilson(drift.detected, drift.total);
  return (
    <header className="card hero window" id="top" data-title="tofu-lab — README.md">
      <div className="head">
        <p className="eyebrow">Pre-registered measurement study · zero spend · CPU-local</p>
        <span className="pill info">Hypotheses committed before experiment code</span>
      </div>
      <h1>OpenTofu and Terraform built the same {rq1.addresses_compared}-resource stack <em>identically {Math.min(tofu.runs_matching_run1, tf.runs_matching_run1)} of {tofu.runs_total} times</em>, but a refresh plan caught only {drift.detected} of {drift.total} out-of-band changes.</h1>
      <p className="sub">
        A local lab that measures four properties of infrastructure code for an AI platform stack: do the two engines plan the same thing, does a full rebuild give byte-identical state, does a refresh plan notice files changed behind its back, and does a Rego policy catch insecure plans.
        SPEC.md and HYPOTHESES.md were committed (fee401d) before the harness and results (90bf39e), so every threshold below was fixed before any outcome was seen.
      </p>
      <div className="verdicts" role="list" aria-label="Pre-registered verdicts">
        {Object.entries(summary.verdicts).map(([k, v]) => (
          <span role="listitem" key={k} className={`pill ${verdictTone(v)}`}>{k.split('_')[0]} · {v}</span>
        ))}
      </div>
      <div className="actions">
        <a className="btn primary" href="#policy">Toggle the policy rules</a>
        <a className="btn ghost" href={blob('HYPOTHESES.md')}>Read the pre-registration</a>
        <span className="hint">Drift recall 95% interval {f2(ci[0])} to {f2(ci[1])} straddles the {THRESHOLDS.H3.partial} cut.</span>
      </div>
      <div className="tiles">
        <div className="tile"><div className="num">{rq1.matches}/{rq1.addresses_compared}</div><div className="cap">Plan addresses identical across engines (match rate {f4(rq1.match_rate)})</div></div>
        <div className="tile"><div className="num">{tofu.runs_matching_run1}+{tf.runs_matching_run1}</div><div className="cap">Rebuilds matching run 1, OpenTofu + Terraform, of {tofu.runs_total} each</div></div>
        <div className="tile"><div className="num">{f4(drift.recall)}</div><div className="cap">Drift recall, {drift.detected} of {drift.total} seeded changes (OpenTofu)</div></div>
        <div className="tile"><div className="num">{f2(rq3.precision)} / {f2(rq3.recall)}</div><div className="cap">Policy precision / recall on {rq3.corpus_total} labelled plans</div></div>
      </div>
    </header>
  );
}

function Stack() {
  const services = FILES.filter((f) => fileToAddress[f].includes('service['));
  const others = FILES.filter((f) => !services.includes(f));
  return (
    <section id="stack" className="card window reveal" data-title={`main.tf — ${FILES.length} local_file resources`}>
      <p className="eyebrow">The test object</p>
      <h2>One small stack, chosen so that <em>any</em> difference is the engine’s fault.</h2>
      <p className="sub">
        <a href={blob('lab/stack/main.tf')}>lab/stack/main.tf</a> writes {services.length} service definitions for a local AI platform plus {others.length} manifests, all with the <code>hashicorp/local</code> provider pinned at <b>{providerVersion}</b>.
        Engines in the recorded runs: {rq1.engine_versions.tofu} and {rq1.engine_versions.terraform}.
        There is deliberately no <code>random</code> or <code>null</code> resource (DECISIONS D3): those change state on every apply by design, which would make a reproducibility test measure the resource, not the engine.
      </p>
      <div className="addr" role="list" aria-label="Resource addresses">
        {FILES.map((f) => (
          <div role="listitem" key={f} className="tile addr-item"><span className="mono">{fileToAddress[f]}</span><small>build/{f}</small></div>
        ))}
      </div>
    </section>
  );
}

function PlanDiff() {
  const mism = new Set(rq1.mismatches.map((m) => m.address));
  return (
    <section id="plan" className="card window reveal" data-title="plan-diff.json — OpenTofu vs Terraform">
      <div className="head">
        <div>
          <p className="eyebrow">RQ1 · plan equivalence · H1</p>
          <h2>Same configuration, same empty state: {rq1.matches} of {rq1.addresses_compared} planned addresses agree.</h2>
          <p className="sub">Each engine’s plan is normalised to sorted address, type and actions, then compared. Resource count: OpenTofu {rq1.resource_count_tofu}, Terraform {rq1.resource_count_terraform}. Mismatch list: {rq1.mismatches.length ? rq1.mismatches.length : 'empty'}. The result file stores the comparison, not the raw plans, so this table can be re-checked only by re-running the engines.</p>
        </div>
        <span className={`pill ${verdictTone(summary.verdicts.H1_plan_equivalence)}`}>H1 · {summary.verdicts.H1_plan_equivalence}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Address</th><th>{ENGINE_NAME.tofu}</th><th>{ENGINE_NAME.terraform}</th><th>Result</th></tr></thead>
          <tbody>
            {FILES.map((f) => { const a = fileToAddress[f], bad = mism.has(a); return (
              <tr key={a}><td className="mono">{a}</td><td>planned</td><td>planned</td><td className={bad ? 'no' : 'ok'}>{bad ? 'mismatch' : 'match'}</td></tr>
            ); })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Rebuild() {
  const [eng, setEng] = useState('tofu');
  const [sel, setSel] = useState(null);
  const e = rep.per_engine[eng], r1 = e.runs[0];
  const same = engines.every(([, x]) => x.runs[0].plan_hash === r1.plan_hash && x.runs[0].state_hash === r1.state_hash);
  const maxS = Math.ceil(Math.max(...engines.map(([, x]) => x.max_seconds)));
  const W = 960, H = 170, pad = { l: 96, r: 16, t: 14, b: 30 };
  const sx = (s) => pad.l + (s / maxS) * (W - pad.l - pad.r);
  const rowY = (i) => pad.t + 30 + i * 56;
  const shown = sel ?? r1;
  return (
    <section id="rebuild" className="card window reveal" data-title="rebuild.log — 20 destroy/apply cycles per engine">
      <div className="head">
        <div>
          <p className="eyebrow">RQ1 · rebuild reproducibility · H2 · recorded runs</p>
          <h2>Every rebuild hashed the same, on both engines, <em>to the same digest</em>.</h2>
          <p className="sub">A run matches when both its normalised plan hash and normalised state hash equal run 1. Hover or focus a cell to read that run’s record from <a href={blob('results/rq1_reproducibility.json')}>rq1_reproducibility.json</a>.</p>
        </div>
        <div className="seg" role="group" aria-label="Engine">
          {['tofu', 'terraform'].map((k) => <button key={k} aria-pressed={eng === k} onClick={() => { setEng(k); setSel(null); }}>{ENGINE_NAME[k]}</button>)}
        </div>
      </div>
      <div className="cells" role="list" aria-label={`${ENGINE_NAME[eng]} runs`}>
        {e.runs.map((r) => { const ok = r.plan_hash === r1.plan_hash && r.state_hash === r1.state_hash; return (
          <button key={r.run} role="listitem" className={`cell ${ok ? 'hit' : 'miss'} ${shown.run === r.run ? 'sel' : ''}`} onMouseEnter={() => setSel(r)} onFocus={() => setSel(r)} onClick={() => setSel(r)} aria-label={`Run ${r.run}: ${ok ? 'matches' : 'differs from'} run 1`}>{r.run}</button>
        ); })}
      </div>
      <div className="tip" aria-live="polite">
        {ENGINE_NAME[eng]} run {shown.run}: plan <span className="mono">{shown.plan_hash.slice(0, 8)}</span> · state <span className="mono">{shown.state_hash.slice(0, 8)}</span> · {shown.seconds} s · {e.runs_matching_run1} of {e.runs_total} match run 1
      </div>
      <div className="tiles" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        {engines.map(([k, x]) => (
          <div className="tile" key={k}><div className="num mono-num">{x.runs[0].plan_hash.slice(0, 8)} · {x.runs[0].state_hash.slice(0, 8)}</div><div className="cap">{x.version}: plan · state hash prefix, run 1</div></div>
        ))}
      </div>
      <p className="hint">{same ? 'The two engines produced identical plan and state hashes in the recorded runs.' : 'The two engines produced different hashes.'} Expected by design here: the stack contains only content-hashed files (see the stack window).</p>
      <h3 style={{ marginTop: 20 }}>Seconds per destroy/apply cycle</h3>
      <div className="chart-scroll" style={{ overflowX: 'auto' }}><svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Dot plot of seconds per rebuild cycle for each engine, with median and range">
        {Array.from({ length: Math.floor(maxS / 2) + 1 }, (_, i) => i * 2).map((t) => <g key={t}><line className="axis" x1={sx(t)} x2={sx(t)} y1={pad.t} y2={H - pad.b} /><text x={sx(t)} y={H - 10} textAnchor="middle">{t}s</text></g>)}
        {engines.map(([k, x], i) => (
          <g key={k}>
            <text x={0} y={rowY(i) + 4} style={{ fill: 'var(--text)', fontSize: 13 }}>{ENGINE_NAME[k]}</text>
            <line x1={sx(x.min_seconds)} x2={sx(x.max_seconds)} y1={rowY(i)} y2={rowY(i)} stroke="var(--muted)" strokeWidth="1.5" />
            {x.runs.map((r) => <circle key={r.run} cx={sx(r.seconds)} cy={rowY(i)} r={eng === k && shown.run === r.run ? 7 : 5} fill="var(--primary)" fillOpacity={eng === k && shown.run === r.run ? 1 : 0.35} onMouseEnter={() => { setEng(k); setSel(r); }} />)}
            <line x1={sx(x.median_seconds)} x2={sx(x.median_seconds)} y1={rowY(i) - 14} y2={rowY(i) + 14} stroke="var(--text)" strokeWidth="2.5" />
            <text x={sx(x.median_seconds)} y={rowY(i) - 18} textAnchor="middle">median {x.median_seconds}s</text>
          </g>
        ))}
      </svg></div>
      <p className="hint">Timings come from a shared build VM under load from other work. They show the runs completed; they are <b>not a speed comparison</b> between engines, and none is claimed.</p>
    </section>
  );
}

function Drift() {
  const [filter, setFilter] = useState('all');
  const [sel, setSel] = useState(rq2.trials.find((t) => t.type === 'permission_change'));
  const cell = Object.fromEntries(rq2.trials.map((t) => [`${t.file}|${t.type}`, t]));
  const ci = wilson(drift.detected, drift.total), ciM = wilson(drift.managedDetected, drift.managed);
  const filterId = useId();
  return (
    <section id="drift" className="card window reveal" data-title={`drift-matrix — recorded run, ${rq2.engine_version}`}>
      <div className="head">
        <div>
          <p className="eyebrow">RQ2 · drift detection · H3 · recorded replay</p>
          <h2>Detection is decided by mutation type, <em>not by chance</em>.</h2>
          <p className="sub">
            Each trial applied the stack fresh, changed one file outside the engine, then ran a refresh plan. The local provider reads back only whether a file exists and its content checksum,
            so content edits, appends, deletes and truncates are always caught and permission changes and extra files never are. The per-type rates below are the real finding; the headline recall depends on how many trials of each type were seeded.
          </p>
        </div>
        <span className={`pill ${verdictTone(summary.verdicts.H3_drift_recall)}`}>H3 · {summary.verdicts.H3_drift_recall}</span>
      </div>
      <div className="bars">
        {TYPES.map((k) => (
          <div className="bar-row" key={k}>
            <div className="lab"><span>{TYPE_LABEL[k]}</span><b>{rates[k].det} of {rates[k].n} detected</b></div>
            <div className="track"><div className="fill" style={{ width: `${rates[k].rate * 100}%`, background: rates[k].rate ? 'var(--good)' : 'var(--bad)' }} /></div>
          </div>
        ))}
      </div>
      <h3 style={{ marginTop: 24 }}>Overall recall against the pre-registered cuts</h3>
      <div className="bars" style={{ marginTop: 12 }}>
        {[
          ['All mutations (headline, H3)', drift.detected, drift.total, ci, 'var(--warn)'],
          ['Managed-file mutations only', drift.managedDetected, drift.managed, ciM, 'var(--primary)'],
          ['Naive baseline: does the file still exist?', drift.naive, drift.total, wilson(drift.naive, drift.total), 'var(--muted)'],
        ].map(([k, a, n, c, col]) => (
          <div className="bar-row" key={k}>
            <div className="lab"><span>{k}</span><b>{a}/{n} = {f4(a / n)}</b></div>
            <div className="track">
              <div className="fill" style={{ width: `${(a / n) * 100}%`, background: col }} />
              <div className="ci" style={{ left: `${c[0] * 100}%`, width: `${(c[1] - c[0]) * 100}%` }} />
              <div className="alpha" style={{ left: `${THRESHOLDS.H3.partial * 100}%` }} />
              <div className="alpha" style={{ left: `${THRESHOLDS.H3.supported * 100}%` }} />
            </div>
            <div className="hint">Wilson 95% interval {f2(c[0])} to {f2(c[1])}</div>
          </div>
        ))}
      </div>
      <p className="hint">Dashed lines: {THRESHOLDS.H3.partial} (partially supported) and {THRESHOLDS.H3.supported} (supported), from HYPOTHESES.md. Shaded band: the 95% interval.</p>

      <div className="head" style={{ marginTop: 24, marginBottom: 8 }}>
        <h3>All {drift.total} trials: {FILES.length} files × {TYPES.length} mutation types</h3>
        <div className="field" style={{ minWidth: 200 }}>
          <label htmlFor={filterId}>Mutation type</label>
          <select id={filterId} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All types</option>
            {TYPES.map((k) => <option key={k} value={k}>{TYPE_LABEL[k]}</option>)}
          </select>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="matrix">
          <thead><tr><th>File</th>{TYPES.map((k) => <th key={k} className={filter !== 'all' && filter !== k ? 'dim' : ''}>{TYPE_LABEL[k]}</th>)}</tr></thead>
          <tbody>
            {FILES.map((f) => (
              <tr key={f}><td className="mono">{f}</td>
                {TYPES.map((k) => { const t = cell[`${f}|${k}`]; const dim = filter !== 'all' && filter !== k; return (
                  <td key={k} className={dim ? 'dim' : ''}>
                    {t ? <button className={`mcell ${t.detected ? 'hit' : 'miss'} ${sel === t ? 'sel' : ''}`} onClick={() => setSel(t)} aria-label={`Trial ${t.trial}: ${TYPE_LABEL[k]} on ${f}, ${t.detected ? 'detected' : 'missed'}`}>{t.detected ? '✓' : '✕'}</button> : <span className="mcell none" title="not sampled">·</span>}
                  </td>
                ); })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="legend"><span><i style={{ background: 'var(--good)' }} />detected</span><span><i style={{ background: 'var(--bad)' }} />missed</span><span><i style={{ background: 'var(--grid)' }} />not sampled ({drift.total} of {FILES.length * TYPES.length} combinations, seeded shuffle)</span></div>
      {sel && (
        <pre className="record" aria-live="polite">{JSON.stringify({ trial: sel.trial, file: sel.file, type: sel.type, address: sel.address, plan_exit_code: sel.plan_exit_code, detected: sel.detected, changed_addresses: sel.changed_addresses, naive_exists_check_detected: sel.naive_exists_check_detected }, null, 2)}</pre>
      )}
      <p className="hint">Note: for an unmanaged-file trial the harness still records a resource address, but no managed resource was touched, so that address carries no meaning.</p>
    </section>
  );
}

function Mix() {
  const recorded = Object.fromEntries(TYPES.map((k) => [k, rates[k].n]));
  const [w, setW] = useState(recorded);
  const r = mixRecall(rates, w);
  const contentOnly = mixRecall(rates, Object.fromEntries(TYPES.map((k) => [k, rates[k].rate ? 1 : 0])));
  const silentOnly = mixRecall(rates, Object.fromEntries(TYPES.map((k) => [k, rates[k].rate ? 0 : 1])));
  return (
    <section id="mix" className="card window reveal" data-title="mix-whatif — reweighting recorded outcomes">
      <p className="eyebrow">What-if · computed from the recorded per-type rates, not a new run</p>
      <h2>Change the mix of mutations and the headline recall goes <em>anywhere from {f2(silentOnly)} to {f2(contentOnly)}</em>.</h2>
      <p className="sub">Each slider sets how many trials of that type a study would seed. Recall is the weighted mean of the detection rates recorded in <a href={blob('results/rq2_drift.json')}>rq2_drift.json</a>. Engines cannot run in a browser, so this only re-weights what was measured.</p>
      <div className="grid2" style={{ marginTop: 16 }}>
        <div className="controls" style={{ gridTemplateColumns: '1fr', margin: 0 }}>
          {TYPES.map((k) => <Range key={k} label={`${TYPE_LABEL[k]} trials (detect rate ${f2(rates[k].rate)})`} value={w[k]} min={0} max={30} step={1} onChange={(v) => setW({ ...w, [k]: v })} show={w[k]} />)}
        </div>
        <div>
          <div className="tile"><div className="num">{f4(r)}</div><div className="cap">Recall under this mix · recorded mix gives {f4(drift.recall)}</div></div>
          <p className="hint" style={{ marginTop: 12 }}>
            Verdict this would earn under H3: <span className={`pill ${r >= THRESHOLDS.H3.supported ? 'good' : r >= THRESHOLDS.H3.partial ? 'warn' : 'bad'}`}>{r >= THRESHOLDS.H3.supported ? 'Supported' : r >= THRESHOLDS.H3.partial ? 'Partially supported' : 'Refuted'}</span>
          </p>
          <div className="actions"><button className="btn ghost" onClick={() => setW(recorded)}>Reset to recorded mix</button></div>
        </div>
      </div>
    </section>
  );
}

function Policy({ onPick }) {
  const [on, setOn] = useState(ALL_ON);
  const c = useMemo(() => confusion(labels, docs, on), [on]);
  const allOn = RULES.every((r) => on[r.id]);
  const agrees = allOn && c.tp === rq3.true_positives && c.fp === rq3.false_positives && c.tn === rq3.true_negatives && c.fn === rq3.false_negatives;
  const syn = syntaxBaseline(labels, docs);
  const byType = {};
  for (const row of c.rows) if (row.label === 'violating') { const o = (byType[row.violation_type] ||= { n: 0, hit: 0 }); o.n++; if (row.pred) o.hit++; }
  const ciP = c.tp + c.fp ? wilson(c.tp, c.tp + c.fp) : null, ciR = wilson(c.tp, c.tp + c.fn);
  return (
    <section id="policy" className="card window reveal" data-title="policy.rego — running in your browser">
      <div className="head">
        <div>
          <p className="eyebrow">RQ3 · policy accuracy · H4 · live</p>
          <h2>Five Rego rules, ported to JavaScript and run over all {labels.length} plans <em>as you toggle them</em>.</h2>
          <p className="sub">
            A line-for-line port of <a href={blob('policy/policy.rego')}>policy/policy.rego</a>, including Rego’s quiet failure: if a file’s content is not JSON, the four content rules never fire.
            With every rule on, the port reproduces the recorded conftest {rq3.tool_version.replace(/^Conftest:\s*/, '')} run file by file; the build fails if it ever does not.
          </p>
        </div>
        <span className={`pill ${agrees ? 'good' : 'info'}`}>{agrees ? 'Matches recorded conftest run' : 'Custom rule set'}</span>
      </div>
      <fieldset className="rules">
        <legend className="hint">Deny rules</legend>
        {RULES.map((r) => (
          <label key={r.id} className="rule"><input type="checkbox" checked={on[r.id]} onChange={(e) => setOn({ ...on, [r.id]: e.target.checked })} /> {r.label}</label>
        ))}
      </fieldset>
      <div className="grid2" style={{ marginTop: 16 }}>
        <div>
          <h3>Confusion matrix</h3>
          <div className="cm" role="table" aria-label="Confusion matrix">
            <div role="row" className="cm-row"><span role="columnheader" /><span role="columnheader">Flagged</span><span role="columnheader">Passed</span></div>
            <div role="row" className="cm-row"><span role="rowheader">Violating</span><span role="cell" className="good">TP {c.tp}</span><span role="cell" className="bad">FN {c.fn}</span></div>
            <div role="row" className="cm-row"><span role="rowheader">Compliant</span><span role="cell" className="bad">FP {c.fp}</span><span role="cell" className="good">TN {c.tn}</span></div>
          </div>
          <div className="tiles" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 12 }}>
            <div className="tile"><div className="num">{f4(c.precision)}</div><div className="cap">Precision{ciP ? `, 95% CI ${f2(ciP[0])} to ${f2(ciP[1])}` : ''}</div></div>
            <div className="tile"><div className="num">{f4(c.recall)}</div><div className="cap">Recall, 95% CI {f2(ciR[0])} to {f2(ciR[1])}</div></div>
          </div>
          <p className="hint">Baseline from HYPOTHESES.md, computed here: syntax validation alone flags {syn.tp + syn.fp} files, recall {syn.tp}/{syn.tp + syn.fn}, because every corpus file is valid plan JSON.</p>
        </div>
        <div>
          <h3>Recall by violation type</h3>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Type</th><th>Caught</th></tr></thead>
              <tbody>{Object.entries(byType).map(([k, o]) => <tr key={k}><td className="mono">{k}</td><td className={o.hit === o.n ? 'ok' : 'no'}>{o.hit} of {o.n}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </div>
      <h3 style={{ marginTop: 20 }}>All {labels.length} corpus files · click one to open it in the sandbox</h3>
      <div className="chips" role="list" aria-label="Corpus files by outcome">
        {c.rows.map((row) => (
          <button role="listitem" key={row.file} className={`chip ${row.outcome}`} onClick={() => onPick(row.file)} title={`${row.file}: ${row.outcome.replace('_', ' ')}`} aria-label={`${row.file}: ${row.outcome.replace('_', ' ')}`}>{row.file.replace('.json', '').replace('compliant-', 'c').replace('violating-', 'v')}</button>
        ))}
      </div>
      <div className="legend"><span><i style={{ background: 'var(--good)' }} />true positive / negative</span><span><i style={{ background: 'var(--bad)' }} />false negative</span><span><i style={{ background: 'var(--warn)' }} />false positive</span></div>
      <p className="hint">The two pre-registered misses, <b>violating-28</b> (secret in plain-text content) and <b>violating-29</b> (secret under the key <code>apiKey</code>), were named in HYPOTHESES.md before the corpus was generated. The corpus was built from the same fields the rules check, so high precision here is partly by construction.</p>
    </section>
  );
}

// A hand-written example, not part of the corpus: shows the missing-field blind spot.
const BLIND_SPOT = JSON.stringify({ format_version: '1.2', resource_changes: [{ address: 'local_file.service["example"]', type: 'local_file', change: { actions: ['create'], after: { content: JSON.stringify({ bind: '127.0.0.1', exposure: 'private', api_key: '', name: 'example' }), file_permission: '0600', filename: 'build/example.json' } } }] }, null, 2);

function Sandbox({ picked, setPicked }) {
  const [text, setText] = useState(raws[picked]);
  useEffect(() => { setText(picked === '__blind' ? BLIND_SPOT : raws[picked]); }, [picked]);
  const selId = useId(), taId = useId();
  let doc = null, err = null;
  try { doc = JSON.parse(text); } catch (e) { err = e.message; }
  const denies = doc ? evaluate(doc, ALL_ON) : [];
  const unparsed = doc && Array.isArray(doc.resource_changes) ? doc.resource_changes.filter((rc) => { try { const v = JSON.parse(rc?.change?.after?.content); return !(v && typeof v === 'object'); } catch { return true; } }).map((rc) => rc.address) : [];
  const label = labels.find((l) => l.file === picked);
  return (
    <section id="sandbox" className="card window reveal" data-title="plan.json — sandbox">
      <p className="eyebrow">Plan-JSON sandbox · live</p>
      <h2>Edit a plan and watch which rules <em>fire</em>.</h2>
      <p className="sub">Start from any corpus file, change a field (try <code>"exposure": "public"</code> inside the content, or <code>"file_permission": "0777"</code>), and the ported rules re-run on every keystroke.</p>
      <div className="controls" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <div className="field">
          <label htmlFor={selId}>Start from</label>
          <select id={selId} value={picked} onChange={(e) => setPicked(e.target.value)}>
            <option value="__blind">Blind spot example: encryption_enabled missing (hand-written, not in corpus)</option>
            {labels.map((l) => <option key={l.file} value={l.file}>{l.file} · {l.label}{l.violation_type ? ` · ${l.violation_type}` : ''}</option>)}
          </select>
        </div>
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor={taId}>Plan JSON</label>
          <textarea id={taId} value={text} onChange={(e) => setText(e.target.value)} spellCheck="false" rows={16} />
        </div>
        <div>
          <h3>Policy output</h3>
          <div className="out" aria-live="polite">
            {err ? <p className="no">Parse error: {err}</p>
              : !validPlan(doc) ? <p className="no">Not plan JSON: expected a resource_changes array.</p>
              : denies.length ? <ul>{denies.map((d) => <li key={d} className="no">deny: {d}</li>)}</ul>
              : label?.label === 'violating' ? <p className="no">no deny, although this file is labelled violating: a missed violation</p> : <p className="ok">no deny</p>}
          </div>
          {label && <p className="hint">Corpus label: <b>{label.label}</b>{label.violation_type ? ` (${label.violation_type})` : ''}.</p>}
          {unparsed.length > 0 && <p className="hint"><span className="pill warn">not parsed</span> Content of {unparsed.join(', ')} is not a JSON object, so json.unmarshal is undefined and the public, bind, secret and encryption rules cannot see it. This is how violating-28 slips through.</p>}
          {picked === '__blind' && <p className="hint"><span className="pill warn">blind spot</span> The encryption rule fires only on an explicit <code>false</code>. A plan that omits the field passes silently. The corpus has no such case, so the recorded recall does not cover it.</p>}
        </div>
      </div>
    </section>
  );
}

function Verdicts() {
  const rows = [
    { k: 'H3 drift recall', a: drift.detected, n: drift.total, cut: [THRESHOLDS.H3.partial, THRESHOLDS.H3.supported] },
    { k: 'Drift recall, managed only', a: drift.managedDetected, n: drift.managed, cut: [THRESHOLDS.H3.partial, THRESHOLDS.H3.supported] },
    { k: 'H4 precision', a: rq3.true_positives, n: rq3.true_positives + rq3.false_positives, cut: [THRESHOLDS.H4.partial, THRESHOLDS.H4.supported] },
    { k: 'H4 recall', a: rq3.true_positives, n: rq3.true_positives + rq3.false_negatives, cut: [THRESHOLDS.H4.partial, THRESHOLDS.H4.supported] },
  ];
  const recomputed = verdicts({ rq1, rep, rq2, rq3 });
  const [k, setK] = useState(drift.detected);
  const [n, setN] = useState(drift.total);
  const kk = Math.min(k, n), cc = wilson(kk, n), rr = kk / n;
  const v3 = rr >= THRESHOLDS.H3.supported ? 'Supported' : rr >= THRESHOLDS.H3.partial ? 'Partially supported' : 'Refuted';
  const oneLess = (drift.detected - 1) / drift.total;
  const W = 960, rowH = 46, H = rows.length * rowH + 34, l = 250, r = 16, lo = 0.5, hi = 1;
  const x = (v) => l + ((Math.max(lo, v) - lo) / (hi - lo)) * (W - l - r);
  return (
    <section id="verdicts" className="card window reveal" data-title="verdicts.py — thresholds and 95% intervals">
      <p className="eyebrow">Uncertainty · not reported in the original results</p>
      <h2>H3 clears its cut by <em>a single detection</em>.</h2>
      <p className="sub">
        Recall {drift.detected}/{drift.total} = {f4(drift.recall)} sits above the pre-registered {THRESHOLDS.H3.partial}. One fewer detection gives {drift.detected - 1}/{drift.total} = {f4(oneLess)}, which would be Refuted.
        Wilson 95% intervals, computed here from the counts, show how much of each verdict is margin and how much is sample size.
      </p>
      <div className="chart-scroll" style={{ overflowX: 'auto', marginTop: 12 }}><svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Proportions with Wilson 95% intervals against pre-registered thresholds">
        {[0.5, 0.6, 0.7, 0.8, 0.9, 1].map((t) => <g key={t}><line className="axis" x1={x(t)} x2={x(t)} y1={6} y2={H - 24} /><text x={x(t)} y={H - 6} textAnchor="middle">{t.toFixed(1)}</text></g>)}
        {rows.map((row, i) => { const c = wilson(row.a, row.n), y = i * rowH + 28; return (
          <g key={row.k}>
            <text x={0} y={y + 4} style={{ fill: 'var(--text)', fontSize: 13 }}>{row.k} ({row.a}/{row.n})</text>
            {row.cut.map((t, j) => <line key={t} x1={x(t)} x2={x(t)} y1={y - 14} y2={y + 14} stroke={j ? 'var(--good)' : 'var(--warn)'} strokeWidth="2" strokeDasharray="4 3" />)}
            <line x1={x(c[0])} x2={x(c[1])} y1={y} y2={y} stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
            <circle cx={x(row.a / row.n)} cy={y} r="6" fill="var(--primary)" />
            <text x={x(row.a / row.n)} y={y - 11} textAnchor={row.a / row.n > 0.95 ? 'end' : 'middle'} style={{ fill: 'var(--text)' }}>{f2(row.a / row.n)} [{f2(c[0])}, {f2(c[1])}]</text>
          </g>
        ); })}
      </svg></div>
      <div className="legend"><span><i style={{ background: 'var(--warn)' }} />partially-supported cut</span><span><i style={{ background: 'var(--good)' }} />supported cut</span><span><i style={{ background: 'var(--primary)' }} />estimate and 95% interval (axis starts at 0.5)</span></div>

      <div className="grid2" style={{ marginTop: 20 }}>
        <div>
          <h3>Interval calculator for H3</h3>
          <div className="controls" style={{ gridTemplateColumns: '1fr', marginTop: 8 }}>
            <Range label="Detected" value={kk} min={0} max={n} step={1} onChange={setK} show={kk} />
            <Range label="Trials" value={n} min={10} max={200} step={1} onChange={setN} show={n} />
          </div>
          <p className="hint">Recall {f4(rr)}, 95% interval {f4(cc[0])} to {f4(cc[1])} · <span className={`pill ${verdictTone(v3)}`}>{v3}</span></p>
          <p className="hint">Interval entirely above {THRESHOLDS.H3.partial}: {cc[0] >= THRESHOLDS.H3.partial ? 'yes' : 'no'}.</p>
        </div>
        <div>
          <h3>Verdicts recomputed from the result files</h3>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Hypothesis</th><th>Recomputed</th><th>summary.json</th></tr></thead>
              <tbody>{Object.entries(summary.verdicts).map(([h, v]) => <tr key={h}><td className="mono">{h.split('_')[0]}</td><td>{recomputed[h]}</td><td className={recomputed[h] === v ? 'ok' : 'no'}>{v}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="hint">Same branches as <a href={blob('harness/generate_results_md.py')}>generate_results_md.py</a>, thresholds from HYPOTHESES.md.</p>
        </div>
      </div>
    </section>
  );
}

function Limits() {
  const items = [
    ['One provider', 'All equivalence, reproducibility and drift evidence is bounded to hashicorp/local. A provider that reads back richer state would change the drift numbers. This is the largest limit.'],
    ['Drift on one engine', 'RQ2 ran on OpenTofu only. Running the same mutation set on Terraform is the first roadmap item.'],
    ['Reproducible by design', 'The stack has no computed or random attributes, so 20 of 20 matching rebuilds is expected. It says little about providers with computed IDs.'],
    ['Small, self-built corpus', `${rq3.corpus_total} files, one policy tool, generated from the same fields the rules check. No external plan corpus (for example TerraDS or IaC-Eval samples) and no second tool yet.`],
    ['No raw plans committed', 'RQ1 stores counts and hashes, not the plan and state JSON, so the equivalence cannot be re-checked without re-running the engines.'],
    ['No lock file committed', 'The two engines record different registry hosts, so the provider version is pinned in main.tf instead (DECISIONS D5).'],
    ['Local and CPU only', 'Nothing here shows cloud IAM, networking, quota or GPU behaviour.'],
  ];
  return (
    <section id="limits" className="card window reveal" data-title="LIMITS.md — threats and roadmap">
      <p className="eyebrow">Limitations and threats to validity</p>
      <h2>What this lab does <em>not</em> show.</h2>
      <div className="grid2" style={{ marginTop: 16 }}>
        {items.map(([t, d]) => <div className="tile" key={t}><h3>{t}</h3><p className="hint" style={{ margin: '6px 0 0', fontSize: 13 }}>{d}</p></div>)}
      </div>
      <h3 style={{ marginTop: 24 }}>Roadmap, in evidence order</h3>
      <ol className="steps" style={{ marginTop: 12 }}>
        {[`Cross-engine drift: rerun the ${drift.total}-trial set on Terraform.`, 'A richer stack whose provider reads back more state, then rerun RQ2.', 'Grow the policy corpus to at least 200 files and add a second policy tool.'].map((s, i) => <li key={s}><span className="n">{i + 1}</span><div>{s}</div></li>)}
      </ol>
      <div className="docs" style={{ marginTop: 20 }}>
        {[['HYPOTHESES.md', 'Hypotheses', 'Pre-registered thresholds'], ['METHODS.md', 'Methods', 'Normalisation and hashing'], ['RESULTS.md', 'Results', 'Generated, never hand-edited'], ['DECISIONS.md', 'Decisions', 'Why the stack looks like this'], ['REPORT.md', 'Report', 'Results, threats, review and next experiments']].map(([p, t, d]) => <a key={p} href={blob(p)}><b>{t}</b><small>{d}</small></a>)}
      </div>
    </section>
  );
}
