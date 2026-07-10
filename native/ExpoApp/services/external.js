import {
  ref,
  get,
  remove,
  onValue,
  query,
  orderByChild,
  startAt,
  endAt,
  equalTo,
} from 'firebase/database';
import { db } from '../firebase';
import { todayISO, FEED_WINDOW_DAYS } from './rides';

// External rides are ride offers scraped from public Facebook groups by the
// fb-group-monitor pipeline and promoted into RTDB (admin-SDK write only). They
// keep the feed from ever looking dormant. We store NO personal data — just the
// route, date/time, and a link back to the original post where contact happens.
// The record reuses real-ride field names (departure/destination/date/…) so it
// flows through the feed unchanged; only the card rendering differs (source).

const externalRef = () => ref(db, 'externalRides');

const toArray = (snap) =>
  snap.exists()
    ? Object.entries(snap.val()).map(([id, v]) => ({ id, source: 'facebook', ...v }))
    : [];

const plusDaysISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const sortByDateTime = (a, b) =>
  (a.date || '').localeCompare(b.date || '') ||
  (a.departureTime || '').localeCompare(b.departureTime || '');

export const isExternalRide = (ride) => ride?.source === 'facebook';

// Live feed of upcoming external rides (today up to FEED_WINDOW_DAYS ahead),
// mirroring subscribeUpcomingRides so the two streams merge cleanly.
export const subscribeExternalRides = (callback) => {
  const q = query(
    externalRef(),
    orderByChild('date'),
    startAt(todayISO()),
    endAt(plusDaysISO(FEED_WINDOW_DAYS))
  );
  return onValue(
    q,
    (snap) => callback(toArray(snap).sort(sortByDateTime)),
    () => callback([]) // permission/offline — never block the real feed
  );
};

export const getExternalRidesForDate = async (date) => {
  const snap = await get(query(externalRef(), orderByChild('date'), equalTo(date)));
  return toArray(snap).sort(sortByDateTime);
};

export const deleteExternalRide = (id) => remove(ref(db, `externalRides/${id}`));
