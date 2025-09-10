import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Legend
} from 'recharts';
import './index.css';

/** Safe formatters so we never crash on undefined/null */
const fmtInt = (v) =>
  (v === undefined || v === null || Number.isNaN(Number(v)))
    ? '–'
    : Number(v).toLocaleString();

const fmtPct = (v, digits = 1) =>
  (v === undefined || v === null || !isFinite(v))
    ? '–'
    : `${(Number(v) * 100).toFixed(digits)}%`;

const Card = ({ title, right, children }) => (
  <div className="card" style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 16, marginBottom: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
      <h3 style={{ margin: 0, fontSize: 18, color: '#111' }}>{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

export default function App() {
  const [days, setDays] = useState(30);

  const [funnel, setFunnel] = useState(null);
  const [traffic, setTraffic] = useState([]);
  const [experiment, setExperiment] = useState(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    Promise.all([
      api.getFunnel(days),
      api.getTraffic(days),
      api.getAB(days),
    ])
      .then(([f, t, e]) => {
        if (!alive) return;
        setFunnel(f || null);
        setTraffic(Array.isArray(t) ? t : []);
        setExperiment(e || null);
      })
      .catch((e) => alive && setErr(e?.message || String(e)))
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [days]);

  const funnelTotals = funnel?.totals ?? { views: 0, adds: 0, purchases: 0 };
  const funnelRates = funnel?.rates ?? { view_to_add: null, add_to_purchase: null };

  const trafficSorted = useMemo(() => {
    // Sort by purchases desc, then adds desc
    return [...traffic].sort((a, b) =>
      (b?.purchases ?? 0) - (a?.purchases ?? 0) ||
      (b?.adds ?? 0) - (a?.adds ?? 0)
    );
  }, [traffic]);

  const abView = useMemo(() => {
    if (!experiment?.variant) return null;
    const A = experiment.variant.A ?? { n: 0, buyers: 0, cr: 0 };
    const B = experiment.variant.B ?? { n: 0, buyers: 0, cr: 0 };
    const liftAbs = experiment.lift_abs ?? 0;
    const z = experiment.z_score ?? null;
    const sig = (typeof z === 'number') ? Math.abs(z) >= 1.96 : false; // ~95% threshold
    return { A, B, liftAbs, z, sig };
  }, [experiment]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16, color: '#111' }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24, color: '#111' }}>CohortIQ</h1>
        <small style={{ color: '#555' }}>
          {loading ? 'Loading…' : 'Live'} {err ? ` • Error: ${err}` : ''}
        </small>
      </header>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <label htmlFor="days" style={{ color: '#111' }}>Window:</label>
        <select
          id="days"
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #ddd', color: '#111', background: '#fff' }}
        >
          {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div className="kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 16 }}>
        <div className="kpi" style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
          <div className="label" style={{ color: '#666' }}>Views</div>
          <div className="value" style={{ fontSize: 20, fontWeight: 600, color: '#111' }}>{fmtInt(funnelTotals.views)}</div>
        </div>
        <div className="kpi" style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
          <div className="label" style={{ color: '#666' }}>Adds</div>
          <div className="value" style={{ fontSize: 20, fontWeight: 600, color: '#111' }}>{fmtInt(funnelTotals.adds)}</div>
        </div>
        <div className="kpi" style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
          <div className="label" style={{ color: '#666' }}>Purchases</div>
          <div className="value" style={{ fontSize: 20, fontWeight: 600, color: '#111' }}>{fmtInt(funnelTotals.purchases)}</div>
        </div>
        <div className="kpi" style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
          <div className="label" style={{ color: '#666' }}>Conversion</div>
          <div className="value" style={{ fontSize: 14, color: '#111' }}>
            View→Add: <b>{fmtPct(funnelRates.view_to_add)}</b> • Add→Purchase: <b>{fmtPct(funnelRates.add_to_purchase)}</b>
          </div>
        </div>
      </div>

      {/* Sessions funnel over time */}
      <Card title="Sessions funnel (daily)">
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={funnel?.daily ?? []} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: '#333' }} />
              <YAxis tick={{ fill: '#333' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="views" stroke="#3366cc" dot={false} />
              <Line type="monotone" dataKey="adds" stroke="#22aa99" dot={false} />
              <Line type="monotone" dataKey="purchases" stroke="#dd4477" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Traffic source performance */}
      <Card title="Traffic source performance">
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={trafficSorted} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="traffic_source" tick={{ fill: '#333' }} />
              <YAxis tick={{ fill: '#333' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="views" fill="#3366cc" />
              <Bar dataKey="adds" fill="#22aa99" />
              <Bar dataKey="purchases" fill="#dd4477" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ marginTop: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee', color: '#111' }}>
                <th style={{ padding: 8 }}>Source</th>
                <th style={{ padding: 8 }}>Views</th>
                <th style={{ padding: 8 }}>Adds</th>
                <th style={{ padding: 8 }}>Purchases</th>
                <th style={{ padding: 8 }}>View→Add</th>
                <th style={{ padding: 8 }}>Add→Purchase</th>
              </tr>
            </thead>
            <tbody>
              {trafficSorted.map((r) => (
                <tr key={r.traffic_source} style={{ borderBottom: '1px solid #f3f3f3' }}>
                  <td style={{ padding: 8, color: '#111' }}>{r.traffic_source}</td>
                  <td style={{ padding: 8, color: '#111' }}>{fmtInt(r.views)}</td>
                  <td style={{ padding: 8, color: '#111' }}>{fmtInt(r.adds)}</td>
                  <td style={{ padding: 8, color: '#111' }}>{fmtInt(r.purchases)}</td>
                  <td style={{ padding: 8, color: '#111' }}>{fmtPct(r.view_to_add)}</td>
                  <td style={{ padding: 8, color: '#111' }}>{fmtPct(r.add_to_purchase)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* A/B experiment */}
      <Card
        title="Experiment: checkout_button (A/B)"
        right={<span style={{ color: '#666' }}>{experiment ? `${experiment.days}d window` : ''}</span>}
      >
        {!abView ? (
          <div style={{ color: '#666' }}>No experiment data.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginBottom: 8 }}>
              <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
                <div style={{ color: '#666' }}>Variant A</div>
                <div style={{ fontSize: 14, color: '#111' }}>
                  Users: <b>{fmtInt(abView.A.n)}</b> • Buyers: <b>{fmtInt(abView.A.buyers)}</b> • CR: <b>{fmtPct(abView.A.cr, 2)}</b>
                </div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
                <div style={{ color: '#666' }}>Variant B</div>
                <div style={{ fontSize: 14, color: '#111' }}>
                  Users: <b>{fmtInt(abView.B.n)}</b> • Buyers: <b>{fmtInt(abView.B.buyers)}</b> • CR: <b>{fmtPct(abView.B.cr, 2)}</b>
                </div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
                <div style={{ color: '#666' }}>Result</div>
                <div style={{ fontSize: 14, color: '#111' }}>
                  Lift (B−A): <b>{fmtPct(abView.liftAbs, 2)}</b>
                  {abView.z !== null && (
                    <> • z: <b>{abView.z.toFixed(2)}</b> {abView.sig ? '✅ significant' : '⚠️ not significant'}</>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      <footer style={{ marginTop: 24, color: '#666' }}>
        <small>Backend: FastAPI • Frontend: Vite + React • Charts: Recharts</small>
      </footer>
    </div>
  );
}
