import api from './client';
export const rentals = {
  // Public inventory belongs to verified independent rental providers.
  getRentalCars: async () => {
    return await api.get('/rentals');
  },

  getRentalCar: async (id) => {
    return await api.get(`/rentals/${id}`);
  },

  inquire: async (carId, data) => {
    return await api.post(`/rentals/${carId}/inquire`, data);
  },

  getMyInquiries: async () => {
    return await api.get('/rentals/inquiries/my');
  },

  // The provider side. Providers see only their own leads; the server scopes it.
  getReceivedInquiries: async () => {
    return await api.get('/rentals/inquiries');
  },

  getMyFleet: async () => {
    return await api.get('/rentals/mine');
  },

  setInquiryStatus: async (inquiryId, status) => {
    return await api.patch(`/rentals/inquiries/${inquiryId}/status`, { status });
  },

  cancelInquiry: async (inquiryId) => {
    return await api.patch(`/rentals/inquiries/${inquiryId}/status`, { status: 'cancelled' });
  },
};

export default rentals;
