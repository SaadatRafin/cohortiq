const API = import.meta.env.VITE_API_URL;

async function j(url) {
  const r = await fetch(url, {
    headers: {
      'ngrok-skip-browser-warning': 'true',
      'Accept': 'application/json'
    }
  });
  const ct = r.headers.get('content-type') || '';
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0,200)}`);
  if (ct.includes('application/json')) return JSON.parse(text);
  throw new Error(`Expected JSON, got ${ct}: ${text.slice(0,200)}`);
}

async function getJSON(path) {
  const r = await fetch(`${API}${path}`, {
    mode: 'cors',
    headers: {
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    }
  });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

export const api = {
  funnel: (days=30) => getJSON(`/metrics/funnel?days=${days}`),
  trafficSource: (days=30) => getJSON(`/metrics/traffic-source?days=${days}`),
  experimentCheckout: (days=30) => getJSON(`/experiments/checkout_button?days=${days}`)
};

export async function apiGet(path) {
  const r = await fetch(`${API}${path}`, {
    headers: {
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    mode: 'cors',
  });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

export const getFunnel  = (days=30) => j(`${API}/metrics/funnel?days=${days}`);
export const getTraffic = (days=30) => j(`${API}/metrics/traffic-source?days=${days}`);
export const getAB      = (days=30) => j(`${API}/experiments/checkout_button?days=${days}`);