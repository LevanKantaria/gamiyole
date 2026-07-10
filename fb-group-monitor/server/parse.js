// parse.js — rule-based enrichment for a Georgian rideshare group.
// Turns a raw post {author, authorUserId, text, ...} into structured fields:
// phones[], userType (driver/passenger/unknown), route {from,to}, seats.
//
// Everything is offline and free. Georgian is written with grammatical case
// suffixes we can exploit: "-დან" = FROM, "-ში"/"-კენ" = TO.

// ---- phones ----------------------------------------------------------------
// Georgian mobiles are 9 digits starting with 5 (5XX XX XX XX), optionally
// prefixed by +995 / 995. People separate the groups with spaces/dashes/dots.
function extractPhones(text) {
  if (!text) return [];
  const out = new Set();
  // Grab phone-like clusters (digits + separators), then normalize by digits —
  // this is grouping-agnostic (handles 5XX XX XX XX, 5XX XXX XXX, 5XXXXXXXX,
  // and +995-prefixed forms). Georgian letters break clusters, so "X და Y" splits.
  const clusters = text.match(/[+(]?\d[\d\s().\-]{6,}\d/g) || [];
  for (const c of clusters) {
    let d = c.replace(/\D/g, "");
    if (d.length === 12 && d.startsWith("995")) d = d.slice(3); // strip country code
    if (d.length === 9 && d[0] === "5") out.add("+995" + d);
  }
  return [...out];
}

// Post text safe to show publicly: strips contact details (phone numbers,
// wa.me/telegram/messenger links, bare URLs) so we surface the descriptive
// announcement without republishing anyone's number. Contact stays on Facebook.
function redactContact(text) {
  if (!text) return "";
  let out = text
    .replace(/\b(?:wa\.me|t\.me|whatsapp\.com|m\.me|fb\.me)\/\S+/gi, "")
    .replace(/https?:\/\/\S+/gi, "");
  // Replace only clusters that normalize to a Georgian mobile (leaves dates/times).
  out = out.replace(/[+(]?\d[\d\s().\-]{6,}\d/g, (c) => {
    let d = c.replace(/\D/g, "");
    if (d.length === 12 && d.startsWith("995")) d = d.slice(3);
    return d.length === 9 && d[0] === "5" ? "📞" : c;
  });
  return out.replace(/\s{2,}/g, " ").trim();
}

// ---- cities & route --------------------------------------------------------
// Match by root so grammatical endings still hit (თბილის-ი / თბილის-ში / თბილის-იდან,
// and colloquial spellings like თბილის-ოდან). FROM = root+…+დან, TO = root+…+ში|კენ.
const CITIES = [
  ["თბილის", "Tbilisi"],
  ["ბათუმ", "Batumi"],
  ["ქუთაის", "Kutaisi"],
  ["რუსთავ", "Rustavi"],
  ["ზუგდიდ", "Zugdidi"],
  ["გორ", "Gori"],
  ["ფოთ", "Poti"],
  ["ოზურგეთ", "Ozurgeti"],
  ["თელავ", "Telavi"],
  ["ახალციხ", "Akhaltsikhe"],
  ["მარნეულ", "Marneuli"],
  ["ბორჯომ", "Borjomi"],
  ["გუდაურ", "Gudauri"],
  ["ბაკურიან", "Bakuriani"],
  ["მესტ", "Mestia"],
  ["სიღნაღ", "Sighnaghi"],
  ["ყვარელ", "Kvareli"],
  ["ცხინვალ", "Tskhinvali"],
  ["სტეფანწმინდ", "Kazbegi"],   // Stepantsminda == Kazbegi (same town) — one canonical value
  ["ყაზბეგ", "Kazbegi"],
  ["ხაშურ", "Khashuri"],
  ["ზესტაფონ", "Zestafoni"],     // spelling must match the app's city value
  ["მცხეთ", "Mtskheta"],
  ["სამტრედ", "Samtredia"],
  ["ლანჩხუთ", "Lanchkhuti"],
  ["ჭიათურ", "Chiatura"],
  ["ამბროლაურ", "Ambrolauri"],
  ["ქობულეთ", "Kobuleti"],
  ["თერჯოლ", "Terjola"],
  ["ხარაგაულ", "Kharagauli"],
  ["კასპ", "Kaspi"],
  ["ლაგოდეხ", "Lagodekhi"],
  ["საგარეჯ", "Sagarejo"],
  ["გურჯაან", "Gurjaani"],
  ["დუშეთ", "Dusheti"],
  ["კაჭრეთ", "Kacreti"],
  ["წყალტუბ", "Tskaltubo"],
  ["ბაღდათ", "Baghdati"],
  ["ბოლნის", "Bolnisi"],
  ["გარდაბან", "Gardabani"],
  ["სენაკ", "Senaki"],
  ["ახალქალაქ", "Akhalkalaki"],
  ["საჩხერ", "Sachkhere"],
  ["ტყიბულ", "Tkibuli"],
  ["მარტვილ", "Martvili"],
  ["წალენჯიხ", "Tsalenjikha"],
  // regions / directions people use as an origin or destination
  ["გურია", "Guria"],
  ["კახეთ", "Kakheti"],
  ["იმერეთ", "Imereti"],
  ["სამეგრელ", "Samegrelo"],
  ["აჭარ", "Adjara"],
  ["დასავლეთ", "West"],
  ["აღმოსავლეთ", "East"],
];

const GEO = "[\\u10D0-\\u10FF]"; // any Georgian letter
const FROM_MARK = "(დან|დგან)";                    // origin: -დან and colloquial -დგან
const TO_MARK = "(ში|კენ|საკენ|ამდე|მდე)";          // destination: -ში/-კენ/-ამდე/-მდე

function extractRoute(text) {
  const route = { from: null, to: null };
  if (!text) return route;

  // Primary: grammatical markers. FROM = root+…+დან; TO = root+…+ში/კენ/ამდე,
  // plus "root+…+ის მიმართულებით" (toward X).
  for (const [root, name] of CITIES) {
    const from = new RegExp(root + GEO + "{0,3}" + FROM_MARK);
    const to = new RegExp(root + GEO + "{0,3}" + TO_MARK);
    const toward = new RegExp(root + GEO + "{0,4}\\s*მიმართ"); // …ის მიმართულებით
    if (!route.from && from.test(text)) route.from = name;
    // Skip the origin city as a destination, so a round trip ("…დან …ში …ში")
    // resolves to the real other-city destination instead of a self-loop.
    if (!route.to && name !== route.from && (to.test(text) || toward.test(text))) route.to = name;
  }
  if (route.from && route.from === route.to) route.to = null; // safety
  if (route.from && route.to) return route;

  // Fallback: cities in nominative with no case endings, e.g. "ბათუმი თბილისი",
  // "ქუთაისი — თბილისი", "ბათუმი ➜ თბილისი". Order = origin then destination.
  const hits = [];
  for (const [root, name] of CITIES) {
    const idx = text.search(new RegExp(root));
    if (idx !== -1 && !hits.some((h) => h.name === name)) hits.push({ idx, name });
  }
  hits.sort((a, b) => a.idx - b.idx);
  if (hits.length >= 2) {
    if (!route.from && !route.to) { route.from = hits[0].name; route.to = hits[1].name; }
    else if (!route.to) { const o = hits.find((h) => h.name !== route.from); if (o) route.to = o.name; }
    else if (!route.from) { const o = hits.find((h) => h.name !== route.to); if (o) route.from = o.name; }
  }
  // A self-loop (same city both ends) is meaningless — keep the origin only.
  if (route.from && route.from === route.to) route.to = null;
  return route;
}

// ---- seats -----------------------------------------------------------------
// "2 ადგილი", "მაქვს 3 ადგილი", "ერთი ადგილი". Returns a number or null.
const WORD_NUM = { "ერთი": 1, "ორი": 2, "სამი": 3, "ოთხი": 4, "ხუთი": 5, "ექვსი": 6 };
function extractSeats(text) {
  if (!text) return null;
  const digit = text.match(/(\d+)\s*ადგილ/);
  if (digit) return Number(digit[1]);
  for (const [word, n] of Object.entries(WORD_NUM)) {
    if (new RegExp(word + "\\s*ადგილ").test(text)) return n;
  }
  return null;
}

// ---- driver / passenger ----------------------------------------------------
// Weighted cues: STRONG (unambiguous) = 2, WEAK (directional) = 1. Higher wins.
// Georgian distinguishes "take YOU" (გ-, driver) from "take ME" (მ-, passenger).
const D_STRONG =
  /მაქვს\s*\d*\s*ადგილ|ადგილ.{0,4}მაქვს|ადგილები\s*მაქვს|თავისუფალი\s*ადგილ|გავყავარ|წავიყვან|მივყავარ|გავიყოლ|წავიყოლ|გაგიყოლ|გაგიყვან|წაგიყვან|მიგყავ|ჩემი\s*მანქან/;
const D_WEAK =
  /მივდივარ|გავდივარ|გავდუვარ|გამოვდივარ|გამომდივარ|მსურველ|დამემგზავრ|წამოხვალთ|წამოხვიდ|მინივენ|მარშუტ/;
const P_STRONG =
  /ვეძებ|მჭირდება|მინდა\s*ადგილ|მოძებ|წამიყვან|გამიყოლ|მანქანა\s*მჭირ/;
// "is anyone going?" — the passenger's question form (verb + prefix variants,
// incl. glued spellings like "ხომარგადიხართ").
const P_WEAK =
  /(ხომ\s*ა?რ?|ხოარ|ვინმე|თუ)[^.?!]{0,18}(მიდიხართ|გადიხართ|მოდიხართ|მიდის|გადის|მოდის|მივა|მიემგზავ)|ვინ\s*(გადის|მიდის|მოდის|მივა)|მიმყავხართ/;

function classifyType(text) {
  if (!text) return "unknown";
  let d = 0, p = 0;
  if (D_STRONG.test(text)) d += 2;
  if (D_WEAK.test(text)) d += 1;
  if (P_STRONG.test(text)) p += 2;
  // A "who's going?" question only counts as passenger-intent when the poster
  // isn't themselves offering/driving (otherwise it's a driver asking for riders).
  if (P_WEAK.test(text) && d === 0) p += 1;
  if (d > p) return "driver";
  if (p > d) return "passenger";
  return "unknown";
}

// ---- departure date & time -------------------------------------------------
// Georgia is UTC+4 year-round (no DST), so we can build an absolute timestamp
// with a fixed offset. "today" is resolved against the post's capture time.
const TZ = "+04:00";

function tbilisiYMD(refIso) {
  const d = refIso ? new Date(refIso) : new Date();
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);
  const g = (t) => +p.find((x) => x.type === t).value;
  return { y: g("year"), m: g("month"), day: g("day") };
}

function addDays(ymd, n) {
  const dt = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.day));
  dt.setUTCDate(dt.getUTCDate() + n);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

// Calendar date + wall-clock time in Tbilisi for an absolute instant (ms epoch).
function tbilisiDateTime(ms) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const g = (t) => p.find((x) => x.type === t).value;
  return { date: `${g("year")}-${g("month")}-${g("day")}`, time: `${g("hour")}:${g("minute")}` };
}

// Georgian number words 1-10 (roots) for spelled-out counts like "ორ საათში".
const GE_NUM = {
  ერთ: 1, ორ: 2, სამ: 3, ოთხ: 4, ხუთ: 5, ექვს: 6, შვიდ: 7, რვა: 8, ცხრა: 9, ათ: 10,
};

// "in N hours" — a duration relative to when the post was written: "ორ საათში"
// (in 2h), "2 საათში", "ნახევარ საათში" (30 min), "საათნახევარში" (90 min).
// Returns hours (may be fractional) or null. Note the -ში ("into") ending is
// what marks a duration, vs "საათზე"/"საათს" which mean "at N o'clock".
function durationHours(text) {
  let m = text.match(/(\d{1,2})\s*საათში/);
  if (m) return +m[1];
  if (/საათ\s*ნახევარში/.test(text)) return 1.5;
  if (/ნახევარ\s*საათში/.test(text)) return 0.5;
  for (const [w, n] of Object.entries(GE_NUM)) {
    if (new RegExp(w + "\\s*საათში").test(text)) return n;
  }
  return null;
}

const DEP_RE =
  /დღეს|ხვალ|ზეგ|\d{1,2}[:.]\d{2}|\d{1,2}\s*საათ|\d{1,2}\s*[-–]?\s*ში|საღამო|დილ|შუადღ|ღამ/g;

// Georgian month roots (match any case ending), day precedes month: "30 ივნისს".
const GE_MONTHS = [
  [/იანვ/, 1], [/თებერვ/, 2], [/მარტ/, 3], [/აპრილ/, 4], [/მაის/, 5],
  [/ივნის/, 6], [/ივლის/, 7], [/აგვისტ/, 8], [/სექტემბ/, 9], [/ოქტომბ/, 10],
  [/ნოემბ/, 11], [/დეკემბ/, 12],
];

const daysBetween = (a, b) =>
  Math.round((Date.UTC(a.y, a.m - 1, a.day) - Date.UTC(b.y, b.m - 1, b.day)) / 86400000);

// Given a month+day with no year, pick the year (capture year ± 1) that lands
// the date closest to the capture date — handles the Dec-post-seen-in-Jan wrap.
function pickYear(m, day, ref) {
  let best = null;
  for (const y of [ref.y - 1, ref.y, ref.y + 1]) {
    const diff = Math.abs(daysBetween({ y, m, day }, ref));
    if (!best || diff < best.diff) best = { cand: { y, m, day }, diff };
  }
  return best.cand;
}

// Pull an EXPLICIT calendar date out of the text — trustworthy regardless of
// when the post was scraped (unlike "today"/"tomorrow"). Returns {y,m,day}|null.
function extractAbsoluteDate(text, ref) {
  // "30 ივნისს", "3 ივლისს" — a day number immediately before a Georgian month.
  for (const [re, mon] of GE_MONTHS) {
    const mm = text.match(new RegExp("(\\d{1,2})\\s*" + re.source));
    if (mm) {
      const day = +mm[1];
      if (day >= 1 && day <= 31) return pickYear(mon, day, ref);
    }
  }
  // Numeric DD.MM(.YYYY) / DD/MM — only when unambiguous vs a HH:MM time:
  // require month 1-12 and either a day >12 or an explicit year.
  const nm = text.match(/(?:^|[^\d:])(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?![\d:])/);
  if (nm) {
    const day = +nm[1], mon = +nm[2];
    if (day >= 1 && day <= 31 && mon >= 1 && mon <= 12 && (day > 12 || nm[3])) {
      if (nm[3]) return { y: +nm[3] < 100 ? 2000 + +nm[3] : +nm[3], m: mon, day };
      return pickYear(mon, day, ref);
    }
  }
  return null;
}

function extractDeparture(text, refIso) {
  if (!text) return {};

  // "in N hours" — resolves off the capture time to an absolute departure. Only
  // meaningful for a post seen ~when written (a fresh monitor capture), so it's
  // tagged 'relative' and the promote gate trusts it only for those.
  const dur = durationHours(text);
  if (dur != null && refIso) {
    const { date, time } = tbilisiDateTime(new Date(refIso).getTime() + dur * 3600 * 1000);
    return {
      departureDate: date,
      departureTime: time,
      departureAt: `${date}T${time}:00${TZ}`,
      departureText: `${dur} საათში`,
      dateSource: "relative",
    };
  }

  let dayOffset = null;
  if (/დღეს/.test(text)) dayOffset = 0;
  else if (/ხვალ/.test(text)) dayOffset = 1;
  else if (/ზეგ/.test(text)) dayOffset = 2;

  let hour = null, min = 0, m;
  if ((m = text.match(/(\d{1,2})[:.](\d{2})/))) { hour = +m[1]; min = +m[2]; }
  else if ((m = text.match(/(\d{1,2})\s*საათ/))) { hour = +m[1]; }
  else if ((m = text.match(/(\d{1,2})\s*[-–]?\s*ში/))) { hour = +m[1]; } // "17ში"

  const evening = /საღამო|ღამ/.test(text), morning = /დილ/.test(text), noon = /შუადღ/.test(text);
  if (hour != null) {
    if (evening && hour >= 1 && hour <= 11) hour += 12; // "8 საღამოს" → 20:00
  } else if (evening) hour = 19;
  else if (morning) hour = 8;
  else if (noon) hour = 13;
  if (hour != null && (hour > 23 || min > 59)) { hour = null; min = 0; }

  // An explicit date in the text ("30 ივნისს") beats a relative word — it's true
  // regardless of when we scraped it. Fall back to today/tomorrow only otherwise.
  const abs = extractAbsoluteDate(text, tbilisiYMD(refIso));

  if (dayOffset == null && hour == null && !abs) return {};

  const ymd = abs || addDays(tbilisiYMD(refIso), dayOffset || 0);
  const date = `${ymd.y}-${String(ymd.m).padStart(2, "0")}-${String(ymd.day).padStart(2, "0")}`;
  const time = hour != null ? `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}` : null;
  return {
    departureDate: date,
    departureTime: time,
    departureAt: time ? `${date}T${time}:00${TZ}` : null,
    departureText: (text.match(DEP_RE) || []).join(" ") || null,
    // "absolute" = dated from the text (trustworthy any time); "relative" = from
    // today/tomorrow, only trustworthy if captured fresh. null = date unknown.
    dateSource: abs ? "absolute" : dayOffset != null ? "relative" : null,
  };
}

// ---- top level -------------------------------------------------------------
function enrich(post) {
  const text = post.text || "";
  const route = extractRoute(text);
  const dep = extractDeparture(text, post.capturedAt);
  return {
    ...post,
    phones: extractPhones(text),
    userType: classifyType(text),
    routeFrom: route.from,
    routeTo: route.to,
    seats: extractSeats(text),
    departureDate: dep.departureDate || null,
    departureTime: dep.departureTime || null,
    departureAt: dep.departureAt || null,
    departureText: dep.departureText || null,
    dateSource: dep.dateSource || null,
  };
}

module.exports = { enrich, extractPhones, redactContact, classifyType, extractRoute, extractSeats, extractDeparture };
