import { useEffect, useMemo, useState } from 'react';
import { api, getApiBase, setApiBase } from './api';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Legend, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import './index.css';

function Card({ title, right, children }) {
  return (
    <div className="card" style={{ background: '#0d1117', color: '#e6edf3', borderColor: '#30363d' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div style={{ fontWeight: 600 }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div className="kpi" style={{ background:'#161b22', borderColor:'#30363d' }}>
      <div className="label" style={{ color:'#8b949e' }}>{label}</div>
      <div className="value" style={{ color:'#e6edf3' }}>{value}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 style={{ color:'#e6edf3', borderBottom:'1px solid #30363d', paddingBottom:6 }}>{children}</h2>;
}

export default function App() {
  const [days, setDays] = useState(30);
  const [weeks, setWeeks] = useState(5);

  // runtime API control (useful for GH Pages + ngrok)
  const [apiBase, setApiBaseState] = useState(getApiBase());
  function applyApiBase() {
    const input = prompt('Set API base (e.g. https://YOUR-NGROK.ngrok-free.app/api):', apiBase || '');
    if (input) {
      setApiBase(input);
      setApiBaseState(getApiBase());
      // trigger reload of data:
      loadAll(days);
      loadRetention(weeks);
    }
  }

  // data
  const [funnel, setFunnel] = useState(null);
  const [ts, setTs] = useState([]);
  const [exp, setExp] = useState(null);
  const [rev, setRev] = useState(null);
  const [aov, setAov] = useState([]);
  const [tops, setTops] = useState([]);
  const [ret, setRet] = useState(null);
  const [cats, setCats] = useState([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function loadAll(d) {
    try {
      setLoading(true);
      const [f, t, e, r, a, tp, c] = await Promise.all([
        api.funnel(d),
        api.trafficSource(d),
        api.experimentCheckout(d).catch(() => null),   // optional
        api.revenue(d),
        api.aovBySource(d).catch(() => []),           // optional
        api.topProducts(d, 10).catch(() => []),       // optional
        api.category(d).catch(() => []),              // optional
      ]);
      setFunnel(f || null);
      setTs(t || []);
      setExp(e);
      setRev(r || null);
      setAov(a || []);
      setTops(tp || []);
      setCats(c || []);
      setErr(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRetention(w) {
    try {
      const r = await api.retention(w);
      setRet(r);
    } catch (e) {
      console.warn('retention fetch failed:', e);
    }
  }

  useEffect(() => { loadAll(days); }, [days]);
  useEffect(() => { loadRetention(weeks); }, [weeks]);

  const revenueTotals = useMemo(() => {
    if (!rev) return { orders: 0, revenue: 0, aov: null };
    return {
      orders: Number(rev?.totals?.orders || 0),
      revenue: Number(rev?.totals?.revenue || 0),
      aov: rev?.totals?.aov ?? null,
    };
  }, [rev]);

  return (
    <div className="container" style={{ background:'#0b0f14', minHeight:'100vh' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
        <h1 style={{ color:'#e6edf3', margin:0 }}>CohortIQ</h1>
        <button
          onClick={applyApiBase}
          style={{ marginLeft:'auto', background:'#161b22', border:'1px solid #30363d', color:'#e6edf3', padding:'6px 10px', borderRadius:6 }}
          title="Change API base at runtime"
        >
          API: {apiBase}
        </button>
      </div>

      <SectionTitle>Acquisition & Conversion</SectionTitle>

      {err && <div className="card" style={{ borderColor:'#b4232a', color:'#ffd7db', background:'#2a1214' }}>Error: {err}</div>}
      {loading && <div className="card" style={{ color:'#8b949e', background:'#0d1117', borderColor:'#30363d' }}>Loading…</div>}

      {/* Revenue trend & KPIs */}
      {rev && (
        <Card
          title={`Revenue & Orders (last ${days} days)`}
          right={
            <select value={days} onChange={e => setDays(+e.target.value)} style={{ background:'#161b22', color:'#e6edf3', border:'1px solid #30363d' }}>
              {[7,14,30,60,90].map(d => <option key={d} value={d}>{d}d</option>)}
            </select>
          }
        >
          <div className="kpis" style={{ marginBottom: 10 }}>
            <KPI label="Orders" value={Number(revenueTotals.orders).toLocaleString()} />
            <KPI label="Revenue" value={`$${Number(revenueTotals.revenue).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
            <KPI label="AOV" value={revenueTotals.aov == null ? '—' : `$${Number(revenueTotals.aov).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={(rev.daily || []).map(d => ({ ...d, revenue: Number(d.revenue || 0), orders: Number(d.orders || 0) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="orders" fill="#4cc9f0" stroke="#4cc9f0" name="Orders" />
                <Area type="monotone" dataKey="revenue" fill="#43d9a3" stroke="#43d9a3" name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Sessions funnel */}
      {funnel && (
        <Card title={`Sessions funnel (last ${days} days)`}>
          <div className="kpis" style={{ marginBottom: 10 }}>
            <KPI label="Views" value={Number(funnel?.totals?.views || 0).toLocaleString()} />
            <KPI label="Adds" value={Number(funnel?.totals?.adds || 0).toLocaleString()} />
            <KPI label="Purchases" value={Number(funnel?.totals?.purchases || 0).toLocaleString()} />
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={(funnel.daily || []).map(d => ({
                date: d.date,
                views: Number(d.views || 0),
                adds: Number(d.adds || 0),
                purchases: Number(d.purchases || 0),
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="views" stroke="#4cc9f0" dot={false} />
                <Line type="monotone" dataKey="adds" stroke="#ffd166" dot={false} />
                <Line type="monotone" dataKey="purchases" stroke="#43d9a3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Grid: traffic source bars + A/B + AOV */}
      <div className="grid" style={{ marginTop: 14 }}>
        <Card title={`Traffic source effectiveness (last ${days} days)`}>
          <div style={{ height: 320, marginTop: 8 }}>
            <ResponsiveContainer>
              <BarChart data={(ts || []).map(r => ({
                ...r,
                views: Number(r.views || 0),
                adds: Number(r.adds || 0),
                purchases: Number(r.purchases || 0),
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="traffic_source" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="views" fill="#4cc9f0" />
                <Bar dataKey="adds" fill="#ffd166" />
                <Bar dataKey="purchases" fill="#43d9a3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {exp && (
          <Card title={`Checkout Button A/B (last ${days} days)`}>
            <div className="kpis" style={{ marginTop: 8 }}>
              <KPI label="A CR" value={`${((exp?.variant?.A?.cr || 0) * 100).toFixed(2)}%`} />
              <KPI label="B CR" value={`${((exp?.variant?.B?.cr || 0) * 100).toFixed(2)}%`} />
              <KPI label="Lift" value={`${((exp?.lift_abs || 0) * 100).toFixed(2)}%`} />
            </div>
            <div style={{ color: '#8b949e', fontSize: 12, marginTop: 8 }}>
              z = {exp?.z_score ?? '—'} (two-proportion z test)
            </div>
          </Card>
        )}

        {aov?.length > 0 && (
          <Card title={`Average Order Value by Source (last ${days} days)`}>
            <div style={{ height: 320, marginTop: 8 }}>
              <ResponsiveContainer>
                <BarChart data={(aov || []).map(r => ({ ...r, aov: Number(r.aov || 0) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="traffic_source" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="aov" name="AOV" fill="#9b5de5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* Category breakdown */}
      {cats?.length > 0 && (
        <Card title={`Category breakdown (last ${days} days)`}>
          <div className="kpis" style={{ marginBottom: 10 }}>
            <KPI label="Categories" value={cats.length.toLocaleString()} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={cats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="purchases" fill="#4cc9f0" name="Purchases" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={cats} dataKey="avg_price" nameKey="category" outerRadius={110} label>
                    {cats.map((_, i) => <Cell key={i} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      )}

      {/* Top products (note: backend returns qty & price) */}
      {tops?.length > 0 && (
        <Card title={`Top products (last ${days} days)`}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', color:'#e6edf3' }}>
              <thead>
                <tr style={{ background:'#161b22' }}>
                  <th style={th}>Product</th>
                  <th style={th}>Category</th>
                  <th style={thNum}>Qty</th>
                  <th style={thNum}>Price</th>
                  <th style={thNum}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {tops.map((r) => (
                  <tr key={r.product_id} style={{ borderTop:'1px solid #30363d' }}>
                    <td style={td}>{r.product_id}</td>
                    <td style={td}>{r.category}</td>
                    <td style={tdNum}>{Number(r.qty || 0).toLocaleString()}</td>
                    <td style={tdNum}>${Number(r.price || 0).toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                    <td style={tdNum}>${Number(r.revenue || 0).toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Retention heatmap */}
      {ret?.matrix && (
        <Card
          title="Cohort Retention"
          right={
            <select value={weeks} onChange={e => setWeeks(+e.target.value)} style={{ background:'#161b22', color:'#e6edf3', border:'1px solid #30363d' }}>
              {[4,5,6,7,8].map(w => <option key={w} value={w}>{w} weeks</option>)}
            </select>
          }
        >
          <div style={{ fontSize:12, color:'#8b949e', marginBottom:8 }}>
            Rows are signup cohorts (by week). Columns are retention week. Values show returning-user <b>rate</b>.
          </div>
          <RetentionGrid matrix={ret.matrix} />
        </Card>
      )}
    </div>
  );
}

const th = { textAlign:'left', padding:'8px 10px', borderBottom:'1px solid #30363d', color:'#e6edf3' };
const thNum = { ...th, textAlign:'right' };
const td = { padding:'8px 10px' };
const tdNum = { ...td, textAlign:'right', fontVariantNumeric:'tabular-nums' };

function RetentionGrid({ matrix }) {
  // matrix: [{ cohort:'YYYY-MM-DD', weeks:[{w, rate}, ...] }]
  const maxW = Math.max(0, ...matrix.map(r => r.weeks.length));
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ borderCollapse:'collapse', color:'#e6edf3' }}>
        <thead>
          <tr>
            <th style={{ ...th, position:'sticky', left:0, background:'#0d1117' }}>Cohort</th>
            {Array.from({ length: maxW }).map((_, i) => (
              <th key={i} style={th}>W{i}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => (
            <tr key={row.cohort}>
              <td style={{ ...td, position:'sticky', left:0, background:'#0d1117' }}>
                {row.cohort}
              </td>
              {Array.from({ length: maxW }).map((_, i) => {
                const cell = row.weeks[i];
                const rate = cell?.rate ?? null;
                const bg = rate == null ? '#111318' : heat(rate);
                const color = rate != null && rate > 0.5 ? '#0b0f14' : '#e6edf3';
                return (
                  <td key={i} style={{ ...td, textAlign:'center', background:bg, color, minWidth:60 }}>
                    {rate == null ? '—' : `${Math.round(rate * 100)}%`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// simple green gradient
function heat(x) {
  // x in [0,1]
  const t = Math.max(0, Math.min(1, x));
  const g = Math.round(255 * t);
  const r = Math.round(60 * (1 - t));
  const b = Math.round(70 * (1 - t));
  return `rgb(${r},${g},${b})`;
}