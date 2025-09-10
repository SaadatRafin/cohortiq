// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import api from "./api";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Legend,
} from "recharts";
import "./index.css";

const fmtInt = (n) => Number(n ?? 0).toLocaleString();
const fmtPct = (x) =>
  (x === null || x === undefined) ? "—" : `${(Number(x) * 100).toFixed(2)}%`;
const fmtUsd = (n) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(n ?? 0));

export default function App() {
  const [days, setDays] = useState(30);

  const [funnel, setFunnel] = useState(null);
  const [traffic, setTraffic] = useState([]);
  const [exp, setExp] = useState(null);

  // optional metrics
  const [revenue, setRevenue] = useState(null);
  const [aovBySource, setAovBySource] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [retention, setRetention] = useState(null);

  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  // Derived totals for the hero row
  const totals = useMemo(() => {
    const t = funnel?.totals || {};
    return {
      views: t.views ?? 0,
      adds: t.adds ?? 0,
      purchases: t.purchases ?? 0,
      v2a: funnel?.rates?.view_to_add ?? null,
      a2p: funnel?.rates?.add_to_purchase ?? null,
    };
  }, [funnel]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);

    (async () => {
      try {
        // Kick all requests in parallel, but catch optional ones individually.
        const pFunnel = api.getFunnel(days);
        const pTraffic = api.getTrafficSource(days);
        const pExp = api.getExperimentCheckout(days);

        const pRevenue = api.getRevenue(days).catch((e) => {
          if (e.status === 404) return null;
          throw e;
        });
        const pAov = api.getAovBySource(days).catch((e) => {
          if (e.status === 404) return [];
          throw e;
        });
        const pProducts = api.getTopProducts(days, 10).catch((e) => {
          if (e.status === 404) return [];
          throw e;
        });
        const pRet = api.getRetention(5).catch((e) => {
          if (e.status === 404) return null;
          throw e;
        });

        const [fu, ts, ex, rev, aov, prod, ret] = await Promise.all([
          pFunnel, pTraffic, pExp, pRevenue, pAov, pProducts, pRet,
        ]);

        if (cancelled) return;

        setFunnel(fu);
        setTraffic(Array.isArray(ts) ? ts : []);
        setExp(ex);
        setRevenue(rev);
        setAovBySource(Array.isArray(aov) ? aov : []);
        setTopProducts(Array.isArray(prod) ? prod : []);
        setRetention(ret);
      } catch (e) {
        if (!cancelled) setErr(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [days]);

  const dailyFunnel = funnel?.daily?.map((d) => ({
    date: d.date,
    views: Number(d.views ?? 0),
    adds: Number(d.adds ?? 0),
    purchases: Number(d.purchases ?? 0),
  })) ?? [];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>CohortIQ</h1>
        <div>
          <label style={{ marginRight: 8 }}>Window (days):</label>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[7, 14, 30, 60, 90].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </header>

      <p style={{ marginTop: 4, opacity: 0.7 }}>
        API: <code>{api.API_BASE}</code>
      </p>

      {err && (
        <div style={{ background: "#fee", border: "1px solid #f99", padding: 12, marginTop: 8 }}>
          <strong>Failed to load:</strong> {err}
        </div>
      )}

      {/* KPIs */}
      <section className="kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 12 }}>
        <KPI label="Views" value={fmtInt(totals.views)} />
        <KPI label="Adds" value={fmtInt(totals.adds)} />
        <KPI label="Purchases" value={fmtInt(totals.purchases)} />
        <KPI label="Add → Purchase" value={fmtPct(totals.a2p)} />
      </section>

      {/* Funnel chart */}
      <Card title={`Sessions Funnel (last ${days} days)`} loading={loading}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dailyFunnel}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="views" name="Views" dot={false} />
            <Line type="monotone" dataKey="adds" name="Adds" dot={false} />
            <Line type="monotone" dataKey="purchases" name="Purchases" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Traffic Source */}
      <Card title={`By Traffic Source (last ${days} days)`} loading={loading}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={traffic}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="traffic_source" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="views" name="Views" />
            <Bar dataKey="adds" name="Adds" />
            <Bar dataKey="purchases" name="Purchases" />
          </BarChart>
        </ResponsiveContainer>

        <table style={{ width: "100%", marginTop: 10 }}>
          <thead>
            <tr>
              <th align="left">Source</th>
              <th align="right">Views</th>
              <th align="right">Adds</th>
              <th align="right">Purchases</th>
              <th align="right">V→A</th>
              <th align="right">A→P</th>
            </tr>
          </thead>
          <tbody>
            {traffic.map((r) => (
              <tr key={r.traffic_source}>
                <td>{r.traffic_source}</td>
                <td align="right">{fmtInt(r.views)}</td>
                <td align="right">{fmtInt(r.adds)}</td>
                <td align="right">{fmtInt(r.purchases)}</td>
                <td align="right">{fmtPct(r.view_to_add)}</td>
                <td align="right">{fmtPct(r.add_to_purchase)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* A/B Test */}
      {exp && (
        <Card title={`Checkout Button A/B (last ${days} days)`}>
          <div className="kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <KPI label="A CR" value={fmtPct(exp?.variant?.A?.cr)} />
            <KPI label="B CR" value={fmtPct(exp?.variant?.B?.cr)} />
            <KPI label="Abs Lift (B−A)" value={fmtPct(exp?.lift_abs)} />
            <KPI label="z-score" value={(exp?.z_score ?? "—").toString()} />
          </div>
        </Card>
      )}

      {/* Revenue (optional) */}
      {revenue && (
        <Card title={`Revenue (last ${days} days)`}>
          <div className="kpis" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <KPI label="Total Revenue" value={fmtUsd(revenue?.totals?.revenue)} />
            <KPI label="Orders" value={fmtInt(revenue?.totals?.orders)} />
            <KPI label="AOV" value={fmtUsd(revenue?.totals?.aov)} />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={(revenue?.daily ?? []).map(d => ({ date: d.date, revenue: Number(d.revenue ?? 0) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="Revenue" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* AOV by source (optional) */}
      {aovBySource?.length > 0 && (
        <Card title={`Avg Order Value by Source (last ${days} days)`}>
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th align="left">Source</th>
                <th align="right">Orders</th>
                <th align="right">Revenue</th>
                <th align="right">AOV</th>
              </tr>
            </thead>
            <tbody>
              {aovBySource.map((r) => (
                <tr key={r.traffic_source}>
                  <td>{r.traffic_source}</td>
                  <td align="right">{fmtInt(r.orders)}</td>
                  <td align="right">{fmtUsd(r.revenue)}</td>
                  <td align="right">{fmtUsd(r.aov)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Top products (optional) */}
      {topProducts?.length > 0 && (
        <Card title={`Top Products (last ${days} days)`}>
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th align="left">Product</th>
                <th align="left">Category</th>
                <th align="right">Units</th>
                <th align="right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((r) => (
                <tr key={r.product_id}>
                  <td>{r.product_id}</td>
                  <td>{r.category || "—"}</td>
                  <td align="right">{fmtInt(r.units)}</td>
                  <td align="right">{fmtUsd(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Retention summary (optional, simple view) */}
      {retention && (
        <Card title="User Retention (coarse)">
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
            {JSON.stringify(retention, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div className="kpi" style={{ background: "#111", color: "#fff", borderRadius: 12, padding: 12 }}>
      <div className="label" style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
      <div className="value" style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function Card({ title, children, loading }) {
  return (
    <div className="card" style={{ background: "#202020", color: "#fff", borderRadius: 16, padding: 16, marginTop: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      {loading ? <div style={{ opacity: 0.7 }}>Loading…</div> : children}
    </div>
  );
}
