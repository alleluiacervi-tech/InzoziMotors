import api from './client';

export const inspections = {
  // Buyer-facing 150-point inspection report for a live listing
  getReport: async (carId) => {
    return await api.get(`/inspections/report/${carId}`);
  },

  // Vehicle history card (ownership, accidents, mileage verification, RRA)
  getVehicleHistory: async (carId) => {
    return await api.get(`/cars/${carId}/history`);
  },
};

export default inspections;
