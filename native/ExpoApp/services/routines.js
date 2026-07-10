import {
  ref,
  get,
  set,
  push,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
} from 'firebase/database';
import { db } from '../firebase';
import { RIDE_STATUS } from './rides';

// A routine is a weekly repeating route (e.g. Tbilisi→Gori every Mon/Wed 08:00)
// with a driver-chosen end date (1–3 months out). ALL instances in that range
// are materialized upfront in a single multi-path update when the routine is
// created or resumed — no scheduler or Cloud Function needed. Instance keys
// are deterministic (r_<routineId>_<date>), so re-running never duplicates a
// ride and an individually cancelled instance stays cancelled.
//
// Pausing cancels the routine's future instances (they already exist);
// resuming reactivates them, so passengers' bookings survive a pause/resume.
// Same model as the web app.

const MAX_RANGE_DAYS = 95; // hard cap: a bit over 3 months

const pad = (n) => String(n).padStart(2, '0');
const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const nowHHMM = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const addMonthsISO = (months) => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return localISO(d);
};

const routinesRef = (uid) => ref(db, `routines/${uid}`);
const routineRef = (uid, id) => ref(db, `routines/${uid}/${id}`);
const myRidesQuery = (uid) => query(ref(db, 'list'), orderByChild('localId'), equalTo(uid));

export const getRoutines = async (uid) => {
  const snap = await get(routinesRef(uid));
  return snap.exists() ? Object.entries(snap.val()).map(([id, r]) => ({ id, ...r })) : [];
};

export const createRoutine = async (uid, data) => {
  const newRef = push(routinesRef(uid));
  await set(newRef, { ...data, active: true, createdAt: new Date().toISOString() });
  return newRef.key;
};

const buildInstance = (uid, { name, number }, routineId, routine, date) => ({
  departure: routine.departure,
  destination: routine.destination,
  date,
  departureTime: routine.departureTime,
  ...(routine.badges?.length ? { badges: routine.badges } : {}),
  ...(routine.comment ? { comment: routine.comment } : {}),
  ...(routine.rideType === 'bus' ? { rideType: 'bus' } : {}),
  price: routine.price,
  seats: routine.seats,
  seatsAvailable: parseInt(routine.seats, 10) || 0,
  localId: uid,
  name,
  number: number || 'Not provided',
  status: RIDE_STATUS.ACTIVE,
  routineId,
  createdAt: new Date().toISOString(),
});

// Writes every missing instance up to each routine's end date. Returns the
// number of rides created. One update() call regardless of how many rides.
export const materializeRoutines = async (uid, profile, onlyRoutineId = null) => {
  const [routinesSnap, suspendedSnap] = await Promise.all([
    get(routinesRef(uid)),
    get(ref(db, `disabledDrivers/${uid}`)).catch(() => null),
  ]);
  if (!routinesSnap.exists() || suspendedSnap?.exists()) return 0;

  const myRidesSnap = await get(myRidesQuery(uid));
  const existingKeys = new Set(myRidesSnap.exists() ? Object.keys(myRidesSnap.val()) : []);

  const updates = {};
  const today = localISO(new Date());
  Object.entries(routinesSnap.val()).forEach(([routineId, routine]) => {
    if (onlyRoutineId && routineId !== onlyRoutineId) return;
    if (!routine.active) return;
    const endDate = routine.endDate || addMonthsISO(1);

    const cursor = new Date();
    for (let i = 0; i < MAX_RANGE_DAYS; i += 1) {
      const date = localISO(cursor);
      if (date > endDate) break;
      const isSelectedDay = (routine.days || []).includes(cursor.getDay());
      const departedAlready = date === today && routine.departureTime <= nowHHMM();
      const rideKey = `r_${routineId}_${date}`;
      if (isSelectedDay && !departedAlready && !existingKeys.has(rideKey)) {
        updates[rideKey] = buildInstance(uid, profile, routineId, routine, date);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  const count = Object.keys(updates).length;
  if (count) await update(ref(db, 'list'), updates);
  return count;
};

// Status flips for a routine's future instances, batched into one update().
const setFutureInstancesStatus = async (uid, routineId, fromStatus, toStatus) => {
  const snap = await get(myRidesQuery(uid));
  if (!snap.exists()) return;
  const today = localISO(new Date());
  const updates = {};
  Object.entries(snap.val()).forEach(([id, r]) => {
    if (r.routineId === routineId && (r.date || '') >= today && r.status === fromStatus) {
      updates[`${id}/status`] = toStatus;
      updates[`${id}/${toStatus === RIDE_STATUS.CANCELLED ? 'cancelledAt' : 'resumedAt'}`] =
        new Date().toISOString();
    }
  });
  if (Object.keys(updates).length) await update(ref(db, 'list'), updates);
};

export const pauseRoutine = async (uid, routineId) => {
  await update(routineRef(uid, routineId), { active: false });
  await setFutureInstancesStatus(uid, routineId, RIDE_STATUS.ACTIVE, RIDE_STATUS.CANCELLED);
};

// Reactivates previously cancelled instances (bookings on them become valid
// again) and fills any missing dates up to the routine's end date.
export const resumeRoutine = async (uid, routineId, profile) => {
  await update(routineRef(uid, routineId), { active: true });
  await setFutureInstancesStatus(uid, routineId, RIDE_STATUS.CANCELLED, RIDE_STATUS.ACTIVE);
  await materializeRoutines(uid, profile, routineId);
};

// Deleting a routine also cancels its upcoming rides (past ones are history).
export const deleteRoutine = async (uid, routineId) => {
  await remove(routineRef(uid, routineId));
  await setFutureInstancesStatus(uid, routineId, RIDE_STATUS.ACTIVE, RIDE_STATUS.CANCELLED);
};
