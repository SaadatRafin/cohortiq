const RAW = (import.meta.env.VITE_API_BASE || "").trim();
// Expect something like "https://<your-subdomain>.ngrok-free.app/api"
export const API_BASE = RAW ? RAW.replace(/\/+$/, "") : "";

// Small helper: build URL and fetch JSON
async function fetchJson(path) {
  if (!API_BASE) throw new Error("No API base configured");
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    // Helps skip ngrok warning page
    headers: { "ngrok-skip-browser-warning": "true" },
    mode: "cors",
    credentials: "omit",
  });

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}: ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ---------- fixtures (static fallback) ----------
const today = new Date();
const d = (i) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() - i);
  return dt.toISOString().slice(0, 10);
};

const FIX = {
  funnel: (days = 30) => {
    const daily = Array.from({ length: Math.min(days, 30) }, (_, i) => ({
      date: d(29 - i),
      views: 5200 + Math.floor(Math.random() * 300),
      adds: 1800 + Math.floor(Math.random() * 150),
      purchases: 820 + Math.floor(Math.random() * 80),
    }));
    const totals = daily.reduce(
      (acc, r) => ({
        views: acc.views + r.views,
        adds: acc.adds + r.adds,
        purchases: acc.purchases + r.purchases,
      }),
      { views: 0, adds: 0, purchases: 0 }
    );
    return {
      days,
      daily,
      totals,
      rates: {
        view_to_add: totals.views ? +(totals.adds / totals.views).toFixed(3) : null,
        add_to_purchase: totals.adds ? +(totals.purchases / totals.adds).toFixed(3) : null,
      },
    };
  },

  traffic(days = 30) {
    const rows = [
      "facebook",
      "instagram",
      "tiktok",
      "google_ads",
      "direct",
      "email",
      "referral",
    ].map((src) => {
      const v = 6000 + Math.floor(Math.random() * 800);
      const a = 0.35 * v + Math.floor(Math.random() * 100);
      const p = 0.45 * a + Math.floor(Math.random() * 40);
      return {
        traffic_source: src,
        views: Math.round(v),
        adds: Math.round(a),
        purchases: Math.round(p),
        view_to_add: +(a / v).toFixed(3),
        add_to_purchase: +(p / a).toFixed(3),
      };
    });
    // sort a bit for nicer table
    rows.sort((a, b) => b.adds - a.adds || b.purchases - a.purchases);
    return rows;
  },

  experiment(days = 30) {
    const nA = 2000,
      nB = 2000;
    const buyersA = 310;
    const buyersB = 355;
    const pA = buyersA / nA;
    const pB = buyersB / nB;
    const lift = pB - pA;
    const se = Math.sqrt((pA * (1 - pA)) / nA + (pB * (1 - pB)) / nB);
    const z = lift / se;
    return {
      days,
      variant: {
        A: { n: nA, buyers: buyersA, cr: +pA.toFixed(4) },
        B: { n: nB, buyers: buyersB, cr: +pB.toFixed(4) },
      },
      lift_abs: +lift.toFixed(5),
      z_score: +z.toFixed(3),
    };
  },

  revenue(days = 30) {
    const daily = Array.from({ length: Math.min(days, 30) }, (_, i) => ({
      date: d(29 - i),
      revenue: +(10000 + Math.random() * 2500).toFixed(2),
      orders: 300 + Math.floor(Math.random() * 60),
    }));
    const totals = daily.reduce(
      (acc, r) => ({
        revenue: acc.revenue + r.revenue,
        orders: acc.orders + r.orders,
      }),
      { revenue: 0, orders: 0 }
    );
    return {
      days,
      daily,
      totals: {
        revenue: +totals.revenue.toFixed(2),
        orders: totals.orders,
        aov: +(totals.revenue / totals.orders).toFixed(2),
      },
    };
  },

  aovBySource() {
    return [
      { traffic_source: "facebook", orders: 2200, revenue: 215000, aov: 97.7 },
      { traffic_source: "instagram", orders: 1800, revenue: 182000, aov: 101.1 },
      { traffic_source: "tiktok", orders: 1600, revenue: 150400, aov: 94.0 },
      { traffic_source: "google_ads", orders: 1400, revenue: 151200, aov: 108.0 },
      { traffic_source: "email", orders: 900, revenue: 90000, aov: 100.0 },
    ];
  },

  topProducts(limit = 10) {
    const cats = ["tops", "bottoms", "outerwear", "footwear", "accessories"];
    return Array.from({ length: limit }, (_, i) => ({
      product_id: `SKU-${(i + 1).toString().padStart(3, "0")}`,
      category: cats[i % cats.length],
      price: 49 + (i % 5) * 10,
      qty: 80 - i * 3, // NOTE: backend uses "qty" (not "units")
      revenue: (80 - i * 3) * (49 + (i % 5) * 10),
    }));
  },

  retention() {
    return [
      {
        cohort_week: d(35),
        series: [
          { week: 0, users: 1000 },
          { week: 1, users: 420 },
          { week: 2, users: 250 },
          { week: 3, users: 170 },
          { week: 4, users: 120 },
        ],
      },
      {
        cohort_week: d(42),
        series: [
          { week: 0, users: 1200 },
          { week: 1, users: 500 },
          { week: 2, users: 310 },
          { week: 3, users: 210 },
          { week: 4, users: 140 },
        ],
      },
    ];
  },
};

// common wrapper to fall back on fixtures
async function withFallback(promise, fixture) {
  try {
    const data = await promise;
    return data;
  } catch (e) {
    // If a 404 should hide a section, let caller decide to ignore/null
    if (e && e.status === 404) return fixture;
    console.warn("[API fallback]", e?.message || e);
    return fixture;
  }
}

const api = {
  API_BASE,

  // health ping (optional)
  async health() {
    return withFallback(fetchJson("/health"), { ok: true, offline: !API_BASE });
  },

  getFunnel(days) {
    return withFallback(fetchJson(`/metrics/funnel?days=${days}`), FIX.funnel(days));
  },

  getTrafficSource(days) {
    return withFallback(fetchJson(`/metrics/traffic-source?days=${days}`), FIX.traffic(days));
  },

  getExperimentCheckout(days) {
    return withFallback(
      fetchJson(`/experiments/checkout_button?days=${days}`),
      FIX.experiment(days)
    );
  },

  getRevenue(days) {
    // Optional metric – if API returns 404 we still return null to hide the card.
    return withFallback(fetchJson(`/metrics/revenue?days=${days}`), FIX.revenue(days));
  },

  getAovBySource(days) {
    return withFallback(
      fetchJson(`/metrics/aov-by-source?days=${days}`),
      FIX.aovBySource()
    );
  },

  getTopProducts(days, limit = 10) {
    // Normalize qty->units in the client so the UI can show either.
    return withFallback(
      fetchJson(`/metrics/top-products?days=${days}&limit=${limit}`).then((rows) =>
        rows.map((r) => ({ ...r, units: r.units ?? r.qty ?? r.quantity ?? 0 }))
      ),
      FIX.topProducts(limit).map((r) => ({ ...r, units: r.qty }))
    );
  },

  getRetention(weeks) {
    return withFallback(fetchJson(`/metrics/retention?weeks=${weeks}`), FIX.retention());
  },
};

export default api;