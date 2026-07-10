import { ref, set, get, onValue } from 'firebase/database';
import { db } from '../firebase';

const userRatingsRef = (uid) => ref(db, `ratings/${uid}`);
const ratingRef = (targetUid, raterUid) => ref(db, `ratings/${targetUid}/${raterUid}`);
const legacyCommentsRef = (uid) => ref(db, `comments/${uid}`);

// One rating per rater (keyed by rater uid) so people can't spam reviews.
export const submitRating = (targetUid, rater, { rating, comment }) =>
  set(ratingRef(targetUid, rater.uid), {
    rating,
    comment: comment.trim(),
    ratedBy: rater.uid,
    ratedByName: rater.name,
    createdAt: new Date().toISOString(),
  });

// Normalizes both the current shape ({ rating }) and the legacy web shape
// ({ ratingValue, sender }) so old reviews count the same as on the web app.
const normalize = (raterUid, r) => ({
  rating: typeof r.rating === 'number' ? r.rating : typeof r.ratingValue === 'number' ? r.ratingValue : null,
  comment: r.comment || '',
  ratedBy: r.ratedBy || r.sender || raterUid,
  ratedByName: r.ratedByName || '',
  createdAt: r.createdAt || null,
});

const summarize = (snap) => {
  if (!snap.exists()) return { average: 0, count: 0, reviews: [] };
  const entries = Object.entries(snap.val()).map(([k, r]) => normalize(k, r));
  const rated = entries.filter((r) => typeof r.rating === 'number' && r.rating > 0);
  const count = rated.length;
  const average = count ? +(rated.reduce((a, b) => a + b.rating, 0) / count).toFixed(1) : 0;
  const reviews = entries
    .filter((r) => r.comment)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { average, count, reviews };
};

export const getRatingSummary = async (uid) => summarize(await get(userRatingsRef(uid)));

export const subscribeRatingSummary = (uid, callback) =>
  onValue(userRatingsRef(uid), (snap) => callback(summarize(snap)));

export const getMyRatingFor = async (targetUid, raterUid) => {
  const snap = await get(ratingRef(targetUid, raterUid));
  return snap.exists() ? snap.val() : null;
};

// Free-text comments written by the old web app (read-only display).
export const getLegacyComments = async (uid) => {
  const snap = await get(legacyCommentsRef(uid));
  if (!snap.exists()) return [];
  return Object.values(snap.val())
    .filter((c) => c.comment)
    .map((c) => ({
      rating: null,
      comment: c.comment,
      ratedBy: c.sender || '',
      ratedByName: c.name || '',
      createdAt: null,
    }));
};
