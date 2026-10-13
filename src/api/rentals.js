import api from './client';
import { appendImage } from '../utils/media';
export const rentals = {
  // Public inventory belongs to verified independent rental providers.
  getRentalCars: async () => {
    return await api.get('/rentals');
  },

  getRentalCar: async (id) => {
    return await api.get(`/rentals/${id}`);
  },

  inquire: async (carId, data) => {
    return await api.post(`/rentals/${carId}/inquire`, data);
  },

  getMyInquiries: async () => {
    return await api.get('/rentals/inquiries/my');
  },

  // The provider side. Providers see only their own leads; the server scopes it.
  getReceivedInquiries: async () => {
    return await api.get('/rentals/inquiries');
  },

  getMyFleet: async () => {
    return await api.get('/rentals/mine');
  },

  setInquiryStatus: async (inquiryId, status) => {
    return await api.patch(`/rentals/inquiries/${inquiryId}/status`, { status });
  },

  cancelInquiry: async (inquiryId) => {
    return await api.patch(`/rentals/inquiries/${inquiryId}/status`, { status: 'cancelled' });
  },

  // ── Provider self-serve: the same endpoints the website's /dashboard/rentals/fleet uses.
  // Adding a car with no inspection asks Sawa for its 10-point Rental Check.
  proposeCar: async (data) => api.post('/rentals/propose', data),
  updateMyCar: async (id, data) => api.patch(`/rentals/${id}/mine`, data),
  requestCheck: async (id) => api.post(`/rentals/${id}/mine/request-check`, {}),
  uploadPhotos: async (id, assets) => {
    const list = (assets || []).filter((asset) => asset?.uri).slice(0, 6);
    if (!list.length) return null;
    const formData = new FormData();
    list.forEach((asset, index) => appendImage(formData, 'photos', asset, `rental-${index + 1}`));
    return api.upload(`/rentals/${id}/mine/photos`, formData);
  },

  // The provider's calendar: which days a car is out. Owner-only writes.
  getCalendar: async (id) => api.get(`/rentals/${id}/mine/busy`),
  markTaken: async (id, startsOn, endsOn) => api.post(`/rentals/${id}/mine/busy`, { starts_on: startsOn, ends_on: endsOn }),
  updatePeriod: async (id, periodId, data) => api.patch(`/rentals/${id}/mine/busy/${periodId}`, data),
  removePeriod: async (id, periodId) => api.delete(`/rentals/${id}/mine/busy/${periodId}`),
  confirmCalendar: async (id) => api.post(`/rentals/${id}/mine/calendar/confirm`, {}),
  // The provider agreed this request with the renter: mark its dates taken and close it.
  rentedOut: async (inquiryId) => api.post(`/rentals/inquiries/${inquiryId}/rented-out`, {}),
};

export default rentals;
