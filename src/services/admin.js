import { ref, get, set, remove } from "firebase/database";
import { db } from "../firebase";
import { summarize } from "./ratings";
import { RIDE_STATUS, todayISO } from "./rides";

// Admin uids live under /admins/{uid}: true and are managed from the Firebase
// console; database rules enforce every admin action server-side.
export const checkIsAdmin = async (uid) => {
  if (!uid) return false;
  try {
    const snap = await get(ref(db, `admins/${uid}`));
    return snap.exists() && snap.val() === true;
  } catch {
    return false;
  }
};

export const suspendDriver = (uid, adminUid) =>
  set(ref(db, `disabledDrivers/${uid}`), {
    disabledAt: new Date().toISOString(),
    disabledBy: adminUid,
  });

export const restoreDriver = (uid) => remove(ref(db, `disabledDrivers/${uid}`));

export const getDisabledDrivers = async () => {
  const snap = await get(ref(db, "disabledDrivers"));
  return snap.exists() ? snap.val() : {};
};

// One combined snapshot for the admin dashboard: every profile joined with
// avatar, rating summary, ride counts and suspension status.
export const getAdminOverview = async () => {
  const [profilesSnap, picturesSnap, ratingsSnap, ridesSnap, disabledSnap, verifiedSnap] =
    await Promise.all([
      get(ref(db, "profile")),
      get(ref(db, "pictures/profile")),
      get(ref(db, "ratings")),
      get(ref(db, "list")),
      get(ref(db, "disabledDrivers")),
      get(ref(db, "verified")),
    ]);

  const profiles = profilesSnap.exists() ? profilesSnap.val() : {};
  const pictures = picturesSnap.exists() ? picturesSnap.val() : {};
  const ratings = ratingsSnap.exists() ? ratingsSnap.val() : {};
  const ridesVal = ridesSnap.exists() ? ridesSnap.val() : {};
  const disabled = disabledSnap.exists() ? disabledSnap.val() : {};
  const verified = verifiedSnap.exists() ? verifiedSnap.val() : {};

  const rideCounts = {};
  const rides = Object.entries(ridesVal).map(([id, r]) => ({ id, ...r }));
  rides.forEach((r) => {
    if (r.localId) rideCounts[r.localId] = (rideCounts[r.localId] || 0) + 1;
  });

  const users = Object.entries(profiles).map(([uid, p]) => ({
    uid,
    name: p.name || "",
    email: p.email || "",
    number: p.number || "",
    userType: p.userType || (p.model ? "driver" : "passenger"),
    model: p.model || "",
    createdAt: p.createdAt || null,
    avatar: pictures[uid] || null,
    ratingSummary: summarize(ratings[uid]),
    rideCount: rideCounts[uid] || 0,
    suspended: !!disabled[uid],
    suspendedAt: disabled[uid]?.disabledAt || null,
    verified: verified[uid] === true,
  }));

  const activeRides = rides
    .filter((r) => r.status !== RIDE_STATUS.CANCELLED && (r.date || "") >= todayISO())
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  return { users, activeRides };
};
