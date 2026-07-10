import { ref, get, set, update, onValue } from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "../firebase";

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
  let data = null;
  let image = null;
  let carPhotos = [];
  let loadedData = false;

  const emit = () => {
    if (!loadedData) return;
    callback({ ...(data || {}), exists: data !== null, image, carPhotos });
  };

  unsubscribers.push(
    onValue(
      profileRef(uid),
      (snap) => {
        data = snap.exists() ? snap.val() : null;
        loadedData = true;
        emit();
      },
      () => {
        loadedData = true;
        emit();
      }
    )
  );
  unsubscribers.push(
    onValue(
      profileImageRef(uid),
      (snap) => {
        image = snap.exists() ? snap.val() : null;
        emit();
      },
      () => {}
    )
  );
  unsubscribers.push(
    onValue(
      carPhotosRef(uid),
      (snap) => {
        carPhotos = snap.exists() ? Object.values(snap.val()).filter(Boolean) : [];
        emit();
      },
      () => {}
    )
  );

  return () => unsubscribers.forEach((u) => u());
};

// update() rather than set() so fields like email/createdAt are never dropped.
export const saveProfile = (uid, data) =>
  update(profileRef(uid), { ...data, updatedAt: new Date().toISOString() });

export const createInitialProfile = (uid, { email, name = "" }) =>
  set(profileRef(uid), {
    email,
    name,
    aboutMe: "",
    number: "",
    model: "",
    plate: "",
    age: "",
    userType: "passenger",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

export const getProfileImage = async (uid) => {
  const snap = await get(profileImageRef(uid));
  return snap.exists() ? snap.val() : null;
};

export const isProfileComplete = (profile) =>
  !!(profile?.name && profile.name.trim() && profile?.aboutMe && profile.aboutMe.trim());

// Turns whatever the user typed (URL, "facebook.com/name", "@name", "name")
// into a full Facebook URL, or "" if empty. Lenient by design.
export const normalizeFacebookUrl = (raw) => {
  const v = (raw || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (/(facebook|fb)\.com/i.test(v)) return `https://${v.replace(/^\/+/, "")}`;
  return `https://facebook.com/${v.replace(/^@/, "")}`;
};

// Storage paths match storage.rules and the Expo app.
export const uploadProfileImage = async (uid, file) => {
  const fileRef = storageRef(storage, `profileImages/${uid}.jpg`);
  await uploadBytes(fileRef, file, { contentType: file.type || "image/jpeg" });
  const url = await getDownloadURL(fileRef);
  await set(profileImageRef(uid), url);
  return url;
};

export const uploadCarPhoto = async (uid, file, existingPhotos) => {
  const fileRef = storageRef(
    storage,
    `carImages/${uid}/${Date.now()}-${Math.floor(Math.random() * 1e6)}.jpg`
  );
  await uploadBytes(fileRef, file, { contentType: file.type || "image/jpeg" });
  const url = await getDownloadURL(fileRef);
  const urls = [...existingPhotos, url];
  const obj = {};
  urls.forEach((u, i) => {
    obj[i] = u;
  });
  await set(carPhotosRef(uid), obj);
  return urls;
};

export const removeCarPhoto = async (uid, existingPhotos, index) => {
  const urls = existingPhotos.filter((_, i) => i !== index);
  const obj = {};
  urls.forEach((u, i) => {
    obj[i] = u;
  });
  await set(carPhotosRef(uid), obj);
  return urls;
};
