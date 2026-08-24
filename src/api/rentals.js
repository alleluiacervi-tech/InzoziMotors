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

  cancelInquiry: async (inquiryId) => {
    return await api.patch(`/rentals/inquiries/${inquiryId}/status`, { status: 'cancelled' });
  },
};

export default rentals;
