const API_BASE =
  (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof window !== "undefined" && window.API_BASE) ||
  "/api"; // local dev behind nginx or vite proxy

async function apiGet(path, params = {}) {
  const url = new URL(path, API_BASE);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    credentials: "omit",
  });

  const ctype = res.headers.get("content-type") || "";
  if (!res.ok) {
    // Try to parse JSON error if any
    let detail = `HTTP ${res.status}`;
    try {
      if (ctype.includes("application/json")) {
        const j = await res.json();
        detail = j?.detail ? `${detail} – ${j.detail}` : detail;
      } else {
        const t = await res.text();
        if (t.startsWith("<!DOCTYPE")) detail = `${detail} – HTML response (CORS/proxy?)`;
        else if (t) detail = `${detail} – ${t.slice(0, 200)}`;
      }
    } catch {}
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }

  if (!ctype.includes("application/json")) {
    // Got HTML? Usually CORS/proxy/tunnel issue.
    const text = await res.text();
    throw new Error(`Expected JSON but got non-JSON (${ctype}). First bytes: ${text.slice(0, 120)}`);
  }

  return res.json();
}

// --- endpoint helpers (names your App.jsx can call) ---
async function getHealth() {
  return apiGet("/health");
}
async function getFunnel(days = 30) {
  return apiGet("/metrics/funnel", { days });
}
async function getTrafficSource(days = 30) {
  return apiGet("/metrics/traffic-source", { days });
}
// alias for any older code that called getTraffic
const getTraffic = getTrafficSource;

async function getExperimentCheckout(days = 30) {
  return apiGet("/experiments/checkout_button", { days });
}

// Optional / advanced endpoints (will 404 if not in backend yet)
async function getRevenue(days = 30) {
  return apiGet("/metrics/revenue", { days });
}
async function getAovBySource(days = 30) {
  return apiGet("/metrics/aov-by-source", { days });
}
async function getTopProducts(days = 30, limit = 10) {
  return apiGet("/metrics/top-products", { days, limit });
}
async function getRetention(weeks = 5) {
  return apiGet("/metrics/retention", { weeks });
}

const api = {
  API_BASE,
  getHealth,
  getFunnel,
  getTrafficSource,
  getTraffic,
  getExperimentCheckout,
  getRevenue,
  getAovBySource,
  getTopProducts,
  getRetention,
};

// Export both default and named so any import style works.
export default api;
export {
  api,
  getHealth,
  getFunnel,
  getTrafficSource,
  getTraffic,
  getExperimentCheckout,
  getRevenue,
  getAovBySource,
  getTopProducts,
  getRetention,
};