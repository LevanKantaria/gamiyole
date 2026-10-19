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

// ---- normalization -----------------------------------------------------------
// Every matcher below runs on normalize(text), not the raw post:
//  • lowercase — also folds Mtavruli capitals ("ბაᲗუმᲨი" → "ბათუმში");
//  • Latin-script Georgian ("xval tbilisidan batumshi gaviyoleb" — ~10% of
//    posts) gets a transliterated copy appended, so the Georgian rules read it;
//  • runs of one repeated Georgian letter collapse ("გავდივაარ", "თბილისსში") —
//    which is why the rules spell "hour" სა?ათ (საათ collapses to სათ).
const LATIN_DIGRAPHS = { sh: "შ", ch: "ჩ", zh: "ჟ", kh: "ხ", gh: "ღ", ts: "ც", dz: "ძ", ph: "ფ", th: "თ" };
const LATIN_LETTERS = {
  a: "ა", b: "ბ", c: "ც", d: "დ", e: "ე", f: "ფ", g: "გ", h: "ჰ", i: "ი", j: "ჯ", k: "კ", l: "ლ", m: "მ",
  n: "ნ", o: "ო", p: "პ", q: "ქ", r: "რ", s: "ს", t: "თ", u: "უ", v: "ვ", w: "წ", x: "ხ", y: "ყ", z: "ზ",
};
function latinToGeorgian(word) {
  let out = "";
  for (let i = 0; i < word.length; i++) {
    // "saatshi" is საა-თში, not საა-ცჰი: match t+sh before the ts digraph.
    if (word.slice(i, i + 3) === "tsh") { out += "თშ"; i += 2; continue; }
    const two = LATIN_DIGRAPHS[word.slice(i, i + 2)];
    if (two) { out += two; i++; } else out += LATIN_LETTERS[word[i]] || word[i];
  }
  return out;
}
function normalize(text) {
  let t = String(text || "").toLowerCase();
  if (/[a-z]{2}/.test(t)) t += "\n" + t.replace(/[a-z]+/g, latinToGeorgian);
  return t.replace(/([ა-ჿ])\1+/g, "$1");
}

// ---- cities & route --------------------------------------------------------
// Roots are regex fragments matched on normalized text, so grammatical endings
// still hit (თბილის-ი / თბილის-ში / თბილის-იდან). Character classes absorb common
// misspellings and transliteration ambiguity (ქ/კ, თ/ტ, ფ/პ, ღ/გ …).

// Towns, villages and resorts the website has no city for. Stored under their
// own name; promote.js groups each under the nearest city the site has.
const PLACES = [
  ["(?<![ა-ჰ])ურეკ(?=ი|ში|ამდე|იდან|ის)", "Ureki"], ["შეკვე[თტ]ილ", "Shekvetili"],
  ["(?<![ა-ჰ])გონი(?=ო)", "Gonio"], ["(?<![ა-ჰ])სარ[ფპ](?=ი|ში|ამდე|იდან|ის)", "Sarpi"],
  ["კვარია[თტ]", "Kvariati"], ["(?<![ა-ჰ])ჩა[ქკ]ვ", "Chakvi"], ["მახინჯაურ", "Makhinjauri"],
  ["ციხისძირ", "Tsikhisdziri"], ["ბობოყვა[თტ]", "Bobokvati"], ["გრიგოლე[თტ]", "Grigoleti"],
  ["ჩოხა[ტთ]აურ", "Chokhatauri"], ["საჯავახ", "Sajavakho"], ["ბახმარ", "Bakhmaro"], ["ნაბეღლავ", "Nabeghlavi"],
  ["ანაკლი", "Anaklia"], ["განმუხურ", "Ganmukhuri"], ["(?<![ა-ჰ])გალ(?=იდან|ში|ამდე)", "Gali"],
  ["(?<![ა-ჰ])ხობ(?=ი|ში|ამდე|იდან)", "Khobi"], ["ჩხოროწყ", "Chkhorotsku"], ["(?<![ა-ჰ])აბაშ", "Abasha"],
  ["(?<![ა-ჰ])ხონ(?=ი|ში|ს|ამდე|იდან)", "Khoni"], ["კოპი[ტთ]ნარ", "Kopitnari"],
  ["(?<![ა-ჰ])ვან(?=ი|ში|ამდე|იდან)", "Vani"], ["საირმე", "Sairme"],
  ["უშგულ", "Ushguli"], ["(?<![ა-ჰ])ონ(?=ი|ში|ამდე)", "Oni"], ["(?<![ა-ჰ])შოვ(?=ი|ში|ამდე|იდან)", "Shovi"],
  ["ლენტეხ", "Lentekhi"], ["ომალო", "Omalo"], ["ახმე[ტთ]", "Akhmeta"], ["ლოპო[ტთ]", "Lopota"],
  ["(?<![ა-ჰ])[წც]ნორ", "Tsnori"], ["დედოფლისწყარ", "Dedoplistskaro"],
  ["(?<![ა-ჰ])[ქკ]არელ", "Kareli"], ["სურამ", "Surami"], ["ლიკან", "Likani"], ["წაღვერ", "Tsagveri"],
  ["ვარძი", "Vardzia"], ["ასპინძ", "Aspindza"], ["ადიგენ", "Adigeni"], ["აბას[ტთ]უმან", "Abastumani"],
  ["ნინოწმინდ", "Ninotsminda"], ["ნა[ტთ]ახ[ტთ]არ", "Natakhtari"], ["ჟინვალ", "Zhinvali"],
  ["[ფპ]ასანაურ", "Pasanauri"], ["დმანის", "Dmanisi"],
];
const MINOR = new Set(PLACES.map(([, name]) => name));

const CITIES = [
  // (?<![ა-ჰ]) = at a word start: the typo "თვილის" must not fire inside მართვილის
  ["(?<![ა-ჰ])თ[ბფნვ]ილ(?:[იო][სდ]|ი(?=ში|დან))", "Tbilisi"], // + თბილიდიდან typo, clipped თბილიდან
  ["(?<![ა-ჰ])თბ(?=(?:[\\s_.-]*(?:დან|ში|კენ|ისკენ))?(?![ა-ჰ]))[\\s_.-]*", "Tbilisi"], // tb / tb_shi / თბდან
  ["ბა[თტ]უმ|(?<![ა-ჰ])(?:ბათუნ|ვათუმ|ბათიმ|ბთუმ)", "Batumi"],
  ["(?<![ა-ჰ])[ქკ][უყ][თტ](?:აის|ის|ას|აი(?=ში)|ა(?=ში|დან))", "Kutaisi"], // + "ქუთაში", "qutaishi"
  ["რუს[თტ]ავ", "Rustavi"],
  ["ზუგდი", "Zugdidi"],                  // also the clipped "ზუგდიდან"
  // Short roots only match at a word start: not სამგორი, not "Lopota".
  ["(?<![ა-ჰ])გორ(?!გ)", "Gori"],        // (nor გორგასალი)
  ["(?<![ა-ჰ])[ფპ]ოთ", "Poti"],
  ["ოზ[უი]რგე[თტ]", "Ozurgeti"],
  ["თელავ", "Telavi"],
  ["ახალციხ", "Akhaltsikhe"],
  ["მარნეულ", "Marneuli"],
  ["ბორჯომ", "Borjomi"],
  ["გუდაურ", "Gudauri"],
  ["ბაკურიან", "Bakuriani"],
  ["(?<![ა-ჰ])მეს[ტთ]ი", "Mestia"],
  ["სი[ღგ]ნა[ღგ]", "Sighnaghi"],
  ["[ყკ]ვარელ", "Kvareli"],
  ["ცხინვალ", "Tskhinvali"],
  ["სტეფანწმინდ", "Kazbegi"],   // Stepantsminda == Kazbegi (same town) — one canonical value
  ["[ყკქ]აზბეგ", "Kazbegi"],
  ["ხაშ[უი]რ", "Khashuri"],
  ["ზეს[ტთ]ა[ფპ]ონ", "Zestafoni"], // spelling must match the app's city value
  ["მცხე[თტ]", "Mtskheta"],
  ["სამ[ტთ]რედ", "Samtredia"],
  ["ლანჩხუ[თტ]", "Lanchkhuti"],
  ["[ჭჩწ]იათურ", "Chiatura"],
  ["ამბროლაურ", "Ambrolauri"],
  ["[ქკ]ობულე[თტ]", "Kobuleti"],
  ["თერჯოლ", "Terjola"],
  ["ხარაგაულ", "Kharagauli"],
  ["(?<![ა-ჰ])კასპ", "Kaspi"],
  ["ლაგოდეხ", "Lagodekhi"],
  ["საგარეჯ", "Sagarejo"],
  ["გურჯა?ან", "Gurjaani"],               // "აა" collapses in normalize()
  ["დუშე[თტ]", "Dusheti"],
  ["კაჭრე[თტ]", "Kacreti"],
  ["[წც][ყკქ]ალ[ტთ]უბ", "Tskaltubo"],
  ["ბა[ღგ]და[თტ]", "Baghdati"],
  ["ბოლნის", "Bolnisi"],
  ["გარდაბან", "Gardabani"],
  ["სენაკ", "Senaki"],
  ["ახალ[ქკ]ალა[ქკ]", "Akhalkalaki"],
  ["საჩხერ", "Sachkhere"],
  ["[ტთ][ყკქ]იბულ", "Tkibuli"],
  ["მარ[ტთ]ვილ", "Martvili"],
  ["[წც]ალენჯიხ", "Tsalenjikha"],
  // Tbilisi districts people set off from ("დიღმის მასივიდან", "ლილოდან")
  ["დი[ღგ](?:ომ|მ)", "Tbilisi"], ["საბურთალ", "Tbilisi"], ["გლდან", "Tbilisi"],
  ["ვარკე[თტ]ილ", "Tbilisi"], ["(?<![ა-ჰ])ლილო", "Tbilisi"], ["დიდუბ", "Tbilisi"],
  ["ნახალოვკ", "Tbilisi"], ["(?<![ა-ჰ])ვაკ(?=ე|იდან|ის)", "Tbilisi"], ["(?<![ა-ჰ])ის(?:ან|ნ(?=ი))", "Tbilisi"],
  ["მუხიან", "Tbilisi"], ["(?<![ა-ჰ])თემქ", "Tbilisi"], ["(?<![ა-ჰ])სამგორ", "Tbilisi"],
  ["ვაზისუბ", "Tbilisi"], ["ავჭალ", "Tbilisi"], ["დედაქალაქ", "Tbilisi"], // "the capital"
  ["ნუცუბიძ", "Tbilisi"],
  ...PLACES,
  // regions / directions people use as an origin or destination
  ["(?<![ა-ჰ])გური", "Guria"],
  ["კახე[თტ]", "Kakheti"],
  ["იმერე[თტ]", "Imereti"],
  ["სამეგრელ", "Samegrelo"],
  ["ა(?:ჭ|ჩ|დჯ|ჯ)არ", "Adjara"],
  ["სვანე[თტ]", "Svaneti"],
  ["(?<![ა-ჰ])რა[ჭჩ](?=[აი])", "Racha"],
  ["თუშე[თტ]", "Tusheti"],
  ["ჯავახე[თტ]", "Javakheti"],
  ["დასავლე[თტ]", "West"],
  ["აღმოსავლე[თტ]", "East"],
];
// Areas rather than places — a real town named alongside one wins (see extractRoute).
const REGIONS = new Set([
  "Guria", "Kakheti", "Imereti", "Samegrelo", "Adjara", "Svaneti", "Racha", "Tusheti", "Javakheti", "West", "East",
]);

const GEO = "[\\u10D0-\\u10FF]"; // any Georgian letter
const FROM_MARK = "(?:დან|დგან)";                    // origin: -დან and colloquial -დგან
const TO_MARK = "(?:ში|კენ|საკენ|ამდე|მდე)";          // destination: -ში/-კენ/-ამდე/-მდე
const CITY_RES = CITIES.map(([src, name]) => {
  const root = "(?:" + src + ")"; // roots may hold alternatives ("ბა[თტ]უმ|ბათუნ")
  return {
    name,
    any: new RegExp(root),
    from: new RegExp(root + GEO + "{0,3}" + FROM_MARK),
    to: new RegExp(root + GEO + "{0,3}" + TO_MARK),
    toward: new RegExp(root + GEO + "{0,4}[\\s.,]*მიმა?რ[თტ]"), // …ის მიმართულებით
  };
});

function extractRoute(rawText) {
  const route = { from: null, to: null };
  if (!rawText) return route;
  const text = normalize(rawText);

  // Primary: grammatical markers. FROM = root+…+დან; TO = root+…+ში/კენ/ამდე,
  // plus "root+…+ის მიმართულებით" (toward X).
  let fromIdx = -1;
  for (const c of CITY_RES) {
    if (!route.from) {
      const m = text.match(c.from);
      if (m) { route.from = c.name; fromIdx = m.index; }
    }
    // Skip the origin city as a destination, so a round trip ("…დან …ში …ში")
    // resolves to the real other-city destination instead of a self-loop.
    if (!route.to && c.name !== route.from && (c.to.test(text) || c.toward.test(text))) route.to = c.name;
  }
  if (route.from && route.from === route.to) route.to = null; // safety

  // Every city mention in text order, for the fallbacks below.
  const hits = [];
  for (const c of CITY_RES) {
    const m = text.match(c.any);
    if (m && !hits.some((h) => h.name === c.name)) hits.push({ idx: m.index, name: c.name });
  }
  hits.sort((a, b) => a.idx - b.idx);

  // A region destination ("…დასავლეთის მიმართულებით") names no stop the website
  // can show; if the post also names a real place after the origin, prefer it —
  // a town over a village ("წნორი-ლაგოდეხი კახეთის მიმართულებით" → Lagodekhi).
  if (route.to && REGIONS.has(route.to)) {
    const after = (h) => !REGIONS.has(h.name) && h.name !== route.from && h.idx > fromIdx;
    const c = hits.find((h) => after(h) && !MINOR.has(h.name)) || hits.find(after);
    if (c) route.to = c.name;
  }
  if (route.from && route.to) return route;

  // Fallback: cities in nominative with no case endings, e.g. "ბათუმი თბილისი",
  // "ქუთაისი — თბილისი", "ბათუმი ➜ თბილისი". Order = origin then destination; a
  // missing destination is the first other city AFTER the origin, so
  // "რუსთავი-თბილისიდან ბათუმი" is Tbilisi → Batumi, not → Rustavi.
  if (!route.from && !route.to) {
    if (hits.length >= 2) { route.from = hits[0].name; route.to = hits[1].name; }
  } else if (!route.to) {
    const o = hits.find((h) => h.name !== route.from && h.idx > fromIdx) ||
      hits.find((h) => h.name !== route.from);
    if (o) route.to = o.name;
  } else if (!route.from) {
    const o = hits.find((h) => h.name !== route.to);
    if (o) route.from = o.name;
  }
  // A self-loop (same city both ends) is meaningless — keep the origin only.
  if (route.from && route.from === route.to) route.to = null;
  return route;
}

// ---- seats -----------------------------------------------------------------
// "2 ადგილი", "მაქვს 3 ადგილი", "ერთი ადგილი". Returns a number or null.
const WORD_NUM = { "ერთი": 1, "ორი": 2, "სამი": 3, "ოთხი": 4, "ხუთი": 5, "ექვსი": 6 };
function extractSeats(rawText) {
  if (!rawText) return null;
  const text = normalize(rawText);
  const digit = text.match(/(\d+)\s*ადგილ/);
  if (digit) return Number(digit[1]);
  for (const [word, n] of Object.entries(WORD_NUM)) {
    if (new RegExp(word + "\\s*ადგილ").test(text)) return n;
  }
  return null;
}

// ---- driver / passenger ----------------------------------------------------
// Weighted cues: STRONG (unambiguous) = 2, WEAK (directional) = 1. Higher wins.
// Georgian marks who gets carried: "გაგიყოლებ" (I'll take YOU — driver) vs
// "გამიყოლე" / "გაგვიყოლეთ" (take ME / US — passenger).
const D_STRONG = new RegExp([
  "(?:მა|გვა)ქვ?ს?\\s*\\d*\\s*(?:თავისუფალი\\s*)?ადგილ", "ადგილ.{0,6}(?:მაქვს|გვაქვს)",
  "თავისუფალია?\\s*(?:\\d+\\s*)?ადგილ",
  "გა[ვბ][იო][ყუ][ოი]ლ", "გაგა?იყოლ", "წავიყოლ", "გამოვიყოლ",       // I'll take along (+ typos)
  "წავიყვან", "წამოვიყვან", "ავიყვან", "გაგიყვან", "წაგიყვან", "წაგიკვან", "მიგყავ",
  "გავყავარ", "მივყავარ", "დავიმგზავრებ", "დაგიმგზავრებ",
  "ჩემი\\s*მანქან", "საკუთარი\\s*მანქან", "მისამართიდან\\s*მისამართზე",
  "(?:კაცი|თითო\\s*მგზავრი|ადამიანზე|ადამიანი)\\s*\\d+\\s*(?:ლარ|₾)", // per-seat price
].join("|"));
const D_WEAK = new RegExp([
  "მივდივარ", "გავდივარ", "გავდუვარ", "ვაგდივარ", "მივდვარ", "მივდუვარ", "მივივარ",
  "გამოვდივარ", "გამომდივარ", "ჩავდივარ", "ამოვდივარ", "გავალ",
  "მსურვე?ლ", "დამემგზავრ", "წამოხვალთ", "წამოხვიდ", "მინივენ", "მარშუ[ტთ]",
  "უსასყ?იდლო", "უსაყიდლო", "უფასო", "უანგარო",
  "(?:ვისაც|ვინმეს)\\s*(?:თუ\\s*)?(?:\\S+\\s+){0,2}(?:უნდა|გინდათ|სურს|გსურთ|სურვილ|გნებავთ)",
].join("|"));
const P_STRONG = new RegExp([
  "ვეძებ", "მჭირდება", "გვჭირდება", "მინდა\\s*ადგილ", "მოძებ", "მანქანა\\s*მჭირ",
  "წამიყვან", "წაგვიყვან", "გამიყოლ", "გაგვიყოლ", "გამომიყოლ", "წამიყოლ", "წაგვიყოლ", // take me / us
  "გამოგყვ", "გამიგყვ", "წამოგყვ", "და[ვგ]ემგზავრ", "დამიმგზავრ", "დაგვიმგზავრ", // we'll ride with you
  "გადავიხდი", "გაქვთ.{0,25}ადგილ", "ადგილი?\\s*(?:თუ\\s*)?გექნებ", "გაიყოლებ(?:თ|ს)",
].join("|"));
// "is anyone going?" — the passenger's question form (verb + prefix variants,
// incl. glued spellings like "ხომარგადიხართ", and verb-first "მიდის ვინმე").
const ASK_VERB = "(?:მიდ[იო]ხართ|მიდიხარ|გადიხართ|მოდიხართ|მიდის|გადის|მოდის|მივა|გავა|მიემგზავ|აპირებ|გეგმავ)";
const P_WEAK = new RegExp(
  "(?:ხომ|ხოარ|ხო\\s*არ|ჰო\\s*არ|ჰოარ|ვინმე|არავინ|თუ)[^.?!]{0,25}" + ASK_VERB +
  "|" + ASK_VERB + "\\s*(?:ვინმე|არავინ)" +
  "|ვინ\\s*" + ASK_VERB + "|მიმყავხართ"
);
// Riders describing themselves: "2 გოგო ვართ", "ორნი ვართ", "ერთი ბიჭი ვარ".
const P_SELF =
  /(?:\d|ორი|სამი|ოთხი|ორნი|სამნი|ოთხნი)\s*(?:ნი\s*)?(?:გოგო\s*|ბიჭი\s*|ადამიანი\s*|კაცი\s*)?ვართ|(?:გოგო|ბიჭი|მგზავრი)\s*ვარ(?![ა-ჰ])|(?<![ა-ჰ])ვარ\s*(?:\d|ერთი)\s*(?:გოგო|ბიჭი|ადამიანი|მგზავრი)/;
// Not ride offers at all, whatever verbs they use: spare tickets, sales, rentals.
const NOT_RIDE = /ბილეთი\s*მაქვს|ზედმეტი\s*ბილეთ|იყიდება|ვყიდი|ქირავდება/;

function classifyType(rawText) {
  if (!rawText) return "unknown";
  const text = normalize(rawText);
  if (NOT_RIDE.test(text)) return "unknown";
  let d = 0, p = 0;
  if (D_STRONG.test(text)) d += 2;
  if (D_WEAK.test(text)) d += 1;
  if (P_STRONG.test(text)) p += 2;
  // A "who's going?" question supports explicit passenger intent even when a
  // generic seat phrase also scored as driver. With no passenger cue, a driver
  // asking for riders still keeps their offer classification.
  if (P_WEAK.test(text) && (d === 0 || p > 0)) p += 1;
  if (P_SELF.test(text)) p += 1;
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

// Georgian number words (roots) for spelled-out hours: "ორ საათში" (in 2h),
// "ორ საათზე" (at 2), "პირველი საათის შემდეგ", "ათის ნახევარზე" (9:30).
const GE_NUM = {
  ერთ: 1, პირველ: 1, ორ: 2, სამ: 3, ოთხ: 4, ხუთ: 5, ექვს: 6, შვიდ: 7, რვა: 8, ცხრა: 9, ათ: 10,
  თერთმეტ: 11, თორმეტ: 12,
};
const HOUR_WORD = "(?<![ა-ჰ])(" + Object.keys(GE_NUM).join("|") + ")(?:ი|ის)?";
// A 1-2 digit number starting here — not the tail of "17:30", "24/7", "12.08".
const NUM = "(?<!\\d)(?<!\\d[:./])(\\d{1,2})";
const re = (src) => new RegExp(src);

// "in N hours/minutes" — a duration relative to when the post was written:
// "ორ საათში" (in 2h), "1-2 საათში", "1 სთში", "ნახევარ საათში" (30 min),
// "საათნახევარში" (90 min), "20 წუთში". Returns the hours and matched phrase,
// or null. The -ში ("into") ending marks a duration, vs "საათზე" = at N o'clock.
const DUR_HOURS_RE = re(NUM + "(?:\\s*[-–]\\s*\\d{1,2})?\\s*(?:სა?ათ|სთ\\.?\\s*)ში");
function durationHours(text) {
  let m = text.match(DUR_HOURS_RE);
  if (m) return { hours: +m[1], match: m[0] };
  if ((m = text.match(/(?<!\d)(\d{1,3})\s*წუთში/))) return { hours: +m[1] / 60, match: m[0] };
  if ((m = text.match(/სა?ათ\s*ნახევარში/))) return { hours: 1.5, match: m[0] };
  if ((m = text.match(/ნახევარ\s*სა?ათში/))) return { hours: 0.5, match: m[0] };
  if ((m = text.match(new RegExp(HOUR_WORD + "\\s*სა?ათში")))) return { hours: GE_NUM[m[1]], match: m[0] };
  return null;
}

const DEP_RE =
  /დღეს|ხვალ|ზეგ|ამაღამ|\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:სა?ათ|სთ)|\d{1,2}\s*[-–]?\s*(?:ში|ზე)|\d{1,2}\s*რიცხვ|საღამო|დილ|შუადღ|ღამ/g;

// Georgian month roots (match any case ending), day precedes month: "30 ივნისს".
const GE_MONTHS = [
  [/იანვ/, 1], [/თებერვ/, 2], [/მარტ/, 3], [/აპრილ/, 4], [/მაის/, 5],
  [/ივნის/, 6], [/ივლის/, 7], [/აგვისტ/, 8], [/სექტემბ/, 9], [/ოქტომბ/, 10],
  [/ნოემბ/, 11], [/დეკემბ/, 12],
];

// A named day ("today/tomorrow/…tonight") — with one present, a small "3-ში"
// is an hour ("დღეს 3ში" = today at 3), not the 3rd of the month.
const DAY_WORD_RE = /დღეს|დგეს|დრეს|ხვალ|ზეგ|ამაღამ|ამაგამ/;
// "now / soon / in the next few hours / tonight" and "I'm leaving/going" imply
// the post's day when no calendar date or later plan is stated. Keep the common
// departure typos aligned with the driver classifier, including plural forms.
const TODAY_RE = /ეხლა|ახლა|ეცლა|მალე|ცოტა\s*ხან|გვიან|ამაღამ|ამაგამ|უახლოეს\s*სა?ათ|(?:გავდივარ|გავდუვარ|ვაგდივარ|მივდივარ|მივდვარ|მივდუვარ|მივივარ|გამოვდივარ|ჩავდივარ|ამოვდივარ)თ?(?![ა-ჰ])/;

// A vague future date must not fall back to today. "შემდეგ" on its own is
// often just the next stop ("ქუთაიში და შემდეგ თბილისში"), not a later day.
const UNRESOLVED_FUTURE_RE = /კვირაში|თვეში|წელიწადში|დღეში|(?:შემდეგ|მომავალ)\s*(?:კვირ|თვ|წელ|დღ)|(?:კვირის|თვის|წლის)\s*(?:ბოლ|შემდეგ)|ამ\s*დღეებში/;
function hasUnresolvedFutureDate(rawText) {
  return UNRESOLVED_FUTURE_RE.test(normalize(rawText));
}

// Weekday roots → JS getUTCDay(). Plain შაბათ (Sat) must not match the compounds
// ორშაბათ/სამშაბათ/…; "კვირას" (on Sunday) only in the dative, since bare კვირა
// also means "week" ("ერთ კვირაში" = in a week).
const GE_WEEKDAYS = [
  [/ორშაბათ/, 1], [/სამშაბათ/, 2], [/ოთხშაბათ/, 3], [/ხუთშაბათ/, 4],
  [/[ფპ]არასკე[ვბ]/, 5], [/(?<!ორ|სამ|ოთხ|ხუთ)შაბათ/, 6], [/კვირას/, 0],
];

// Days from ref until the named weekday (0 = it's today). null if none named.
function weekdayOffset(text, ref) {
  const cur = new Date(Date.UTC(ref.y, ref.m - 1, ref.day)).getUTCDay();
  for (const [re, wd] of GE_WEEKDAYS) if (re.test(text)) return (wd - cur + 7) % 7;
  return null;
}

// "11 რიცხვში" / "22-ში" / "22 ში" = on the 22nd (a DATE — the hour form is
// "22-ზე"). Day-of-month only: this month if still ahead (or just passed — a
// post seen a day late), else next month.
const DAY_OF_MONTH_RE = new RegExp(NUM + "\\s*[-–]?\\s*(რიცხვ|ში)", "g");
function dayOfMonth(text, ref, dayWord) {
  const near = [0, 1, 2].map((n) => addDays(ref, n).day); // today … day after tomorrow
  const rx = new RegExp(DAY_OF_MONTH_RE);
  let m;
  while ((m = rx.exec(text))) {
    const day = +m[1];
    // With a named day, a small N-ში is an hour ("დღეს 3ში" = today at 3) —
    // unless it's that very date ("ხვალ ანუ 10ში" = tomorrow, the 10th).
    if (m[2] === "ში" && dayWord && day <= 12 && !near.includes(day)) continue;
    if (day < 1 || day > 31) continue;
    const ymd = day >= ref.day - 5 ? { y: ref.y, m: ref.m, day }
      : ref.m === 12 ? { y: ref.y + 1, m: 1, day } : { y: ref.y, m: ref.m + 1, day };
    return { ...ymd, match: m[0] };
  }
  return null;
}

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
// when the post was scraped (unlike "today"/"tomorrow"). Returns {y,m,day,match}
// or null; `match` is the text it came from, so the time parser can skip it
// (otherwise "20.07 მივდივარ" also reads as 20:07).
function extractAbsoluteDate(text, ref, dayWord) {
  // "30 ივნისს", "3 ივლისს" — a day number immediately before a Georgian month.
  for (const [re, mon] of GE_MONTHS) {
    const mm = text.match(new RegExp("(\\d{1,2})\\s*[-–]?\\s*" + re.source));
    if (mm) {
      const day = +mm[1];
      if (day >= 1 && day <= 31) return { ...pickYear(mon, day, ref), match: mm[0] };
    }
  }
  // Numeric DD.MM(.YYYY) / DD/MM(/YY). A "." pair could be a time ("7.30"), so it
  // needs a day > 12 or a year; "/" is never a time. "24/7" means "always".
  const rx = /(?:^|[^\d:])(\d{1,2})([./])(\d{1,2})(?:\2(\d{2,4}))?(?![\d:])/g;
  let nm;
  while ((nm = rx.exec(text))) {
    const day = +nm[1], mon = +nm[3], yr = nm[4];
    if (nm[1] === "24" && nm[3] === "7" && nm[2] === "/") continue;
    // "2/3 ადგილი" describes available seats, not February 3.
    if (nm[2] === "/" && /^\s*ადგილ/.test(text.slice(rx.lastIndex))) continue;
    if (day < 1 || day > 31 || mon < 1 || mon > 12) continue;
    if (nm[2] === "." && day <= 12 && !yr) continue;
    const ymd = yr ? { y: +yr < 100 ? 2000 + +yr : +yr, m: mon, day } : pickYear(mon, day, ref);
    return { ...ymd, match: nm[0] };
  }
  return dayOfMonth(text, ref, dayWord);
}

// Clock time in the text → { hour, min, clock } or null. clock=true for an
// explicit HH:MM (taken as written); bare hours ("5-ზე", "7 საათზე") get the
// 12-hour reading in to24().
const HOUR_RES = {
  clock: /(?<!\d)(?<!\d[./])(\d{1,2})[:.](\d{2})(?![\d./])/,            // "10:30", "22.00"
  half: re(NUM + "\\s*[-–]?\\s*ი?ს\\s*ნახევარ"),                        // "11-ის ნახევარზე"
  halfWord: re("(?<!დღის\\s*)" + HOUR_WORD + "\\s*ნახევარ"),             // "ათის ნახევარზე"
  saat: re(NUM + "(?:\\s*[-–,]\\s*|\\s+)?(?:\\d{1,2})?\\s*(?:სა?ათ|სთ)"),  // "7 საათზე", "10-11 საათის"
  ze: re(NUM + "\\s*[-–]?\\s*ზე"),                                        // "5-ზე"
  around: re(NUM + "(?:\\s*[-–,]\\s*\\d{1,2})?\\s*[-–]?\\s*ი?ს\\s*(?:კენ|თვის|მერე|შემდეგ)"),
  window: re(NUM + "\\s*[-–]?\\s*დან\\s*\\d{1,2}\\s*[-–]?\\s*მდე"),        // "11 დან 12მდე"
  shi: re(NUM + "\\s*[-–]?\\s*ში"),                                        // "დღეს 3ში"
  word: re(HOUR_WORD + "\\s*სა?ათ"),                                       // "ორ საათზე"
};
function extractHour(t, dayWord) {
  const H = HOUR_RES;
  let m;
  if ((m = t.match(H.clock))) return { hour: +m[1], min: +m[2], clock: true };
  // "11-ის ნახევარზე" = half past TEN (Georgian counts toward the next hour);
  // but "დღის პირველ ნახევარში" is "the first half of the day".
  if ((m = t.match(H.half))) return { hour: (+m[1] + 11) % 12 || 12, min: 30 };
  if ((m = t.match(H.halfWord))) return { hour: (GE_NUM[m[1]] + 11) % 12 || 12, min: 30 };
  // a range ("10-11 საათისთვის", "7 8 საათზე") takes its start
  if ((m = t.match(H.saat))) return { hour: +m[1], min: 0 };
  if ((m = t.match(H.ze))) return { hour: +m[1], min: 0 };
  // "2-3 ისკენ", "12 სკენ", "4ისთვის", "6 ის მერე", "8 ის შემდეგ" — around/after N
  if ((m = t.match(H.around))) return { hour: +m[1], min: 0 };
  if ((m = t.match(H.window))) return { hour: +m[1], min: 0 };
  // "დღეს 3ში" — with a named day, a small N-ში is an hour (see dayOfMonth)
  if (dayWord && (m = t.match(H.shi)) && +m[1] <= 12) return { hour: +m[1], min: 0 };
  if ((m = t.match(H.word))) return { hour: GE_NUM[m[1]], min: 0 };
  return null;
}

// Part-of-day words, as the index of their first mention (-1 = absent).
// Greetings ("დილა მშვიდობის", "საღამო მშვიდობისა") say nothing about the ride,
// so they're blanked first.
const GREETING = /(?:დილა|საღამო|ღამე)\s*მშვიდობ[ა-ჰ]*/g;
function timeCues(t) {
  const s = t.replace(GREETING, " ");
  const at = (rx) => { const m = s.match(rx); return m ? m.index : -1; };
  const c = {
    evening: at(/სა[ღგდრხ]ამ|ამაღამ|ამაგამ/),   // + typos საგამოს/სადამოს/saxamos
    night: at(/(?<!ამა|სა)ღამ/),
    morning: at(/დილ|გამთენ|პირველ\s*ნახევარ/),
    dawn: at(/გამთენ/),
    afternoon: at(/შუა\s*დღ|შიადღ|დღის\s*(?:მეორე|\d)|\d\s*(?:სა?ათზე\s*)?დღის/),
    secondHalf: at(/მეორე\s*ნახევარ/),
    late: at(/გვიან/),
  };
  // Two parts of the day ("ამაღამ ან ხვალ დილით") — the first one named is the
  // plan, the other the fallback.
  c.first = ["evening", "night", "morning"].filter((k) => c[k] >= 0).sort((a, b) => c[a] - c[b])[0] || null;
  return c;
}

// Georgians speak in 12-hour time — nobody says "22-ზე" — so a bare hour is read
// the likely way: 1-7 → afternoon/evening (5-ზე = 17:00), 8-11 stay morning
// unless an evening/"late" word says otherwise. Morning words keep it AM; night
// words make 1-5 the small hours ("ღამის 2" = 02:00); 12 at night is midnight.
function to24(h, c, clock) {
  const pm = h >= 1 && h <= 11 ? h + 12 : h;
  if (clock) return c.first === "evening" || (c.first === "night" && h >= 6) ? pm : h; // "8:30 საღამოს"
  if (c.first === "morning") return h;
  if (c.first === "night") return h === 12 ? 0 : h <= 5 ? h : pm;
  if (c.first === "evening") return h === 12 ? 0 : pm;
  if (c.afternoon >= 0 || c.late >= 0 || h <= 7) return pm;
  return h;
}

// Part-of-day with no number: "საღამოს" → 19:00, "დილით" → 08:00, …
function defaultHour(c) {
  if (c.first === "evening") return 19;
  if (c.first === "night") return 22;
  if (c.first === "morning") return c.dawn === c.morning ? 5 : 8;
  if (c.secondHalf >= 0) return 15;
  if (c.afternoon >= 0) return 13;
  return null;
}

function extractDeparture(rawText, refIso) {
  if (!rawText) return {};
  const text = normalize(rawText);
  const ref = tbilisiYMD(refIso);
  const dayWord = DAY_WORD_RE.test(text);
  const abs = extractAbsoluteDate(text, ref, dayWord);
  const later = hasUnresolvedFutureDate(rawText);
  const wd = weekdayOffset(text, ref);
  // A weekday qualified by "next week" is not necessarily its next occurrence.
  // Without a concrete calendar date, retain the uncertainty instead of dating
  // it today just because a clock time or "გავდივარ" also appears.
  if (!abs && later && !dayWord) return {};

  // "in N hours" — resolves off the capture time to an absolute departure. Only
  // meaningful for a post seen ~when written (a fresh monitor capture), so it's
  // tagged 'relative' and the promote gate trusts it only for those.
  const dur = durationHours(text);
  if (dur != null && refIso && !abs && !/ხვალ|ზეგ/.test(text) && wd == null) {
    const { date, time } = tbilisiDateTime(new Date(refIso).getTime() + dur.hours * 3600 * 1000);
    return {
      departureDate: date,
      departureTime: time,
      departureAt: `${date}T${time}:00${TZ}`,
      departureText: `${dur.hours} საათში`,
      dateSource: "relative",
    };
  }

  let dayOffset = null;
  if (/დღეს|დგეს|დრეს/.test(text)) dayOffset = 0;
  else if (/ხვალ/.test(text)) dayOffset = 1;
  else if (/ზეგ/.test(text)) dayOffset = 2;
  else {
    if (wd != null) dayOffset = wd;
    else if (TODAY_RE.test(text)) dayOffset = 0;
  }

  // An explicit date in the text ("30 ივნისს") beats a relative word — it's true
  // regardless of when we scraped it. Fall back to today/tomorrow only otherwise.
  let rest = abs ? text.replace(abs.match, " ") : text;
  // A duration that conflicts with an explicit day is not a clock time.
  if (dur) rest = rest.split(dur.match).join(" ");

  const cues = timeCues(rest);
  const hm = extractHour(rest, dayWord);
  let hour = hm ? to24(hm.hour, cues, hm.clock) : defaultHour(cues);
  let min = hm ? hm.min : 0;
  if (hour != null && (hour > 23 || min > 59)) { hour = null; min = 0; }

  if (dayOffset == null && hour == null && !abs) return {};

  let ymd = abs || addDays(ref, dayOffset || 0);
  if (hm && !hm.clock && hour === 0 && hm.hour === 12) ymd = addDays(ymd, 1); // midnight "tonight"
  const date = `${ymd.y}-${String(ymd.m).padStart(2, "0")}-${String(ymd.day).padStart(2, "0")}`;
  const time = hour != null ? `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}` : null;
  return {
    departureDate: date,
    departureTime: time,
    departureAt: time ? `${date}T${time}:00${TZ}` : null,
    departureText: (text.match(DEP_RE) || []).join(" ") || (dayOffset === 0 ? (text.match(TODAY_RE) || [])[0] : null) || null,
    // "absolute" = dated from the text (trustworthy any time); "relative" = from
    // today/tomorrow, only trustworthy if captured fresh. null = date unknown.
    dateSource: abs ? "absolute" : dayOffset != null ? "relative" : null,
  };
}

// ---- top level -------------------------------------------------------------
function enrich(post) {
  const text = post.text || "";
  const route = extractRoute(text);
  // "today/tomorrow" mean relative to when the post was WRITTEN — known when the
  // extension read it from the page data (postedAt), else ≈ when we saw it.
  const dep = extractDeparture(text, post.postedAt || post.capturedAt);
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

module.exports = {
  enrich, normalize, extractPhones, redactContact, classifyType, extractRoute, extractSeats, extractDeparture, hasUnresolvedFutureDate,
};
