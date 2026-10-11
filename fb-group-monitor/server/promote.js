// promote.js — push good driver posts from the local SQLite DB up to the
// gamiyole website as "external" ride listings (RTDB node `externalRides`).
//
// Privacy by design: we publish ONLY route + date/time + a link back to the
// original Facebook post. No name, no phone — those stay in the local DB and on
// Facebook, where contact actually happens. The website marks these clearly as
// external/unverified.
//
// Auth: uses the Firebase Admin SDK, which bypasses database rules. It needs a
// service account key — download from Firebase Console → Project settings →
// Service accounts → "Generate new private key", then either:
//   • set GOOGLE_APPLICATION_CREDENTIALS=/abs/path/to/serviceAccount.json, or
//   • drop the file at fb-group-monitor/server/serviceAccount.json  (gitignored)
//
// Run one pass:   node promote.js            (writes qualifying rides, cleans past ones)
//                 node promote.js --dry-run   (log what would happen, write nothing)
// Or trigger over HTTP:  POST /promote  (see index.js)

const fs = require("fs");
const path = require("path");
const { queries } = require("./db");
const { redactContact, hasUnresolvedFutureDate } = require("./parse");

const RTDB_URL =
  process.env.RTDB_URL ||
  "https://react-http-7efc4-default-rtdb.europe-west1.firebasedatabase.app";

// Canonical gamiyole cities — a promoted ride's from/to must both be one of
// these (the parser also emits regions/spellings the app has no city for, e.g.
// "West Georgia"). Keep in sync with src/i18n.js CITIES.
const GAMIYOLE_CITIES = new Set([
  "Tbilisi", "Batumi", "Kutaisi", "Zugdidi", "Rustavi", "Gori", "Poti",
  "Khashuri", "Samtredia", "Senaki", "Zestafoni", "Marneuli", "Telavi",
  "Kobuleti", "Akhaltsikhe", "Ozurgeti", "Kaspi", "Borjomi", "Mtskheta",
  "Gudauri", "Bakuriani", "Sachkhere", "Mestia", "Lagodekhi", "Chiatura",
  "Kazbegi", "Gurjaani", "Lanchkhuti", "Martvili", "Terjola", "Kvareli",
  "Baghdati", "Kacreti", "Tskaltubo", "Ambrolauri", "Dusheti", "Tkibuli",
  "Kharagauli", "Sighnaghi", "Bolnisi", "Sagarejo", "Akhalkalaki", "Tsalenjikha",
  "Kakheti",
]);

// Places the parser knows but the website has no city for, grouped under the
// nearest city it does have. Nothing is lost: the card quotes the post itself,
// and the listing keeps the exact place in fromPlace/toPlace.
const NEAREST_CITY = {
  // Black Sea coast & Adjara
  Ureki: "Batumi", Shekvetili: "Batumi", Gonio: "Batumi", Sarpi: "Batumi", Kvariati: "Batumi",
  Chakvi: "Batumi", Makhinjauri: "Batumi", Adjara: "Batumi",
  Tsikhisdziri: "Kobuleti", Bobokvati: "Kobuleti", Grigoleti: "Poti",
  // Guria, Samegrelo, Imereti
  Chokhatauri: "Ozurgeti", Sajavakho: "Ozurgeti", Bakhmaro: "Ozurgeti", Nabeghlavi: "Ozurgeti", Guria: "Ozurgeti",
  Anaklia: "Zugdidi", Ganmukhuri: "Zugdidi", Gali: "Zugdidi", Khobi: "Zugdidi", Samegrelo: "Zugdidi",
  Chkhorotsku: "Martvili", Abasha: "Senaki",
  Khoni: "Kutaisi", Kopitnari: "Kutaisi", Imereti: "Kutaisi", Vani: "Samtredia", Sairme: "Baghdati",
  // mountains
  Svaneti: "Mestia", Ushguli: "Mestia",
  Racha: "Ambrolauri", Oni: "Ambrolauri", Shovi: "Ambrolauri", Lentekhi: "Ambrolauri",
  Tusheti: "Telavi", Omalo: "Telavi", Akhmeta: "Telavi", Lopota: "Telavi",
  Tsnori: "Sighnaghi", Dedoplistskaro: "Sighnaghi",
  // east & south
  Kareli: "Gori", Tskhinvali: "Gori", Surami: "Khashuri", Likani: "Borjomi", Tsagveri: "Borjomi",
  Vardzia: "Akhaltsikhe", Aspindza: "Akhaltsikhe", Adigeni: "Akhaltsikhe", Abastumani: "Akhaltsikhe",
  Javakheti: "Akhalkalaki", Ninotsminda: "Akhalkalaki",
  Natakhtari: "Mtskheta", Zhinvali: "Dusheti", Pasanauri: "Dusheti",
  Gardabani: "Rustavi", Dmanisi: "Bolnisi",
  // bare directions: "to the west" from Tbilisi, "to the east" from the west
  West: "Kutaisi", East: "Tbilisi",
};
const siteCity = (place) => {
  const p = (place || "").trim();
  return GAMIYOLE_CITIES.has(p) ? p : NEAREST_CITY[p] || null;
};

// Georgia is UTC+4, no DST — compute "today" in local Georgian time so we don't
// drop a ride that's still valid there just because UTC has rolled over.
function todayTbilisi() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts; // en-CA gives YYYY-MM-DD
}

let adminApp = null;
function getDb() {
  if (adminApp) return adminApp.database();
  const admin = require("firebase-admin");

  // Resolve a service account: explicit env path, ADC, or a local file.
  const localKey = path.join(__dirname, "serviceAccount.json");
  let credential;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = admin.credential.applicationDefault();
  } else if (fs.existsSync(localKey)) {
    credential = admin.credential.cert(require(localKey));
  } else {
    throw new Error(
      "No Firebase credentials. Set GOOGLE_APPLICATION_CREDENTIALS or add serviceAccount.json (see top of promote.js)."
    );
  }

  adminApp = admin.initializeApp({ credential, databaseURL: RTDB_URL });
  return adminApp.database();
}

// A link straight to the specific post (numeric id or FB's opaque pfbid form).
const isPostPermalink = (url) =>
  /\/(?:posts|permalink)\/(?:\d+|pfbid[A-Za-z0-9]+)/.test(url || "");

const cleanGroupUrl = (gid) => (gid ? `https://www.facebook.com/groups/${gid}/` : null);
const groupIdFromUrl = (url) => ((url || "").match(/\/groups\/([^/?&]+)/) || [])[1] || null;

// The best link we can offer for a post: the specific post if we have it, else
// a clean group-feed URL (still useful — these groups run ~10-20/day, so a reader
// can scroll and find it). Returns { url, type: 'post'|'group' } or null if none.
function postLink(row) {
  if (isPostPermalink(row.permalink)) return { url: row.permalink, type: "post" };
  const gid = row.group_id || groupIdFromUrl(row.permalink);
  const g = cleanGroupUrl(gid) || (row.permalink || null);
  return g ? { url: g, type: "group" } : null;
}

// Real advance-notice rides are at most a few months out; a date a year+ ahead is
// almost always a wrong-year parse artifact, so we don't surface it.
const MAX_FUTURE_DAYS = 200;
const ymdToUTC = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const tooFarOut = (dateStr, today) =>
  (ymdToUTC(dateStr) - ymdToUTC(today)) / 86400000 > MAX_FUTURE_DAYS;

// Tbilisi calendar day of an ISO instant.
const tbilisiDay = (iso) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(iso));

// The ride's date: the parsed one, or — for an undated post — the day the
// monitor saw it. Undated driver posts are overwhelmingly "გავდივარ თბილისიდან
// ბათუმში" written minutes before leaving, so a post seen today is a ride today
// (and expires tomorrow). Returns { date, assumed } or null.
function effectiveDate(row) {
  if (row.departure_date) return { date: row.departure_date, assumed: false };
  const seen = row.posted_at || row.captured_at; // when written, if the extension knew
  if (seen && !hasUnresolvedFutureDate(row.text || "")) return { date: tbilisiDay(seen), assumed: true };
  return null;
}

// Turn a DB row into an externalRides record, or null if it can't be one. No
// date filter here — promoteRides applies it after merging repeat sightings.
function toListing(row) {
  if (!promoteVerdict(row).ok) return null;
  const eff = effectiveDate(row);
  const link = postLink(row);

  const from = row.route_from.trim(), to = row.route_to.trim();
  const listing = {
    departure: siteCity(from),
    destination: siteCity(to),
    date: eff.date,
    source: "facebook",
    sourceUrl: link.url,
    linkType: link.type, // 'post' | 'group' — the card labels the button accordingly
    postId: row.post_id,
    createdAt: row.posted_at || row.captured_at || new Date().toISOString(),
  };
  if (listing.departure !== from) listing.fromPlace = from; // grouped: keep the real place
  if (listing.destination !== to) listing.toPlace = to;
  if (eff.assumed) listing.dateAssumed = true;
  if (row.departure_time) listing.departureTime = row.departure_time;
  const seats = parseInt(row.seats, 10);
  if (Number.isFinite(seats) && seats > 0) listing.seats = seats;
  // The original announcement (contact details stripped) — shown on the card so
  // the listing reads as a real post, not just a parsed route.
  const snippet = redactContact(undouble(row.text)).slice(0, 280);
  if (snippet) listing.text = snippet;
  return listing;
}

// External requests have no Gamiyole account. Keep them in their own node so
// member-owned requests, profile lookups and ride-match notifications stay intact.
function toRequest(row) {
  if (!promoteVerdict(row).ok) return null;
  const eff = effectiveDate(row);
  const link = postLink(row);
  const from = row.route_from.trim(), to = row.route_to.trim();
  const request = {
    from: siteCity(from), to: siteCity(to),
    dateFrom: eff.date, dateTo: eff.date,
    source: "facebook", sourceUrl: link.url, linkType: link.type,
    postId: row.post_id,
    createdAt: row.posted_at || row.captured_at || new Date().toISOString(),
  };
  if (request.from !== from) request.fromPlace = from;
  if (request.to !== to) request.toPlace = to;
  if (eff.assumed) request.dateAssumed = true;
  if (row.departure_time) request.departureTime = row.departure_time;
  const snippet = redactContact(undouble(row.text)).slice(0, 200);
  if (snippet) request.note = snippet;
  return request;
}

// RTDB keys can't contain . $ # [ ] / — Facebook post ids are digits, but be safe.
const safeKey = (id) => String(id).replace(/[.$#[\]/]/g, "_");

// The capture sometimes reads a post's text twice over ("XX", "X X", or X then
// a cut-off copy of X) — keep the first copy.
function undouble(text) {
  const s = (text || "").trim();
  for (const k of [Math.floor(s.length / 2), Math.ceil(s.length / 2)]) {
    const a = s.slice(0, k).trim();
    if (a && a === s.slice(k).trim()) return a;
  }
  const i = s.length >= 60 ? s.indexOf(s.slice(0, 30), 20) : -1; // the opening, again
  return i > 0 && s.startsWith(s.slice(i, i + 80).trim()) ? s.slice(0, i).trim() : s;
}

// One listing per real ride. The monitor often sees a post more than once —
// first under a temporary id, later under its real one, sometimes across
// midnight — and drivers cross-post the same text to several groups. Sightings
// of the same route + text within SAME_POST_HOURS are one post (in the data,
// repeat sightings land within hours; a driver's daily repost is a day+ apart).
const SAME_POST_HOURS = 20;
const textKey = (t) => undouble(t).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "").slice(0, 120);
const hoursApart = (a, b) => Math.abs(Date.parse(b) - Date.parse(a)) / 3600000;
function dedupe(listings) {
  const groups = new Map();
  for (const l of listings) {
    const k = [l.departure, l.destination, textKey(l.text) || l.postId].join("|");
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(l);
  }
  const out = [];
  for (const g of groups.values()) {
    g.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
    let cluster = [g[0]];
    for (const l of g.slice(1)) {
      if (hoursApart(cluster[cluster.length - 1].createdAt, l.createdAt) > SAME_POST_HOURS) {
        out.push(mergeSightings(cluster));
        cluster = [];
      }
      cluster.push(l);
    }
    out.push(mergeSightings(cluster));
  }
  return out;
}
// The first sighting is closest to when the post was written, so its reading of
// "today/tomorrow" is the right one ("ხვალ" seen at 23:30 and again at 01:00
// must not become two different days). The link/key come from the best
// sighting: a direct post link, else a real (numeric) post id, else the first.
function mergeSightings(cluster) {
  const first = cluster[0];
  const rep = cluster.find((l) => l.linkType === "post") ||
    cluster.find((l) => /^\d+$/.test(l.postId)) || first;
  const m = { ...rep, date: first.date, createdAt: first.createdAt };
  delete m.departureTime;
  delete m.dateAssumed;
  if (first.departureTime) m.departureTime = first.departureTime;
  if (first.dateAssumed) m.dateAssumed = true;
  return m;
}

const shiftDay = (ymd, n) => new Date(ymdToUTC(ymd) + n * 86400000).toISOString().slice(0, 10);

async function promoteRides({ dryRun = false, limit = 500 } = {}) {
  const today = todayTbilisi();
  // Look back two days, so a post re-seen today is merged with its earlier
  // sighting (and dated by it) before anything is judged past or current.
  const rows = queries.listPromotable(shiftDay(today, -2), limit);
  const drafts = rows.map((r) => toListing(r)).filter(Boolean);
  const rides = dedupe(drafts);
  const listings = rides.filter((l) => l.date >= today && !tooFarOut(l.date, today));
  const requestRows = queries.listPromotableRequests(shiftDay(today, -2), limit);
  const requestDrafts = requestRows.map(toRequest).filter(Boolean);
  const requests = requestDrafts.filter((r) => r.dateTo >= today && !tooFarOut(r.dateTo, today));
  const live = new Set(listings.map((l) => safeKey(l.postId)));
  // Every other key these rows could have been listed under — duplicate
  // sightings, rides now past — comes down if it's up there.
  const staleKeys = new Set(drafts.map((l) => safeKey(l.postId)).filter((k) => !live.has(k)));

  const summary = {
    candidates: rows.length,
    qualified: listings.length,
    duplicates: drafts.length - rides.length,
    written: 0,
    removed: 0,
    dryRun,
    requestCandidates: requestRows.length,
    requestsQualified: requests.length,
    requestsWritten: 0,
    requestsRemoved: 0,
  };

  if (dryRun) {
    for (const l of listings) {
      console.log(
        `  would post: ${l.departure}→${l.destination} ${l.date}${l.departureTime ? " " + l.departureTime : ""} · ${l.sourceUrl}`
      );
    }
    for (const r of requests) console.log(`  would post request: ${r.from}→${r.to} ${r.dateFrom} · ${r.sourceUrl}`);
    return summary;
  }

  const rtdb = getDb();
  const ref = rtdb.ref("externalRides");

  // Upsert each qualifying ride, keyed by post id so re-runs dedupe/refresh.
  const updates = {};
  for (const l of listings) updates[safeKey(l.postId)] = l;

  // Cleanup: drop anything already up there that's now past-dated (the feed
  // windows it out of view anyway; this keeps the node tidy).
  const snap = await ref.once("value");
  const existing = snap.val() || {};
  for (const [key, val] of Object.entries(existing)) {
    // past-dated, or a stale copy of a ride now listed under another key/date
    if (((!val || !val.date || val.date < today) || staleKeys.has(key)) && !(key in updates)) {
      updates[key] = null; // deletes the node
      summary.removed++;
    }
  }

  await ref.update(updates);
  summary.written = listings.length;

  const requestsRef = rtdb.ref("externalRequests");
  const requestUpdates = {};
  for (const r of requests) requestUpdates[safeKey(r.postId)] = r;
  const requestLive = new Set(requests.map((r) => safeKey(r.postId)));
  const requestStale = new Set(requestDrafts.map((r) => safeKey(r.postId)).filter((key) => !requestLive.has(key)));
  const requestSnap = await requestsRef.once("value");
  for (const [key, val] of Object.entries(requestSnap.val() || {})) {
    if (((!val || !val.dateTo || val.dateTo < today) || requestStale.has(key)) && !(key in requestUpdates)) {
      requestUpdates[key] = null;
      summary.requestsRemoved++;
    }
  }
  await requestsRef.update(requestUpdates);
  summary.requestsWritten = requests.length;
  return summary;
}

// Explain, for one driver-route post, whether it would be promoted and why not.
// Mirrors the listPromotable gate + toListing filters, but returns a reason.
// Without `today` it checks everything but the date window (used by toListing).
function promoteVerdict(row, today) {
  const from = siteCity(row.route_from);
  const to = siteCity(row.route_to);
  if (!from || !to) return { ok: false, reason: "city not on gamiyole" };
  if (from === to) return { ok: false, reason: "same from & to" }; // incl. Batumi → Gonio
  const eff = effectiveDate(row);
  if (!eff) return { ok: false, reason: "no date parsed" };
  if (!postLink(row)) return { ok: false, reason: "no facebook link" };
  if (today && eff.date < today) return { ok: false, reason: "past date" };
  if (today && tooFarOut(eff.date, today))
    return { ok: false, reason: "date >200 days out (likely misparse)" };
  return { ok: true, reason: eff.assumed ? "qualified (undated → day seen)" : "qualified" };
}

// Inspector: every driver-route post the crawler has, with a qualify/reject
// verdict and reason. Pure DB read — works without Firebase credentials.
function evaluateCandidates(limit = 300) {
  const today = todayTbilisi();
  const rows = queries.promoteCandidates(limit); // freshest-captured first
  const byReason = {};
  let qualified = 0;
  const items = rows.map((r) => {
    const v = promoteVerdict(r, today);
    if (v.ok) qualified += 1;
    else byReason[v.reason] = (byReason[v.reason] || 0) + 1;
    return {
      from: r.route_from,
      to: r.route_to,
      siteFrom: siteCity(r.route_from),
      siteTo: siteCity(r.route_to),
      date: r.departure_date || null,
      time: r.departure_time || null,
      dateSource: r.date_source || null,
      via: r.captured_via || null,
      captured: r.captured_at || null,
      link: r.permalink || null,
      verdict: v.ok ? "qualified" : "rejected",
      reason: v.reason,
      text: (r.text || "").replace(/\s+/g, " ").slice(0, 140),
    };
  });
  // total = ALL driver-route posts; shown = how many this page rendered (limit).
  return { today, total: queries.promoteCandidatesCount(), shown: rows.length, qualified, byReason, items };
}

// Hard reset: remove every external listing (for pulling down a bad batch).
async function clearExternalRides() {
  const rtdb = getDb();
  const ref = rtdb.ref("externalRides");
  const snap = await ref.once("value");
  const n = snap.exists() ? Object.keys(snap.val()).length : 0;
  const requestsRef = rtdb.ref("externalRequests");
  const requestsSnap = await requestsRef.once("value");
  const requestsRemoved = requestsSnap.exists() ? Object.keys(requestsSnap.val()).length : 0;
  await ref.set(null);
  await requestsRef.set(null);
  return { removed: n, requestsRemoved };
}

module.exports = { promoteRides, clearExternalRides, evaluateCandidates };

// CLI: `node promote.js [--dry-run | --clear]`
if (require.main === module) {
  const run = process.argv.includes("--clear")
    ? clearExternalRides().then((s) => console.log(`clear: removed ${s.removed} external listings`))
    : promoteRides({ dryRun: process.argv.includes("--dry-run") }).then((s) =>
        console.log(
          `promote: ${s.qualified}/${s.candidates} qualified, ` +
            `${s.dryRun ? "0 (dry run)" : s.written} posted, ${s.removed} stale removed`
        )
      );
  run.then(() => process.exit(0)).catch((e) => {
    console.error("failed:", e.message);
    process.exit(1);
  });
}
