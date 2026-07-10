import { ref, get } from 'firebase/database';
import { db } from '../firebase';

// Admin-granted "Verified" status lives at verified/{uid}: true (public read,
// admin-only write — set from the web admin panel). The native app only reads
// it to show the badge. The whole set is small and changes rarely, so it's
// fetched once per session and answered from memory.
let cache = null;

export const getVerifiedSet = () => {
  if (!cache) {
    cache = get(ref(db, 'verified'))
      .then((snap) => new Set(snap.exists() ? Object.keys(snap.val()) : []))
      .catch(() => new Set());
  }
  return cache;
};

export const isVerified = async (uid) => (uid ? (await getVerifiedSet()).has(uid) : false);
