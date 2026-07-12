// Gamiyole push notifications (Firebase Cloud Functions, gen 2).
//
// Sends Expo push notifications on four events:
//   1. A ride is published that matches an open ride-request  → notify passenger
//   2. A seat is booked on a ride                             → notify driver
//   3. A ride is cancelled                                    → notify booked passengers
//   4. A member receives a review                             → notify that member
//
// Push tokens are registered by the Expo app at pushTokens/{uid}. Delivery uses
// Expo's push service (no secret needed). Deploy: `firebase deploy --only functions`.

import { onValueCreated, onValueUpdated } from 'firebase-functions/v2/database';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';

initializeApp();
const db = getDatabase();

// The Realtime Database lives in europe-west1; triggers must target it.
const DB = { instance: 'react-http-7efc4-default-rtdb', region: 'europe-west1' };

const RIDE_STATUS = { ACTIVE: 'active', CANCELLED: 'cancelled' };

// --- Expo push delivery -----------------------------------------------------

const isExpoToken = (t) => typeof t === 'string' && t.startsWith('ExponentPushToken');

// Reads a user's registered push tokens (stored as { pushId: token } or a bare
// string) and returns a de-duplicated array of valid Expo tokens.
async function getTokens(uid) {
  if (!uid) return [];
  const snap = await db.ref(`pushTokens/${uid}`).get();
  if (!snap.exists()) return [];
  const val = snap.val();
  const tokens = typeof val === 'string' ? [val] : Object.values(val);
  return [...new Set(tokens.filter(isExpoToken))];
}

// Respects the recipient's per-type notification preference (default: enabled).
// The type is carried on data.type ('ride' | 'booking' | 'cancellation' | 'review').
async function prefAllows(uid, type) {
  if (!type) return true;
  const snap = await db.ref(`notificationPrefs/${uid}/${type}`).get();
  return snap.val() !== false;
}

async function sendPush(uid, { title, body, data }) {
  if (!(await prefAllows(uid, data?.type))) return;
  const tokens = await getTokens(uid);
  if (!tokens.length) return;
  const messages = tokens.map((to) => ({ to, sound: 'default', title, body, data: data || {} }));
  // Expo accepts up to 100 messages per request.
  for (let i = 0; i < messages.length; i += 100) {
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages.slice(i, i + 100)),
      });
    } catch (err) {
      console.error('Expo push failed', err);
    }
  }
}

const routeText = (from, to) => `${from} → ${to}`;

// --- 1. Matching ride published --------------------------------------------

export const onRidePublished = onValueCreated(
  { ref: '/list/{rideId}', ...DB },
  async (event) => {
    const ride = event.data.val();
    if (!ride || ride.status !== RIDE_STATUS.ACTIVE) return;

    const today = new Date().toISOString().slice(0, 10);
    const reqSnap = await db.ref('requests').get();
    if (!reqSnap.exists()) return;

    const tasks = [];
    Object.entries(reqSnap.val()).forEach(([reqId, req]) => {
      if (req.passengerUid === ride.localId) return; // don't notify about your own ride
      const routeMatch = req.from === ride.departure && req.to === ride.destination;
      const dateMatch = (req.dateFrom || '') <= ride.date && ride.date <= (req.dateTo || '');
      const notExpired = (req.dateTo || '') >= today;
      const routeKey = `${ride.departure}_${ride.destination}`;
      const alreadyNotified = req.notified && req.notified[routeKey];
      if (routeMatch && dateMatch && notExpired && !alreadyNotified) {
        // Dedupe so a routine that materializes many rides notifies only once
        // per passenger per route.
        tasks.push(db.ref(`requests/${reqId}/notified/${routeKey}`).set(true));
        tasks.push(
          sendPush(req.passengerUid, {
            title: 'A ride matches your request',
            body: `${ride.name || 'A driver'} posted ${routeText(ride.departure, ride.destination)}. Tap to view.`,
            data: { type: 'ride', rideId: event.params.rideId, from: ride.departure, to: ride.destination },
          })
        );
      }
    });
    await Promise.all(tasks);
  }
);

// --- 2. Seat booked → notify driver ----------------------------------------

export const onSeatBooked = onValueCreated(
  { ref: '/bookings/{rideId}/{passengerUid}', ...DB },
  async (event) => {
    const booking = event.data.val();
    if (!booking || booking.status !== 'confirmed') return;

    const rideSnap = await db.ref(`list/${event.params.rideId}`).get();
    if (!rideSnap.exists()) return;
    const ride = rideSnap.val();
    if (!ride.localId || ride.localId === booking.passengerUid) return;

    await sendPush(ride.localId, {
      title: 'New booking',
      body: `${booking.passengerName || 'A passenger'} booked a seat on your ${routeText(ride.departure, ride.destination)} ride.`,
      data: { type: 'booking', rideId: event.params.rideId },
    });
  }
);

// --- 3. Ride cancelled → notify booked passengers --------------------------

export const onRideCancelled = onValueUpdated(
  { ref: '/list/{rideId}', ...DB },
  async (event) => {
    const before = event.data.before.val();
    const after = event.data.after.val();
    if (!before || !after) return;
    if (before.status === RIDE_STATUS.CANCELLED || after.status !== RIDE_STATUS.CANCELLED) return;

    const bookingsSnap = await db.ref(`bookings/${event.params.rideId}`).get();
    if (!bookingsSnap.exists()) return;

    const tasks = Object.values(bookingsSnap.val())
      .filter((b) => b.status === 'confirmed')
      .map((b) =>
        sendPush(b.passengerUid, {
          title: 'Ride cancelled',
          body: `Your ${routeText(after.departure, after.destination)} ride on ${after.date} was cancelled by the driver.`,
          data: { type: 'cancellation', rideId: event.params.rideId },
        })
      );
    await Promise.all(tasks);
  }
);

// --- 4. New review → notify the reviewed member ----------------------------

export const onReviewReceived = onValueCreated(
  { ref: '/ratings/{targetUid}/{raterUid}', ...DB },
  async (event) => {
    const review = event.data.val();
    if (!review || event.params.targetUid === event.params.raterUid) return;

    await sendPush(event.params.targetUid, {
      title: 'New review',
      body: `${review.ratedByName || 'Someone'} left you a review${review.rating ? ` (${review.rating}★)` : ''}.`,
      data: { type: 'review', targetUid: event.params.targetUid },
    });
  }
);

// --- Account deletion (App Store guideline 5.1.1(v)) ------------------------
// Callable that erases the signed-in user's data and their auth account. Runs
// with admin privileges so it bypasses security rules and doesn't need a recent
// re-login on the client. The app calls this, then signs out.
export const deleteAccount = onCall({ region: 'europe-west1' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'You must be signed in.');

  const updates = {};
  // Owner-keyed nodes.
  for (const path of [
    `profile/${uid}`, `pictures/profile/${uid}`, `pictures/car/${uid}`,
    `routines/${uid}`, `userBookings/${uid}`, `pushTokens/${uid}`,
    `notificationPrefs/${uid}`, `verified/${uid}`, `disabledDrivers/${uid}`,
    `comments/${uid}`, `ratings/${uid}`,
  ]) {
    updates[path] = null;
  }

  // Their published rides (and the bookings placed on them).
  const rides = await db.ref('list').orderByChild('localId').equalTo(uid).once('value');
  rides.forEach((c) => {
    updates[`list/${c.key}`] = null;
    updates[`bookings/${c.key}`] = null;
  });

  // Their ride requests.
  const reqs = await db.ref('requests').orderByChild('passengerUid').equalTo(uid).once('value');
  reqs.forEach((c) => {
    updates[`requests/${c.key}`] = null;
  });

  // Reviews they wrote about others, and their bookings on others' rides.
  const ratings = await db.ref('ratings').once('value');
  ratings.forEach((subject) => {
    if (subject.hasChild(uid)) updates[`ratings/${subject.key}/${uid}`] = null;
  });
  const bookings = await db.ref('bookings').once('value');
  bookings.forEach((ride) => {
    if (ride.hasChild(uid)) updates[`bookings/${ride.key}/${uid}`] = null;
  });

  if (Object.keys(updates).length) await db.ref().update(updates);

  // Finally remove the auth account itself.
  await getAuth().deleteUser(uid);
  return { ok: true };
});
