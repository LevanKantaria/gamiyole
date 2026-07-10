import { ref, get, set, remove } from "firebase/database";
import { db } from "../firebase";

// Admin-granted "Verified" status lives at verified/{uid}: true — public read
// (so the badge shows on public ride cards, even to logged-out visitors),
// admin-only write. Kept separate from the profile so it can't be self-set.

// The whole verified set is small and changes rarely, so we fetch it once per
// session and answer badge lookups from memory instead of a read per card.
let cache = null;

export const getVerifiedSet = () => {
  if (!cache) {
    cache = get(ref(db, "verified"))
      .then((snap) => new Set(snap.exists() ? Object.keys(snap.val()) : []))
      .catch(() => new Set());
  }
  return cache;
};

export const isVerified = async (uid) => (uid ? (await getVerifiedSet()).has(uid) : false);

const invalidate = () => {
  cache = null;
};

export const verifyUser = async (uid) => {
  await set(ref(db, `verified/${uid}`), true);
  invalidate();
};

export const unverifyUser = async (uid) => {
  await remove(ref(db, `verified/${uid}`));
  invalidate();
};
