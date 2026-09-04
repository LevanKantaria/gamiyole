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
const { redactContact } = require("./parse");

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

// Turn a DB row into the externalRides record (or null if it doesn't qualify).
function toListing(row, today) {
  const from = (row.route_from || "").trim();
  const to = (row.route_to || "").trim();
  if (!GAMIYOLE_CITIES.has(from) || !GAMIYOLE_CITIES.has(to)) return null;
  if (from === to) return null;
  if (!row.departure_date || row.departure_date < today) return null; // past / undated
  if (tooFarOut(row.departure_date, today)) return null; // wrong-year artifact
  const link = postLink(row);
  if (!link) return null; // nothing at all to link to

  const listing = {
    departure: from,
    destination: to,
    date: row.departure_date,
    source: "facebook",
    sourceUrl: link.url,
    linkType: link.type, // 'post' | 'group' — the card labels the button accordingly
    postId: row.post_id,
    createdAt: row.captured_at || new Date().toISOString(),
  };
  if (row.departure_time) listing.departureTime = row.departure_time;
  const seats = parseInt(row.seats, 10);
  if (Number.isFinite(seats) && seats > 0) listing.seats = seats;
  // The original announcement (contact details stripped) — shown on the card so
  // the listing reads as a real post, not just a parsed route.
  const snippet = redactContact(row.text).slice(0, 280);
  if (snippet) listing.text = snippet;
  return listing;
}

// RTDB keys can't contain . $ # [ ] / — Facebook post ids are digits, but be safe.
const safeKey = (id) => String(id).replace(/[.$#[\]/]/g, "_");

async function promoteRides({ dryRun = false, limit = 500 } = {}) {
  const today = todayTbilisi();
  const rows = queries.listPromotable(today, limit);
  const listings = rows.map((r) => toListing(r, today)).filter(Boolean);

  const summary = {
    candidates: rows.length,
    qualified: listings.length,
    written: 0,
    removed: 0,
    dryRun,
  };

  if (dryRun) {
    for (const l of listings) {
      console.log(
        `  would post: ${l.departure}→${l.destination} ${l.date}${l.departureTime ? " " + l.departureTime : ""} · ${l.sourceUrl}`
      );
    }
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
    if ((!val || !val.date || val.date < today) && !(key in updates)) {
      updates[key] = null; // deletes the node
      summary.removed++;
    }
  }

  await ref.update(updates);
  summary.written = listings.length;
  return summary;
}

// Explain, for one driver-route post, whether it would be promoted and why not.
// Mirrors the listPromotable gate + toListing filters, but returns a reason.
function promoteVerdict(row, today) {
  const from = (row.route_from || "").trim();
  const to = (row.route_to || "").trim();
  if (!GAMIYOLE_CITIES.has(from) || !GAMIYOLE_CITIES.has(to))
    return { ok: false, reason: "city not on gamiyole" };
  if (from === to) return { ok: false, reason: "same from & to" };
  if (!row.departure_date) return { ok: false, reason: "no date parsed" };
  if (row.departure_date < today) return { ok: false, reason: "past date" };
  if (tooFarOut(row.departure_date, today))
    return { ok: false, reason: "date >200 days out (likely misparse)" };
  if (!postLink(row)) return { ok: false, reason: "no facebook link" };
  return { ok: true, reason: "qualified" };
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
  await ref.set(null);
  return { removed: n };
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
