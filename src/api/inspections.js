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

  // Admin: named 36-angle listing photos. Re-uploading an angle replaces it.
  uploadCarPhotos: async (carId, assets) => {
    if (!assets?.length) throw new Error('No photos to upload');
    const formData = new FormData();
    assets.forEach((asset, i) => {
      appendImage(formData, 'photos', asset, asset.angleKey || `photo-${i + 1}`);
      formData.append('angle_keys', asset.angleKey);
    });
    return await api.upload(`/inspections/cars/${carId}/photos`, formData);
  },
};

export default inspections;
