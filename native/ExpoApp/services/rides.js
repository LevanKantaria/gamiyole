import {
  ref,
  push,
  set,
  get,
  update,
  onValue,
  query,
  orderByChild,
  startAt,
  endAt,
  equalTo,
} from 'firebase/database';
import { db } from '../firebase';

// The live feed only loads the next two weeks — routines materialize months of
// rides upfront, and fetching all of them on every app open would be wasteful.
export const FEED_WINDOW_DAYS = 14;

// Admins can revoke a driver's publishing rights (see /admin on the web app);
// the database rules reject ride writes from suspended drivers server-side.
export const isDriverSuspended = async (uid) => {
  try {
    const snap = await get(ref(db, `disabledDrivers/${uid}`));
    return snap.exists();
  } catch {
    return false;
  }
};

export const RIDE_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

const listRef = () => ref(db, 'list');
const rideRef = (id) => ref(db, `list/${id}`);

const toArray = (snap) =>
  snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : [];

// Rides without a rideType are carpools (the field was added later).
export const rideTypeOf = (ride) => (ride.rideType === 'bus' ? 'bus' : 'carpool');
export const isFreeRide = (ride) => Number(ride.price) === 0;

// Number of seats still bookable, tolerant of old records that only had `seats`.
export const seatsLeft = (ride) => {
  if (typeof ride.seatsAvailable === 'number') return ride.seatsAvailable;
  const total = parseInt(ride.seats, 10);
  return Number.isNaN(total) ? 0 : total;
};

export const publishRide = async (driverUid, { name, number }, form) => {
  const totalSeats = parseInt(form.seats, 10) || 0;
  const newRef = push(listRef());
  await set(newRef, {
    departure: form.departure,
    destination: form.destination,
    date: form.date,
    departureTime: form.departureTime,
    // Optional fields — Firebase rejects undefined values in set().
    ...(form.arrivalTime ? { arrivalTime: form.arrivalTime } : {}),
    ...(form.badges?.length ? { badges: form.badges } : {}),
    ...(form.comment?.trim() ? { comment: form.comment.trim() } : {}),
    ...(form.rideType === 'bus' ? { rideType: 'bus' } : {}),
    price: form.price,
    seats: form.seats,
    seatsAvailable: totalSeats,
    localId: driverUid,
    name,
    number: number || 'Not provided',
    status: RIDE_STATUS.ACTIVE,
    createdAt: new Date().toISOString(),
  });
  return newRef.key;
};

// Live feed of upcoming, active rides (today up to FEED_WINDOW_DAYS ahead).
export const subscribeUpcomingRides = (callback) => {
  const q = query(
    listRef(),
    orderByChild('date'),
    startAt(todayISO()),
    endAt(plusDaysISO(FEED_WINDOW_DAYS))
  );
  return onValue(q, (snap) => {
    const rides = toArray(snap)
      .filter((r) => r.status !== RIDE_STATUS.CANCELLED)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    callback(rides);
  });
};

const plusDaysISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// "when" is a flexible date filter: any | today | tomorrow | week | date.
// Same semantics as the web app's search.
export const dateRangeFor = (when, date) => {
  switch (when) {
    case 'today':
      return [todayISO(), todayISO()];
    case 'tomorrow':
      return [plusDaysISO(1), plusDaysISO(1)];
    case 'week':
      return [todayISO(), plusDaysISO(7)];
    case 'date':
      return date ? [date, date] : [null, null];
    default:
      return [null, null];
  }
};

export const searchRides = async ({ departure, destination, when = 'any', date }) => {
  const [from, to] = dateRangeFor(when, date);
  // Server-side date window: an exact far-out date fetches just that date,
  // everything else is capped at the two-week feed window.
  const q = query(
    listRef(),
    orderByChild('date'),
    startAt(from || todayISO()),
    endAt(to || plusDaysISO(FEED_WINDOW_DAYS))
  );
  const snap = await get(q);
  return toArray(snap)
    .filter((r) => r.status !== RIDE_STATUS.CANCELLED)
    .filter((r) => {
      const depOk = !departure || r.departure?.trim() === departure.trim();
      const destOk = !destination || r.destination?.trim() === destination.trim();
      const dateOk = (!from || (r.date || '') >= from) && (!to || (r.date || '') <= to);
      return depOk && destOk && dateOk;
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
};

// Live feed of a single user's published rides (server-side filtered).
export const subscribeUserRides = (uid, callback) =>
  onValue(query(listRef(), orderByChild('localId'), equalTo(uid)), (snap) => {
    const rides = toArray(snap).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    callback(rides);
  });

export const cancelRide = (id) =>
  update(rideRef(id), { status: RIDE_STATUS.CANCELLED, cancelledAt: new Date().toISOString() });

export const completeRide = (id) =>
  update(rideRef(id), { status: RIDE_STATUS.COMPLETED, completedAt: new Date().toISOString() });

export const getUserRideStats = async (uid) => {
  const snap = await get(query(listRef(), orderByChild('localId'), equalTo(uid)));
  const stats = { publishedRides: 0, completedRides: 0, activeRides: 0, cancelledRides: 0 };
  if (!snap.exists()) return stats;
  Object.values(snap.val()).forEach((ride) => {
    stats.publishedRides += 1;
    const past = ride.date && ride.date < todayISO();
    if (ride.status === RIDE_STATUS.COMPLETED || past) stats.completedRides += 1;
    else if (ride.status === RIDE_STATUS.CANCELLED) stats.cancelledRides += 1;
    else stats.activeRides += 1;
  });
  return stats;
};
