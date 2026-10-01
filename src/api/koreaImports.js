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
};
