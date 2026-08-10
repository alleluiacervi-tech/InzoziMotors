import api from './client';
import { appendImage } from '../utils/media';

export const rentals = {
  // Active fleet, each car including booked_ranges for availability greying
  getRentalCars: async () => {
    return await api.get('/rentals');
  },

  getRentalCar: async (id) => {
    return await api.get(`/rentals/${id}`);
  },

  // Body: { start_date (ISO), days, pickup_window?, airport_pickup?, center?,
  //         pay_online? } — with pay_online the response carries
  // payment: { merchant_ref, amount, currency, redirect_url } and the booking
  // holds the dates as pending_payment until the gateway confirms.
  bookRental: async (carId, data) => {
    return await api.post(`/rentals/${carId}/book`, data);
  },

  // Poll after the hosted checkout returns. Also the safety net for a missed
  // gateway callback — a pending payment is re-verified live server-side.
  getPaymentStatus: async (merchantRef) => {
    return await api.get(`/payments/${merchantRef}`);
  },

  getMyBookings: async () => {
    return await api.get('/rentals/bookings/my');
  },

  // status: 'active' (check-in) | 'completed' (return) | 'cancelled'
  // record: optional condition record / agreement stamp
  updateBookingStatus: async (bookingId, status, record = null) => {
    return await api.patch(`/rentals/bookings/${bookingId}/status`, { status, record });
  },

  // Condition photos taken at the counter. stage: 'pickup' | 'return' — the
  // server merges the URLs into that stage's record, so the evidence sits
  // alongside the signed condition notes.
  uploadBookingPhotos: async (bookingId, assets, stage = 'pickup') => {
    if (!assets?.length) throw new Error('No photos to upload');
    const formData = new FormData();
    formData.append('stage', stage);
    assets.forEach((asset, i) => {
      appendImage(formData, 'photos', asset, asset.slotKey || `${stage}-${i + 1}`);
    });
    return await api.upload(`/rentals/bookings/${bookingId}/photos`, formData);
  },
};

export default rentals;
