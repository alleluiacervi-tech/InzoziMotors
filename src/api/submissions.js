import api from './client';
import { appendImage } from '../utils/media';

export const submissions = {
  // Create a new car listing request / submission (seller pipeline stage 1)
  createSubmission: async (data) => {
    return await api.post('/submissions', data);
  },

  // Attach the optional reference shots to a submission that already exists
  // (B2 in docs/WEB-PARITY-PLAN.md). `photos` is { slotKey: asset } from
  // CarSubmissionScreen; empty slots are skipped.
  uploadReferencePhotos: async (id, photos) => {
    const entries = Object.entries(photos || {}).filter(([, asset]) => asset?.uri);
    if (!entries.length) return null;
    const formData = new FormData();
    entries.forEach(([key, asset]) => appendImage(formData, 'photos', asset, `reference-${key}`));
    return await api.upload(`/submissions/${id}/reference-photos`, formData);
  },

  // Get list of active user's car submissions (for seller pipeline dashboards)
  getSubmissions: async () => {
    return await api.get('/submissions');
  },

  // --- Admin only actions ---
  getAdminSubmissions: async (status) => {
    const endpoint = status ? `/submissions/admin/all?status=${status}` : '/submissions/admin/all';
    return await api.get(endpoint);
  },

  // Approve, schedule center, or reject submission
  updateSubmissionStatus: async (id, data) => {
    // Body: { status, admin_notes, center, scheduled_date, scheduled_time }
    return await api.patch(`/submissions/${id}`, data);
  },

  // Seller books their own inspection slot (offered right after submit)
  scheduleInspection: async (id, { center, date, time }) => {
    return await api.patch(`/submissions/${id}/schedule`, {
      center, scheduled_date: date, scheduled_time: time,
    });
  },
};

export default submissions;
