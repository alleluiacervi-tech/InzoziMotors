import api from './client';

export const reviews = {
  // Reviews left for a seller after completed handovers
  getSellerReviews: async (userId) => {
    return await api.get(`/reviews/seller/${userId}`);
  },

  // Full trust-score breakdown (id / sales / response rate / reviews)
  getTrustScore: async (userId) => {
    return await api.get(`/reviews/trust-score/${userId}`);
  },

  // Body: { handover_id, rating, comment }
  postReview: async (data) => {
    return await api.post('/reviews', data);
  },

  // Flag a review for the moderation queue. Idempotent server-side —
  // repeat reports from the same person do not stack.
  reportReview: async (reviewId, reason) => {
    return await api.post(`/reviews/${reviewId}/report`, { reason });
  },
};

export default reviews;
