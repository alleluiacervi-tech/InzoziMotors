import api from './client';

export const notifications = {
  // Get active user's notifications (price updates, messages and inspections)
  getNotifications: async () => {
    return await api.get('/notifications');
  },

  // Mark specific notification as read
  markAsRead: async (id) => {
    return await api.patch(`/notifications/${id}/read`);
  },

  // Mark all active notifications as read
  markAllAsRead: async () => {
    return await api.patch('/notifications/read-all');
  },
};

export default notifications;
