import api from './client';
import { appendImage } from '../utils/media';

export const inspections = {
  // Buyer-facing 150-point inspection report for a live listing
  getReport: async (carId) => {
    return await api.get(`/inspections/report/${carId}`);
  },

  // Vehicle history card (ownership, accidents, mileage verification, RRA)
  getVehicleHistory: async (carId) => {
    return await api.get(`/cars/${carId}/history`);
  },

  // Admin: the inspections queue, filterable by status / center / date
  list: async (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== '')
    ).toString();
    return await api.get(query ? `/inspections?${query}` : '/inspections');
  },

  get: async (id) => {
    return await api.get(`/inspections/${id}`);
  },

  // Mechanic begins the walkaround (scheduled -> in_progress)
  start: async (id) => {
    return await api.post(`/inspections/${id}/start`, {});
  },

  complete: async (id, { checklistResults, notes }) => {
    return await api.post(`/inspections/${id}/complete`, {
      checklist_results: checklistResults,
      notes,
    });
  },

  // Admin: ordered flexible gallery (1–40 photos). Keys preserve display order.
  uploadCarPhotos: async (carId, assets) => {
    if (!assets?.length) throw new Error('No photos to upload');
    const formData = new FormData();
    assets.forEach((asset, i) => {
      const key = asset.angleKey || `gallery-${String(i + 1).padStart(3, '0')}`;
      appendImage(formData, 'photos', asset, key);
      formData.append('angle_keys', key);
    });
    return await api.upload(`/inspections/cars/${carId}/photos`, formData);
  },
};

export default inspections;
