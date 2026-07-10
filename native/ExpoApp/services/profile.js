import { ref, get, set, update, onValue } from 'firebase/database';
import { db } from '../firebase';

const profileRef = (uid) => ref(db, `profile/${uid}`);
const profileImageRef = (uid) => ref(db, `pictures/profile/${uid}`);
const carPhotosRef = (uid) => ref(db, `pictures/car/${uid}`);

export const getProfile = async (uid) => {
  const snap = await get(profileRef(uid));
  return snap.exists() ? snap.val() : null;
};

// Subscribe to a user's full profile (data + images). Returns an unsubscribe fn.
export const subscribeProfile = (uid, callback) => {
  const unsubscribers = [];
  let data = {};
  let image = null;
  let carPhotos = [];

  const emit = () => callback({ ...data, image, carPhotos });

  unsubscribers.push(
    onValue(profileRef(uid), (snap) => {
      data = snap.exists() ? snap.val() : {};
      emit();
    })
  );
  unsubscribers.push(
    onValue(profileImageRef(uid), (snap) => {
      image = snap.exists() ? snap.val() : null;
      emit();
    })
  );
  unsubscribers.push(
    onValue(carPhotosRef(uid), (snap) => {
      carPhotos = snap.exists() ? Object.values(snap.val()).filter(Boolean) : [];
      emit();
    })
  );

  return () => unsubscribers.forEach((u) => u());
};

export const saveProfile = (uid, data) =>
  update(profileRef(uid), { ...data, updatedAt: new Date().toISOString() });

export const createInitialProfile = (uid, { email, name = '' }) =>
  set(profileRef(uid), {
    email,
    name,
    aboutMe: '',
    number: '',
    model: '',
    plate: '',
    age: '',
    userType: 'passenger',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

export const setProfileImage = (uid, url) => set(profileImageRef(uid), url);

export const setCarPhotos = (uid, urls) => {
  const obj = {};
  urls.forEach((url, i) => {
    obj[i] = url;
  });
  return set(carPhotosRef(uid), obj);
};

export const getCarPhotos = async (uid) => {
  const snap = await get(carPhotosRef(uid));
  return snap.exists() ? Object.values(snap.val()).filter(Boolean) : [];
};

export const getProfileImage = async (uid) => {
  const snap = await get(profileImageRef(uid));
  return snap.exists() ? snap.val() : null;
};

export const isProfileComplete = (profile) =>
  !!(profile?.name && profile.name.trim() && profile?.aboutMe && profile.aboutMe.trim());

// Turns whatever the user typed (URL, "facebook.com/name", "@name", "name")
// into a full Facebook URL, or "" if empty. Lenient by design. Shared logic
// with the web app (src/services/profile.js).
export const normalizeFacebookUrl = (raw) => {
  const v = (raw || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (/(facebook|fb)\.com/i.test(v)) return `https://${v.replace(/^\/+/, '')}`;
  return `https://facebook.com/${v.replace(/^@/, '')}`;
};
