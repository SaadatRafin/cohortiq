// src/api.js
const API = import.meta.env.VITE_API_URL; // e.g. "https://<your-ngrok-domain>/api"

async function getJSON(path) {
  const r = await fetch(`${API}${path}`, {
    mode: 'cors',
    headers: {
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    }
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`API ${r.status} ${r.statusText}: ${text.slice(0,200)}`);
  }
  return r.json();
}

export const api = {
  // existing
  funnel: (days = 30) => getJSON(`/metrics/funnel?days=${days}`),
  trafficSource: (days = 30) => getJSON(`/metrics/traffic-source?days=${days}`),
  experimentCheckout: (days = 30) => getJSON(`/experiments/checkout_button?days=${days}`),

  // new
  revenue: (days = 30) => getJSON(`/metrics/revenue?days=${days}`),
  aovBySource: (days = 30) => getJSON(`/metrics/aov-by-source?days=${days}`),
  topProducts: (days = 30, limit = 10) => getJSON(`/metrics/top-products?days=${days}&limit=${limit}`),
  retention: (weeks = 5) => getJSON(`/metrics/retention?weeks=${weeks}`),
};