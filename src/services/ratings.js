import { ref, set, get, onValue, remove } from "firebase/database";
import { db } from "../firebase";

const userRatingsRef = (uid) => ref(db, `ratings/${uid}`);
const ratingRef = (targetUid, raterUid) => ref(db, `ratings/${targetUid}/${raterUid}`);
const legacyCommentsRef = (uid) => ref(db, `comments/${uid}`);

// One review per rater (keyed by rater uid) so people can't spam reviews.
// Same shape as the Expo app: { rating, comment, ratedBy, ratedByName, createdAt }.
export const submitRating = (targetUid, rater, { rating, comment }) =>
  set(ratingRef(targetUid, rater.uid), {
    rating,
    comment: (comment || "").trim(),
    ratedBy: rater.uid,
    ratedByName: rater.name || "User",
    createdAt: new Date().toISOString(),
  });

export const deleteRating = (targetUid, raterUid) =>
  remove(ratingRef(targetUid, raterUid));

// Normalizes both the new shape ({ rating }) and the legacy web shape
// ({ ratingValue, sender }) that older records still use.
const normalize = (raterUid, r) => ({
  key: raterUid,
  rating: typeof r.rating === "number" ? r.rating : r.ratingValue ?? null,
  comment: r.comment || "",
  ratedBy: r.ratedBy || r.sender || raterUid,
  ratedByName: r.ratedByName || "",
  createdAt: r.createdAt || null,
});

export const summarize = (val) => {
  if (!val) return { average: 0, count: 0, reviews: [] };
  const entries = Object.entries(val).map(([k, r]) => normalize(k, r));
  const rated = entries.filter((r) => typeof r.rating === "number" && r.rating > 0);
  const count = rated.length;
  const average = count
    ? +(rated.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1)
    : 0;
  const reviews = entries
    .filter((r) => r.comment || r.rating)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return { average, count, reviews };
};

export const getRatingSummary = async (uid) => {
  const snap = await get(userRatingsRef(uid));
  return summarize(snap.exists() ? snap.val() : null);
};

export const subscribeRatingSummary = (uid, callback) =>
  onValue(
    userRatingsRef(uid),
    (snap) => callback(summarize(snap.exists() ? snap.val() : null)),
    () => callback(summarize(null))
  );

export const getMyRatingFor = async (targetUid, raterUid) => {
  const snap = await get(ratingRef(targetUid, raterUid));
  return snap.exists() ? normalize(raterUid, snap.val()) : null;
};

// Legacy free-text comments written by the old web app (read-only display).
export const getLegacyComments = async (uid) => {
  const snap = await get(legacyCommentsRef(uid));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([key, c]) => ({
    key,
    legacy: true,
    rating: null,
    comment: c.comment || "",
    ratedBy: c.sender || "",
    ratedByName: c.name || "",
    createdAt: null,
  }));
};

export const deleteLegacyComment = (uid, key) =>
  remove(ref(db, `comments/${uid}/${key}`));
