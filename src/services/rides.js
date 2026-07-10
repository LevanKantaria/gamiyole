import {
  ref,
  push,
  set,
  get,
  update,
  remove,
  onValue,
  query,
  orderByChild,
  startAt,
  endAt,
  equalTo,
} from "firebase/database";
import { db } from "../firebase";

// The live feed only loads the next two weeks — routines materialize months of
// rides upfront, and fetching all of them on every page load would be wasteful.
// Exact-date searches beyond the window fetch just that date (getRidesForDate).
export const FEED_WINDOW_DAYS = 14;

export const RIDE_STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

const listRef = () => ref(db, "list");
const rideRef = (id) => ref(db, `list/${id}`);

const toArray = (snap) =>
  snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : [];

// Seats still bookable, tolerant of old records that only had `seats`.
export const seatsLeft = (ride) => {
  if (typeof ride.seatsAvailable === "number") return ride.seatsAvailable;
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
    // Optional fields — Firebase rejects undefined values in set(), so only
    // include them when present. arrivalTime is only sent by the Expo app.
    ...(form.arrivalTime ? { arrivalTime: form.arrivalTime } : {}),
    ...(form.badges?.length ? { badges: form.badges } : {}),
    ...(form.comment?.trim() ? { comment: form.comment.trim() } : {}),
    ...(form.rideType === "bus" ? { rideType: "bus" } : {}),
    price: form.price,
    seats: form.seats,
    seatsAvailable: totalSeats,
    localId: driverUid,
    name,
    number: number || "Not provided",
    status: RIDE_STATUS.ACTIVE,
    createdAt: new Date().toISOString(),
  });
  return newRef.key;
};

// Live feed of upcoming, active rides (today up to FEED_WINDOW_DAYS ahead).
export const subscribeUpcomingRides = (callback) => {
  const q = query(
    listRef(),
    orderByChild("date"),
    startAt(todayISO()),
    endAt(plusDaysISO(FEED_WINDOW_DAYS))
  );
  return onValue(
    q,
    (snap) => {
      const rides = toArray(snap)
        .filter((r) => r.status !== RIDE_STATUS.CANCELLED)
        .sort(
          (a, b) =>
            (a.date || "").localeCompare(b.date || "") ||
            (a.departureTime || "").localeCompare(b.departureTime || "")
        );
      callback(rides);
    },
    () => callback([]) // e.g. permission denied — show the empty state, not a stuck spinner
  );
};

const plusDaysISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// One-off fetch for a specific date — used when searching beyond the feed window.
export const getRidesForDate = async (date) => {
  const snap = await get(query(listRef(), orderByChild("date"), equalTo(date)));
  return toArray(snap)
    .filter((r) => r.status !== RIDE_STATUS.CANCELLED)
    .sort((a, b) => (a.departureTime || "").localeCompare(b.departureTime || ""));
};

// "when" is a flexible date filter: any | today | tomorrow | week | date.
export const dateRangeFor = (when, date) => {
  switch (when) {
    case "today":
      return [todayISO(), todayISO()];
    case "tomorrow":
      return [plusDaysISO(1), plusDaysISO(1)];
    case "week":
      return [todayISO(), plusDaysISO(7)];
    case "date":
      return date ? [date, date] : [null, null];
    default:
      return [null, null];
  }
};

// Rides without a rideType are carpools (the field was added later).
export const rideTypeOf = (ride) => (ride.rideType === "bus" ? "bus" : "carpool");
export const isFreeRide = (ride) => Number(ride.price) === 0;

export const filterRides = (rides, { departure, destination, when, date, type, priceMode }) => {
  const [from, to] = dateRangeFor(when, date);
  return rides.filter((r) => {
    const depOk = !departure || r.departure?.trim() === departure.trim();
    const destOk = !destination || r.destination?.trim() === destination.trim();
    const dateOk = (!from || (r.date || "") >= from) && (!to || (r.date || "") <= to);
    // Facebook-sourced listings carry a route/date but no confirmed price, so
    // they only show under "any price" — never under an explicit free/paid pick.
    const external = r.source === "facebook";
    const typeOk = !type || rideTypeOf(r) === type;
    const priceOk = external
      ? !priceMode
      : !priceMode || (priceMode === "free" ? isFreeRide(r) : !isFreeRide(r));
    return depOk && destOk && dateOk && typeOk && priceOk;
  });
};

export const getUserRides = async (uid) => {
  const snap = await get(query(listRef(), orderByChild("localId"), equalTo(uid)));
  return toArray(snap)
    .filter((r) => r.status !== RIDE_STATUS.CANCELLED)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
};

export const cancelRide = (id) =>
  update(rideRef(id), {
    status: RIDE_STATUS.CANCELLED,
    cancelledAt: new Date().toISOString(),
  });

export const deleteRide = (id) => remove(rideRef(id));
