import api from './client';

// The brand list. Public, cached server-side for ten minutes, and small — the
// whole payload is about sixty `{name, slug, logo_url}` objects.
export default {
  getMakes: async () => api.get('/makes'),
};
