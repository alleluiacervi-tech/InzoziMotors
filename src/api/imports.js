import api from './client';
import { appendImage } from '../utils/media';

export default {
  mine: () => api.get('/imports/mine'),
  get: (id) => api.get(`/imports/${id}`),
  create: (data) => api.post('/imports', data),
  acceptAgreement: (id) => api.post(`/imports/${id}/accept-agreement`, {}),
  submitPaymentProof: (orderId, paymentId, bankReference, proof) => {
    const form = new FormData();
    form.append('bank_reference', bankReference);
    appendImage(form, 'proof', proof, 'payment-proof');
    return api.upload(`/imports/${orderId}/payments/${paymentId}/proof`, form);
  },
};
