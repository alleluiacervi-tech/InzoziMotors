import api from './client';

export const rentals = {
  // Active fleet, each car including booked_ranges for availability greying
  getRentalCars: async () => {
    return await api.get('/rentals');
  },

  getRentalCar: async (id) => {
    return await api.get(`/rentals/${id}`);
  },

  // Body: { start_date (ISO), days, pickup_window?, airport_pickup?, center? }
  bookRental: async (carId, data) => {
    return await api.post(`/rentals/${carId}/book`, data);
  },

  getMyBookings: async () => {
    return await api.get('/rentals/bookings/my');
  },

  // status: 'active' (check-in) | 'completed' (return) | 'cancelled'
  // record: optional condition record / agreement stamp
  updateBookingStatus: async (bookingId, status, record = null) => {
    return await api.patch(`/rentals/bookings/${bookingId}/status`, { status, record });
  },
};

export default rentals;
