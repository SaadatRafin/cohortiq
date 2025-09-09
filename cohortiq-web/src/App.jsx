import { useEffect, useState } from 'react';
import { api } from './api';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend
} from 'recharts';
import './index.css';

export default function App() {
  const [days, setDays] = useState(30);
  const [funnel, setFunnel] = useState(null);
  const [ts, setTs] = useState([]);
  const [exp, setExp] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [f, t, e] = await Promise.all([
          api.funnel(days), api.trafficSource(days), api.experimentCheckout(days)
        ]);
        setFunnel(f); setTs(t); setExp(e); setErr(null);
      } catch (e) { setErr(e.message); }
    })();
  }, [days]);

  return (
    <div className="container">
      <h1>CohortIQ</h1>
      <h2>Acquisition & Conversion</h2>

      {err && <div className="card" style={{borderColor: 'var(--bad)'}}>Error: {err}</div>}

      {funnel && (
        <div className="card" style={{marginTop: 14}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <div>Sessions funnel (last {days} days)</div>
            <select value={days} onChange={e => setDays(+e.target.value)}>
              {[7,14,30,60,90].map(d => <option key={d} value={d}>{d}d</option>)}
            </select>
          </div>

          <div className="kpis" style={{marginBottom: 10}}>
            <div className="kpi">
              <div className="label">Views</div>
              <div className="value">{funnel.totals.views.toLocaleString()}</div>
            </div>
            <div className="kpi">
              <div className="label">Adds</div>
              <div className="value">{funnel.totals.adds.toLocaleString()}</div>
            </div>
            <div className="kpi">
              <div className="label">Purchases</div>
              <div className="value">{funnel.totals.purchases.toLocaleString()}</div>
            </div>
          </div>

          <div style={{height: 300}}>
            <ResponsiveContainer>
              <LineChart data={funnel.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="views" stroke="#4cc9f0" dot={false}/>
                <Line type="monotone" dataKey="adds" stroke="#ffd166" dot={false}/>
                <Line type="monotone" dataKey="purchases" stroke="#43d9a3" dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid" style={{marginTop: 14}}>
        <div className="card">
          <div>Traffic source effectiveness (last {days} days)</div>
          <div style={{height: 320, marginTop: 8}}>
            <ResponsiveContainer>
              <BarChart data={ts}>
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
        </div>

        {exp && (
          <div className="card">
            <div>Checkout Button A/B (last {days} days)</div>
            <div className="kpis" style={{marginTop: 8}}>
              <div className="kpi">
                <div className="label">A CR</div>
                <div className="value">{(exp.variant.A.cr*100).toFixed(2)}%</div>
              </div>
              <div className="kpi">
                <div className="label">B CR</div>
                <div className="value">{(exp.variant.B.cr*100).toFixed(2)}%</div>
              </div>
              <div className="kpi">
                <div className="label">Lift</div>
                <div className="value" style={{color: exp.lift_abs>=0 ? 'var(--ok)':'var(--bad)'}}>
                  {(exp.lift_abs*100).toFixed(2)}%
                </div>
              </div>
            </div>
            <div style={{color:'var(--muted)', fontSize:12, marginTop:8}}>
              z = {exp.z_score ?? '—'} (approx two-proportion z test)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}