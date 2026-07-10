import { ref, get, set, update, onValue, runTransaction } from 'firebase/database';
import { db } from '../firebase';

export const BOOKING_STATUS = {
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
};

const bookingRef = (rideId, uid) => ref(db, `bookings/${rideId}/${uid}`);
const rideBookingsRef = (rideId) => ref(db, `bookings/${rideId}`);
const userBookingRef = (uid, rideId) => ref(db, `userBookings/${uid}/${rideId}`);
const userBookingsRef = (uid) => ref(db, `userBookings/${uid}`);
const seatsRef = (rideId) => ref(db, `list/${rideId}/seatsAvailable`);

// Books one seat. Uses a transaction so two passengers can't take the last seat.
export const bookRide = async (ride, passenger) => {
  const { id: rideId } = ride;
  const { uid, name } = passenger;

  if (ride.localId === uid) {
    throw new Error('You cannot book your own ride.');
  }

  const existing = await get(bookingRef(rideId, uid));
  if (existing.exists() && existing.val().status === BOOKING_STATUS.CONFIRMED) {
    throw new Error('You have already booked this ride.');
  }

  const result = await runTransaction(seatsRef(rideId), (current) => {
    // current can be null for legacy rides; treat the static `seats` as fallback.
    const available = current === null ? parseInt(ride.seats, 10) || 0 : current;
    if (available <= 0) return; // abort
    return available - 1;
  });

  if (!result.committed) {
    throw new Error('Sorry, this ride is fully booked.');
  }

  const booking = {
    passengerUid: uid,
    passengerName: name || 'Passenger',
    rideId,
    status: BOOKING_STATUS.CONFIRMED,
    createdAt: new Date().toISOString(),
  };
  await set(bookingRef(rideId, uid), booking);
  await set(userBookingRef(uid, rideId), {
    rideId,
    driverUid: ride.localId,
    status: BOOKING_STATUS.CONFIRMED,
    createdAt: booking.createdAt,
  });
  return booking;
};

export const cancelBooking = async (ride, uid) => {
  const { id: rideId } = ride;
  const existing = await get(bookingRef(rideId, uid));
  if (!existing.exists() || existing.val().status !== BOOKING_STATUS.CONFIRMED) {
    return;
  }
  await runTransaction(seatsRef(rideId), (current) => (current === null ? 1 : current + 1));
  await update(bookingRef(rideId, uid), { status: BOOKING_STATUS.CANCELLED });
  await update(userBookingRef(uid, rideId), { status: BOOKING_STATUS.CANCELLED });
};

// Live set of ride ids the user has confirmed bookings on.
export const subscribeUserBookings = (uid, callback) =>
  onValue(userBookingsRef(uid), (snap) => {
    if (!snap.exists()) return callback([]);
    const ids = Object.entries(snap.val())
      .filter(([, b]) => b.status === BOOKING_STATUS.CONFIRMED)
      .map(([rideId]) => rideId);
    callback(ids);
  });

// Resolves the actual ride records the user has booked.
export const getUserBookedRides = async (uid) => {
  const snap = await get(userBookingsRef(uid));
  if (!snap.exists()) return [];
  const entries = Object.entries(snap.val()).filter(
    ([, b]) => b.status === BOOKING_STATUS.CONFIRMED
  );
  const rides = await Promise.all(
    entries.map(async ([rideId]) => {
      const rideSnap = await get(ref(db, `list/${rideId}`));
      return rideSnap.exists() ? { id: rideId, ...rideSnap.val() } : null;
    })
  );
  return rides.filter(Boolean);
};

export const subscribeRidePassengers = (rideId, callback) =>
  onValue(rideBookingsRef(rideId), (snap) => {
    if (!snap.exists()) return callback([]);
    callback(
      Object.values(snap.val()).filter((b) => b.status === BOOKING_STATUS.CONFIRMED)
    );
  });
