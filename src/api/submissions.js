import api from './client';

export const submissions = {
  // Create a new car listing request / submission (seller pipeline stage 1)
  createSubmission: async (data) => {
    return await api.post('/submissions', data);
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
