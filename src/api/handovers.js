import api from './client';

export const handovers = {
  // Book a handover slots at the inspection center (reserves car)
  bookHandover: async (data) => {
    // Body: { car_id, contact_phone?, center?, handover_date?, handover_time? }
    return await api.post('/handovers', data);
  },

  // Get current user's handover schedule & reservations
  getMyHandovers: async () => {
    return await api.get('/handovers/my');
  },

  // Cancel pending handover reservation
  cancelHandover: async (id) => {
    return await api.patch(`/handovers/${id}/cancel`);
  },

  // --- Admin only actions ---
  getAdminHandovers: async (status = 'pending') => {
    return await api.get(`/handovers?status=${status}`);
  },

  confirmHandover: async (id) => {
    return await api.patch(`/handovers/${id}/confirm`);
  },

  // Marks the car sold, records commission, updates seller trust
  completeHandover: async (id) => {
    return await api.patch(`/handovers/${id}/complete`);
  },
};

export default handovers;
