import api from './client';

export const reviews = {
  // Historical and moderated platform feedback for a seller.
  getSellerReviews: async (userId) => {
    return await api.get(`/reviews/seller/${userId}`);
  },

  // Full trust-score breakdown (id / sales / response rate / reviews)
  getTrustScore: async (userId) => {
    return await api.get(`/reviews/trust-score/${userId}`);
  },

  // Flag a review for the moderation queue. Idempotent server-side —
  // repeat reports from the same person do not stack.
  reportReview: async (reviewId, reason) => {
    return await api.post(`/reviews/${reviewId}/report`, { reason });
  },
};

export default reviews;
