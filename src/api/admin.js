import api from './client';

// Admin surfaces in the mobile app mirror a subset of the web dashboard —
// enough for the team to work from the inspection center floor.
export const admin = {
  getStats: async () => {
    return await api.get('/admin/stats');
  },

  // { topMakes, pipelineFunnel, centers, monthlySales }
  getAnalytics: async () => {
    return await api.get('/admin/analytics');
  },

  // Any status, unlike the public /cars browse which is live-only
  getListings: async ({ status = 'live', make, limit = 50, offset = 0 } = {}) => {
    const params = new URLSearchParams({ status, limit: String(limit), offset: String(offset) });
    if (make) params.append('make', make);
    return await api.get(`/admin/listings?${params.toString()}`);
  },

  updateListingStatus: async (carId, status) => {
    return await api.patch(`/cars/${carId}/status`, { status });
  },
};

export default admin;
