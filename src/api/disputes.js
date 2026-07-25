import api from './client';

// The 7-day drive-it guarantee only means something if a buyer can actually
// raise a problem. The window is enforced server-side against the handover's
// confirmed_at, so the app never has to be the judge of it.
export const disputes = {
  raise: async (handoverId, reason) => {
    return await api.post('/disputes', { handover_id: handoverId, reason });
  },

  getMine: async () => {
    return await api.get('/disputes/mine');
  },
};

export default disputes;
