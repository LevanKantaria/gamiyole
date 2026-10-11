import {
  ref,
  push,
  set,
  remove,
  onValue,
  query,
  orderByChild,
  startAt,
} from 'firebase/database';
import { db } from '../firebase';
import { todayISO } from './rides';

// A ride request is a passenger saying "I want to travel this route between
// these dates" so drivers can see demand and publish a matching ride.
// Stored flat in `requests` and readable by any signed-in member. Same model
// and rules as the web app.
const requestsRef = () => ref(db, 'requests');
const externalRequestsRef = () => ref(db, 'externalRequests');
const requestRef = (id) => ref(db, `requests/${id}`);

const toArray = (snap) =>
  snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : [];

export const createRequest = async (uid, { name, from, to, dateFrom, dateTo, note }) => {
  const newRef = push(requestsRef());
  await set(newRef, {
    passengerUid: uid,
    name: name || 'Passenger',
    from,
    to,
    dateFrom,
    dateTo,
    note: (note || '').trim(),
    createdAt: new Date().toISOString(),
  });
  return newRef.key;
};

export const deleteRequest = (id) => remove(requestRef(id));

// Live board of upcoming requests (window not fully passed), soonest first.
export const subscribeRequests = (callback) => {
  const q = query(requestsRef(), orderByChild('dateTo'), startAt(todayISO()));
  return onValue(
    q,
    (snap) =>
      callback(
        toArray(snap).sort((a, b) => (a.dateFrom || '').localeCompare(b.dateFrom || ''))
      ),
    () => callback([])
  );
};

export const subscribeExternalRequests = (callback) => {
  const q = query(externalRequestsRef(), orderByChild('dateTo'), startAt(todayISO()));
  return onValue(q, (snap) => callback(toArray(snap)), () => callback([]));
};
