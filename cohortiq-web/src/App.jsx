import { useEffect, useState } from "react";
import { getFunnel, getTraffic, getAB } from "./api";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function App() {
  const [funnel, setFunnel] = useState(null);
  const [traffic, setTraffic] = useState([]);
  const [ab, setAB] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [f, t, a] = await Promise.all([getFunnel(30), getTraffic(30), getAB(30)]);
        setFunnel(f); setTraffic(t); setAB(a);
      } catch (e) { setErr(String(e.message || e)); }
    })();
  }, []);

  if (err) return <div style={{padding:20,color:"crimson"}}>Error: {err}</div>;
  if (!funnel || !ab) return <div style={{padding:20}}>Loading…</div>;

  const totals = funnel.totals || {};
  const rates = funnel.rates || {};
  const daily = (funnel.daily || []).map(d => ({...d, date: d.date.slice(5)}));

  return (
    <div style={{fontFamily:"Inter, system-ui, sans-serif", padding:24, maxWidth:1100, margin:"0 auto"}}>
      <h1 style={{marginBottom:8}}>CohortIQ Dashboard</h1>
      <p style={{marginTop:0, color:"#666"}}>Last 30 days</p>

      <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12}}>
        <Card title="Views" value={totals.views}/>
        <Card title="Adds" value={totals.adds}/>
        <Card title="Purchases" value={totals.purchases}/>
        <Card title="View→Add | Add→Purchase" value={`${rates.view_to_add ?? "-"} | ${rates.add_to_purchase ?? "-"}`}/>
      </div>

      <section style={{marginTop:24, height:320, background:"#fff", border:"1px solid #eee", borderRadius:12, padding:12}}>
        <h3 style={{margin:"0 0 8px"}}>Daily Purchases</h3>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={daily}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date"/>
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="purchases" dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:24}}>
        <div style={{background:"#fff", border:"1px solid #eee", borderRadius:12, padding:12}}>
          <h3 style={{margin:"0 0 8px"}}>Traffic Source Funnel</h3>
          <table width="100%" cellPadding="6">
            <thead><tr><th align="left">Source</th><th align="right">Views</th><th align="right">Adds</th><th align="right">Purchases</th><th align="right">V→A</th><th align="right">A→P</th></tr></thead>
            <tbody>
              {traffic.map(r => (
                <tr key={r.traffic_source}>
                  <td>{r.traffic_source}</td>
                  <td align="right">{r.views}</td>
                  <td align="right">{r.adds}</td>
                  <td align="right">{r.purchases}</td>
                  <td align="right">{r.view_to_add}</td>
                  <td align="right">{r.add_to_purchase}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{background:"#fff", border:"1px solid #eee", borderRadius:12, padding:12}}>
          <h3 style={{margin:"0 0 8px"}}>Checkout Button A/B</h3>
          <ABCard ab={ab}/>
        </div>
      </section>
    </div>
  );
}

function Card({title, value}) {
  return (
    <div style={{background:"#fff", border:"1px solid #eee", borderRadius:12, padding:12}}>
      <div style={{color:"#666", fontSize:14}}>{title}</div>
      <div style={{fontSize:28, fontWeight:700}}>{value ?? "-"}</div>
    </div>
  );
}

function ABCard({ab}) {
  const A = ab?.variant?.A || {};
  const B = ab?.variant?.B || {};
  return (
    <div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
        <div><strong>A</strong><div>n={A.n} buyers={A.buyers} cr={A.cr}</div></div>
        <div><strong>B</strong><div>n={B.n} buyers={B.buyers} cr={B.cr}</div></div>
      </div>
      <div style={{marginTop:12}}>Lift (B−A): <strong>{ab?.lift_abs}</strong>, z: <strong>{ab?.z_score ?? "-"}</strong></div>
    </div>
  );
}
