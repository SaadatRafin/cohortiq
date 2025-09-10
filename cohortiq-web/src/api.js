const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('apiBase') : null;

// Priority: window.__API_BASE__ (runtime) → Vite var → saved localStorage → sensible default
const DEFAULT_BASE =
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) ||
  saved ||
  // ← update this to your reserved ngrok URL when needed
  'https://unharsh-wearyingly-adalberto.ngrok-free.app/api';

let API_BASE = DEFAULT_BASE;

// Let the app change the API at runtime (handy with GitHub Pages)
export function setApiBase(url) {
  API_BASE = url.replace(/\/+$/, ''); // trim trailing slash
  try { localStorage.setItem('apiBase', API_BASE); } catch {}
}

export function getApiBase() {
  return API_BASE;
}

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      // Bypass ngrok’s browser warning page:
      'ngrok-skip-browser-warning': 'true',
    },
    credentials: 'omit',
    method: 'GET',
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

export const api = {
  health: () => fetchJson('/health'),
  funnel: (days = 30) => fetchJson(`/metrics/funnel?days=${days}`),
  trafficSource: (days = 30) => fetchJson(`/metrics/traffic-source?days=${days}`),
  experimentCheckout: (days = 30) => fetchJson(`/experiments/checkout_button?days=${days}`),

  revenue: (days = 30) => fetchJson(`/metrics/revenue?days=${days}`),
  // Daily revenue-only series if you also want it:
  revenueTrend: (days = 60) => fetchJson(`/metrics/revenue-trend?days=${days}`),

  aovBySource: (days = 30) => fetchJson(`/metrics/aov-by-source?days=${days}`),

  // Backend returns qty & revenue, not views/adds/purchases — we pass through.
  topProducts: (days = 30, limit = 10) =>
    fetchJson(`/metrics/top-products?days=${days}&limit=${limit}`),

  // Backend returns: [{ cohort_week, series:[{week, users}, ...] }]
  // Transform to a heatmap-friendly matrix with retention rates.
  retention: async (weeks = 5) => {
    const rows = await fetchJson(`/metrics/retention?weeks=${weeks}`);
    // Build map: cohort → { w0Users, weeks:[{w, rate}] }
    const byCohort = rows.map(r => {
      const sorted = [...(r.series || [])].sort((a, b) => a.week - b.week);
      const w0 = sorted.find(c => c.week === 0)?.users || 0;
      const weeksArr = sorted.map(c => ({
        w: c.week,
        rate: w0 ? c.users / w0 : null,
      }));
      return { cohort: r.cohort_week, weeks: weeksArr };
    });
    return { matrix: byCohort };
  },

  // Optional: category breakdown
  category: (days = 30) => fetchJson(`/metrics/category?days=${days}`),
};