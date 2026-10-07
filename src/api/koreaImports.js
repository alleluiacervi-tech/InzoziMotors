import api from './client';

// Used cars for sale in South Korea, from our own mirror of the Encar listings
// (backend/src/routes/imports-korea.js). Public: no sign-in to browse.
const query = (params = {}) => {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return q ? `?${q}` : '';
};

export default {
  list: (params) => api.get(`/imports/korea${query(params)}`),
  facets: (make) => api.get(`/imports/korea/facets${query({ make })}`),
  get: (id) => api.get(`/imports/korea/${encodeURIComponent(id)}`),
  reports: (id) => api.get(`/imports/korea/${encodeURIComponent(id)}/reports`),

  // The Korea market guide (backend lib/encar/market.js): counts by make and
  // model, and recent asking prices, from the provider's free plan. Works
  // while the mirror above is off.
  market: () => api.get('/imports/korea/market'),
  marketMake: (make) => api.get(`/imports/korea/market/${encodeURIComponent(make)}`),
  marketModel: (make, model) => api.get(`/imports/korea/market/${encodeURIComponent(make)}/${encodeURIComponent(model)}`),
};
