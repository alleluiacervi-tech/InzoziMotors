import api from './client';

export const cars = {
  // Fetch vehicles with optional filtering parameters (make, year, price, etc.)
  getCars: async (filters = {}) => {
    // Build query string
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, String(val));
      }
    });
    const query = params.toString();
    const endpoint = query ? `/cars?${query}` : '/cars';
    return await api.get(endpoint);
  },

  // The home-screen banner: admin-chosen cars, in slot order.
  //
  // Public and unauthenticated. Every row carries `sponsored` and a `label`
  // decided by the server, so no screen can render a paid placement as an
  // editorial pick by forgetting to check the kind — which for a business
  // whose product is independent verification is the whole point.
  getFeatured: async (limit = 6) => {
    return await api.get(`/cars/featured?limit=${limit}`);
  },

  // Retrieve details of a specific vehicle listing. Richer than the browse
  // payload — price history, seller phone, market position — and it counts a view.
  getCar: async (id) => {
    return await api.get(`/cars/${id}`);
  },

  // Contact details are disclosed only after authentication, explicit
  // acknowledgement and the seller's visibility consent.
  contactSeller: async (id, channel, acknowledge = false) => {
    return await api.post(`/cars/${id}/contact`, { channel, acknowledge });
  },

  // Seller's own listings with the counters the analytics screen needs
  getMyListings: async () => {
    return await api.get('/cars/seller/mine');
  },

  // Toggle bookmarked status (Save/Unsave) for a listing
  // Seller changes the price of their own live listing
  updateCarPrice: async (id, price) => {
    return await api.patch(`/cars/${id}/price`, { price });
  },

  // Market-based valuation from live/sold comparables on the platform
  getValuation: async ({ make, year, mileage }) => {
    const params = new URLSearchParams({ make, year: String(year), mileage: String(mileage || '') });
    return await api.get(`/cars/valuation/estimate?${params.toString()}`);
  },

  saveCar: async (id) => {
    return await api.post(`/cars/save/${id}`);
  },

  // Fetch list of current user's bookmarked listings
  getSavedCars: async () => {
    return await api.get('/cars/saved/list');
  },

  // Fetch verified vehicle history card (RRA stamps, previous owners, etc.)
  getCarHistory: async (id) => {
    return await api.get(`/cars/${id}/history`);
  },

  // Fetch buyer-facing 150-point inspection report card
  getInspectionReport: async (carId) => {
    return await api.get(`/inspections/report/${carId}`);
  },

  // --- Saved Searches (Price/Alert alerts) ---
  getSavedSearches: async () => {
    return await api.get('/saved-searches');
  },

  createSavedSearch: async (label, filters) => {
    return await api.post('/saved-searches', { label, filters });
  },

  deleteSavedSearch: async (id) => {
    return await api.delete(`/saved-searches/${id}`);
  },

  toggleSavedSearchNotify: async (id, notifyEnabled) => {
    return await api.patch(`/saved-searches/${id}`, { notify_enabled: notifyEnabled });
  },
};

export default cars;
