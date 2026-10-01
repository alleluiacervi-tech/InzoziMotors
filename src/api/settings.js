import api from './client';

// Public, cached server-side for ten minutes. Same endpoint the website's
// /tools/pricing reads, so the two can never quote different prices.
export const settings = {
  getRateCard: async () => api.get('/settings/rate-card'),
};

export default settings;
