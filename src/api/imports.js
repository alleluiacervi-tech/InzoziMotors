import api from './client';
import { appendImage } from '../utils/media';

export default {
  mine: () => api.get('/imports/mine'),
  get: (id) => api.get(`/imports/${id}`),
  // The client has no `params` option (it was silently ignored, so every
  // brand's screen fetched the whole catalogue); build the query string here.
  getCatalog: (params = {}) => {
    const query = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    return api.get(`/imports/catalog${query ? `?${query}` : ''}`);
  },
  getCatalogItem: (id) => api.get(`/imports/catalog/${id}`),
  create: (data) => api.post('/imports', data),
  acceptAgreement: (id) => api.post(`/imports/${id}/accept-agreement`, {}),
  submitPaymentProof: (orderId, paymentId, bankReference, proof) => {
    const form = new FormData();
    form.append('bank_reference', bankReference);
    appendImage(form, 'proof', proof, 'payment-proof');
    return api.upload(`/imports/${orderId}/payments/${paymentId}/proof`, form);
  },
};
