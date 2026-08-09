import api from './client';

export const messages = {
  // Get active conversations list
  getConversations: async () => {
    return await api.get('/messages/conversations');
  },

  // Retrieve message history of a specific conversation thread
  getConversationMessages: async (id) => {
    return await api.get(`/messages/conversations/${id}`);
  },

  // Initiate new messaging thread regarding a listing (buyer → seller)
  startConversation: async (carId, text) => {
    return await api.post('/messages/conversations', { car_id: carId, message: text });
  },

  // Post message to existing conversation thread
  sendMessage: async (id, text) => {
    return await api.post(`/messages/conversations/${id}`, { text });
  },

  // Chat safety — report a conversation to the Sawa team
  reportConversation: async (id, reason, messageId = null) => {
    return await api.post(`/messages/conversations/${id}/report`, { reason, message_id: messageId });
  },

  // Stop all messaging with a user (their threads disappear from your list)
  blockUser: async (userId) => {
    return await api.post(`/messages/users/${userId}/block`, {});
  },

  unblockUser: async (userId) => {
    return await api.delete(`/messages/users/${userId}/block`);
  },
};

export default messages;
