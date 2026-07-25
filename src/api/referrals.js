import api from './client';

export const referrals = {
  // The server mints the code on first request, so this both fetches and
  // creates. Returns { code, uses, redemptions, created_at }.
  getMine: async () => {
    return await api.get('/referrals/mine');
  },

  // Apply someone else's code to my account — once, and never my own.
  redeem: async (code) => {
    return await api.post('/referrals/redeem', { code });
  },
};

export default referrals;
