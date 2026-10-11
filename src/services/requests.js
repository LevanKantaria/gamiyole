import {
  ref,
  push,
  set,
  remove,
  onValue,
  query,
  orderByChild,
  startAt,
} from "firebase/database";
import { db } from "../firebase";
import { todayISO, dateRangeFor } from "./rides";

// A ride request is a passenger saying "I want to travel this route between
// these dates" so drivers can see demand and publish a matching ride.
// Stored flat in `requests` and readable by any signed-in member.
const requestsRef = () => ref(db, "requests");
const externalRequestsRef = () => ref(db, "externalRequests");
const requestRef = (id) => ref(db, `requests/${id}`);

const toArray = (snap) =>
  snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : [];

export const createRequest = async (uid, { name, from, to, dateFrom, dateTo, note }) => {
  const newRef = push(requestsRef());
  await set(newRef, {
    passengerUid: uid,
    name: name || "Passenger",
    from,
    to,
    dateFrom,
    dateTo,
    note: (note || "").trim(),
    createdAt: new Date().toISOString(),
  });
  return newRef.key;
};

export const deleteRequest = (id) => remove(requestRef(id));

// Live board of upcoming requests (those whose window hasn't fully passed),
// soonest first. Indexed on dateTo so expired requests aren't fetched.
export const subscribeRequests = (callback) => {
  const q = query(requestsRef(), orderByChild("dateTo"), startAt(todayISO()));
  return onValue(
    q,
    (snap) =>
      callback(
        toArray(snap).sort((a, b) => (a.dateFrom || "").localeCompare(b.dateFrom || ""))
      ),
    () => callback([])
  );
};

// Facebook requests have no Gamiyole passenger account and are read from a
// separate admin-managed node. The card links back to the original post.
export const subscribeExternalRequests = (callback) => {
  const q = query(externalRequestsRef(), orderByChild("dateTo"), startAt(todayISO()));
  return onValue(q, (snap) => callback(toArray(snap)), () => callback([]));
};

// Whether a request's date window overlaps a specific ride date (for matching).
export const requestMatchesDate = (request, date) =>
  (request.dateFrom || "") <= date && date <= (request.dateTo || "");

// Member requests can cover several days; include them whenever their travel
// window overlaps the selected date or week.
export const filterRequests = (requests, { departure, destination, when, date }) => {
  const [fromDate, toDate] = dateRangeFor(when, date);
  return requests.filter((request) => {
    if (departure && request.from?.trim() !== departure.trim()) return false;
    if (destination && request.to?.trim() !== destination.trim()) return false;
    if (!fromDate && !toDate) return true;
    const requestFrom = request.dateFrom || request.dateTo || "";
    const requestTo = request.dateTo || request.dateFrom || "";
    return requestFrom <= toDate && requestTo >= fromDate;
  });
};
