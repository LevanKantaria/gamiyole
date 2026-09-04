// db.js — local SQLite store for enriched rideshare posts.
// Three tables: posts (one row per post), phones (one row per number, many per
// post), profiles (one row per person, aggregated across their posts).

const Database = require("better-sqlite3");
const path = require("path");
const { enrich } = require("./parse");

const DB_FILE = process.env.DB_FILE || path.join(__dirname, "rides.db");
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    post_id       TEXT PRIMARY KEY,
    group_id      TEXT,
    author_name   TEXT,
    author_user_id TEXT,
    author_url    TEXT,
    text          TEXT,
    user_type     TEXT,          -- driver | passenger | unknown
    route_from    TEXT,
    route_to      TEXT,
    seats         INTEGER,
    permalink     TEXT,
    date          TEXT,          -- human-readable
    captured_at   TEXT,          -- ISO
    raw           TEXT           -- original JSON, for reprocessing
  );

  CREATE TABLE IF NOT EXISTS phones (
    post_id  TEXT,
    phone    TEXT,
    PRIMARY KEY (post_id, phone)
  );

  CREATE TABLE IF NOT EXISTS profiles (
    user_id    TEXT PRIMARY KEY,
    name       TEXT,
    url        TEXT,
    post_count INTEGER DEFAULT 0,
    first_seen TEXT,
    last_seen  TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_posts_type  ON posts(user_type);
  CREATE INDEX IF NOT EXISTS idx_posts_route ON posts(route_from, route_to);
  CREATE INDEX IF NOT EXISTS idx_phones_phone ON phones(phone);
`);

// Migrations: add columns to an existing DB in place. `enriched_by` tracks who
// last enriched a row ('rules'|'claude'); `kind`/`parent_id` distinguish comments
// from posts; the departure_* columns hold the computed ride time.
const cols = db.prepare(`PRAGMA table_info(posts)`).all().map((c) => c.name);
const addCol = (name, decl) => {
  if (!cols.includes(name)) db.exec(`ALTER TABLE posts ADD COLUMN ${name} ${decl}`);
};
addCol("enriched_by", "TEXT DEFAULT 'rules'");
addCol("kind", "TEXT DEFAULT 'post'");   // 'post' | 'comment'
addCol("parent_id", "TEXT");             // for comments: the post they belong to
addCol("departure_date", "TEXT");        // YYYY-MM-DD
addCol("departure_time", "TEXT");        // HH:MM
addCol("departure_at", "TEXT");          // ISO with +04:00
addCol("departure_text", "TEXT");        // the raw phrase(s) matched
addCol("route_inherited", "INTEGER DEFAULT 0");     // 1 = direction taken from parent post
addCol("departure_inherited", "INTEGER DEFAULT 0"); // 1 = departure taken from parent post
addCol("date_source", "TEXT");    // 'absolute' (dated in text) | 'relative' (today/tomorrow) | null
addCol("captured_via", "TEXT");   // 'monitor' | 'crawl' | 'live' — how the extension saw it

db.exec(`CREATE INDEX IF NOT EXISTS idx_posts_parent ON posts(parent_id);`);

const upsertPostStmt = db.prepare(`
  INSERT INTO posts (post_id, group_id, kind, parent_id, author_name, author_user_id, author_url,
                     text, user_type, route_from, route_to, seats,
                     departure_date, departure_time, departure_at, departure_text, date_source,
                     permalink, date, captured_at, captured_via, raw)
  VALUES (@post_id, @group_id, @kind, @parent_id, @author_name, @author_user_id, @author_url,
          @text, @user_type, @route_from, @route_to, @seats,
          @departure_date, @departure_time, @departure_at, @departure_text, @date_source,
          @permalink, @date, @captured_at, @captured_via, @raw)
  ON CONFLICT(post_id) DO UPDATE SET
    kind=excluded.kind, parent_id=excluded.parent_id,
    author_name=excluded.author_name, author_user_id=excluded.author_user_id,
    author_url=excluded.author_url, text=excluded.text, user_type=excluded.user_type,
    route_from=excluded.route_from, route_to=excluded.route_to, seats=excluded.seats,
    departure_date=excluded.departure_date, departure_time=excluded.departure_time,
    departure_at=excluded.departure_at, departure_text=excluded.departure_text,
    date_source=excluded.date_source,
    permalink=excluded.permalink, date=excluded.date, raw=excluded.raw,
    -- once the live monitor has genuinely seen a post, keep it trusted forever;
    -- otherwise record however it was last seen (crawl/live).
    captured_via=CASE WHEN posts.captured_via='monitor' OR excluded.captured_via='monitor'
                      THEN 'monitor' ELSE excluded.captured_via END
`);

const delPhonesStmt = db.prepare(`DELETE FROM phones WHERE post_id = ?`);
const insPhoneStmt = db.prepare(`INSERT OR IGNORE INTO phones (post_id, phone) VALUES (?, ?)`);
const existsStmt = db.prepare(`SELECT 1 FROM posts WHERE post_id = ?`);

const upsertProfileStmt = db.prepare(`
  INSERT INTO profiles (user_id, name, url, post_count, first_seen, last_seen)
  VALUES (@user_id, @name, @url, 1, @seen, @seen)
  ON CONFLICT(user_id) DO UPDATE SET
    name=excluded.name, url=excluded.url,
    post_count=profiles.post_count + @increment,
    last_seen=excluded.last_seen
`);

// Insert or update one enriched post. Returns true if it was new.
const upsertPost = db.transaction((p) => {
  const isNew = !existsStmt.get(p.postId);
  upsertPostStmt.run({
    post_id: p.postId,
    group_id: p.groupId || null,
    kind: p.kind || "post",
    parent_id: p.parentId || null,
    author_name: p.author || null,
    author_user_id: p.authorUserId || null,
    author_url: p.authorUrl || null,
    text: p.text || null,
    user_type: p.userType || "unknown",
    route_from: p.routeFrom || null,
    route_to: p.routeTo || null,
    seats: p.seats ?? null,
    departure_date: p.departureDate || null,
    departure_time: p.departureTime || null,
    departure_at: p.departureAt || null,
    departure_text: p.departureText || null,
    date_source: p.dateSource || null,
    permalink: p.permalink || null,
    date: p.date || null,
    captured_at: p.capturedAt || null,
    captured_via: p.via || null,
    raw: JSON.stringify(p),
  });

  delPhonesStmt.run(p.postId);
  for (const phone of p.phones || []) insPhoneStmt.run(p.postId, phone);

  if (p.authorUserId) {
    upsertProfileStmt.run({
      user_id: p.authorUserId,
      name: p.author || null,
      url: p.authorUrl || null,
      seen: p.capturedAt || null,
      increment: isNew ? 1 : 0, // don't inflate post_count on re-ingest
    });
  }
  return isNew;
});

// ---- read helpers (for the query endpoints) --------------------------------
const q = {
  posts: db.prepare(`SELECT * FROM posts ORDER BY captured_at DESC LIMIT ?`),
  byType: db.prepare(`SELECT * FROM posts WHERE user_type = ? ORDER BY captured_at DESC LIMIT ?`),
  phonesFor: db.prepare(`SELECT phone FROM phones WHERE post_id = ?`),
  allPhones: db.prepare(`
    SELECT ph.phone, p.author_name, p.user_type, p.route_from, p.route_to, p.date
    FROM phones ph JOIN posts p ON p.post_id = ph.post_id
    ORDER BY p.captured_at DESC`),
  // One row per phone: the same person collapsed across every post/comment/thread.
  contacts: db.prepare(`
    SELECT ph.phone AS phone,
      COUNT(*) AS appearances,
      GROUP_CONCAT(DISTINCT p.author_name) AS names,
      GROUP_CONCAT(DISTINCT NULLIF(p.user_type,'unknown')) AS types,
      GROUP_CONCAT(DISTINCT CASE WHEN p.route_from IS NOT NULL OR p.route_to IS NOT NULL
        THEN COALESCE(p.route_from,'?') || '→' || COALESCE(p.route_to,'?') END) AS routes,
      MAX(p.date) AS last_date,
      MAX(p.captured_at) AS last_seen
    FROM phones ph JOIN posts p ON p.post_id = ph.post_id
    GROUP BY ph.phone
    ORDER BY appearances DESC, last_seen DESC
    LIMIT ?`),
  profiles: db.prepare(`SELECT * FROM profiles ORDER BY post_count DESC, last_seen DESC LIMIT ?`),
  countByType: db.prepare(`SELECT user_type, COUNT(*) n FROM posts GROUP BY user_type`),
  topRoutes: db.prepare(`
    SELECT route_from, route_to, COUNT(*) n FROM posts
    WHERE route_from IS NOT NULL AND route_to IS NOT NULL
    GROUP BY route_from, route_to ORDER BY n DESC LIMIT 10`),
  totals: db.prepare(`SELECT
    (SELECT COUNT(*) FROM posts) posts,
    (SELECT COUNT(DISTINCT phone) FROM phones) phones,
    (SELECT COUNT(*) FROM profiles) profiles`),
};

function withPhones(row) {
  return { ...row, phones: q.phonesFor.all(row.post_id).map((r) => r.phone) };
}

// ---- comment ↔ post direction ---------------------------------------------
// A comment ("I'll take you") rarely restates the route — the direction lives
// in the post it replies to. Fill a comment's missing route/departure from its
// parent post, flagged as inherited so it's clear the value was inferred.
// Idempotent: only touches comments that still lack their own value.
const inheritRouteStmt = db.prepare(`
  UPDATE posts AS c
  SET route_from = p.route_from, route_to = p.route_to, route_inherited = 1
  FROM posts AS p
  WHERE c.kind = 'comment' AND c.parent_id = p.post_id
    AND c.route_from IS NULL AND c.route_to IS NULL
    AND p.route_from IS NOT NULL`);

const inheritDepartureStmt = db.prepare(`
  UPDATE posts AS c
  SET departure_date = p.departure_date, departure_time = p.departure_time,
      departure_at = p.departure_at, departure_inherited = 1
  FROM posts AS p
  WHERE c.kind = 'comment' AND c.parent_id = p.post_id
    AND c.departure_at IS NULL
    AND p.departure_at IS NOT NULL`);

function inheritCommentContext() {
  const route = inheritRouteStmt.run().changes;
  const departure = inheritDepartureStmt.run().changes;
  return { route, departure };
}

// ---- re-run the (improved) route parser over stored rows --------------------
// Only rule-enriched, non-inherited rows; only WRITES a route when one is found,
// so it can add/upgrade routes but never wipes an existing or Claude-set value.
const allRulesRowsStmt = db.prepare(
  `SELECT post_id, text, captured_at,
          COALESCE(route_inherited,0) AS route_inherited,
          COALESCE(departure_inherited,0) AS departure_inherited
   FROM posts WHERE enriched_by = 'rules'`
);
const updateRouteStmt = db.prepare(
  `UPDATE posts SET route_from = @route_from, route_to = @route_to WHERE post_id = @post_id`
);
const updateTypeStmt = db.prepare(
  `UPDATE posts SET user_type = @user_type WHERE post_id = @post_id`
);
const updateDepartureStmt = db.prepare(
  `UPDATE posts SET departure_date = @departure_date, departure_time = @departure_time,
     departure_at = @departure_at, date_source = @date_source
   WHERE post_id = @post_id`
);

const resetInheritedRouteStmt = db.prepare(
  `UPDATE posts SET route_from = NULL, route_to = NULL, route_inherited = 0
   WHERE kind = 'comment' AND route_inherited = 1`
);

// Re-run the improved parser over rule-enriched rows. Routes: only on non-inherited
// rows, only when found (never wipes). Types: only UPGRADE — apply a new driver/
// passenger label, but never downgrade an existing label back to unknown (so
// paste-imported/assumed drivers keep their type when their text is just a number).
const reenrichRoutes = db.transaction(() => {
  let routes = 0, types = 0, dates = 0;
  for (const r of allRulesRowsStmt.all()) {
    const e = enrich({ text: r.text, capturedAt: r.captured_at });
    if (!r.route_inherited && (e.routeFrom || e.routeTo)) {
      updateRouteStmt.run({ post_id: r.post_id, route_from: e.routeFrom, route_to: e.routeTo });
      routes++;
    }
    if (e.userType !== "unknown") {
      updateTypeStmt.run({ post_id: r.post_id, user_type: e.userType });
      types++;
    }
    // Recompute departure (now understands explicit dates) on non-inherited rows,
    // only when a date is found — corrects "ხვალ 30 ივნისს" to the real date and
    // stamps date_source, never wiping an existing value.
    if (!r.departure_inherited && e.departureDate) {
      updateDepartureStmt.run({
        post_id: r.post_id,
        departure_date: e.departureDate,
        departure_time: e.departureTime || null,
        departure_at: e.departureAt || null,
        date_source: e.dateSource || null,
      });
      dates++;
    }
  }
  resetInheritedRouteStmt.run();
  const inherited = inheritCommentContext();
  return { routes, types, dates, inherited };
});

// ---- LLM-assist (used by the MCP server / Claude Desktop) ------------------
// Posts the rules couldn't type, and that Claude hasn't reviewed yet.
// captured_at is included so Claude can resolve "today"/"tomorrow" correctly.
const unclassifiedStmt = db.prepare(`
  SELECT post_id, kind, text, route_from, route_to, seats,
         departure_date, departure_time, captured_at
  FROM posts
  WHERE user_type = 'unknown' AND enriched_by = 'rules'
  ORDER BY captured_at DESC
  LIMIT ?`);

// Ride offers/requests where the rules found no departure time, but the text
// may still contain one (e.g. odd phrasing / transliteration). Claude fills these.
const missingDepartureStmt = db.prepare(`
  SELECT post_id, kind, text, captured_at
  FROM posts
  WHERE user_type IN ('driver','passenger') AND departure_at IS NULL
  ORDER BY captured_at DESC
  LIMIT ?`);

const applyClassStmt = db.prepare(`
  UPDATE posts SET
    user_type      = @user_type,
    route_from     = COALESCE(@route_from, route_from),
    route_to       = COALESCE(@route_to,   route_to),
    seats          = COALESCE(@seats,       seats),
    departure_date = COALESCE(@departure_date, departure_date),
    departure_time = COALESCE(@departure_time, departure_time),
    departure_at   = COALESCE(@departure_at,   departure_at),
    enriched_by    = 'claude'
  WHERE post_id = @post_id`);

// Apply one Claude classification; also merge any phones it found.
// If Claude gives a date + time we build the +04:00 timestamp for it.
const applyClassification = db.transaction((item) => {
  const date = item.departureDate || null;
  const time = item.departureTime || null;
  const at = date && time ? `${date}T${time}:00+04:00` : null;
  const info = applyClassStmt.run({
    post_id: item.postId,
    user_type: item.userType || "unknown",
    route_from: item.routeFrom || null,
    route_to: item.routeTo || null,
    seats: item.seats ?? null,
    departure_date: date,
    departure_time: time,
    departure_at: at,
  });
  if (info.changes && Array.isArray(item.phones)) {
    for (const phone of item.phones) insPhoneStmt.run(item.postId, phone);
  }
  return info.changes > 0;
});

const unclassifiedCountStmt = db.prepare(
  `SELECT COUNT(*) n FROM posts WHERE user_type='unknown' AND enriched_by='rules'`
);
const missingDepartureCountStmt = db.prepare(
  `SELECT COUNT(*) n FROM posts WHERE user_type IN ('driver','passenger') AND departure_at IS NULL`
);

// Driver ride-offers good enough to surface on the gamiyole website as
// "external" listings (see promote.js). Must be an actual post (not a comment
// reply), typed driver, with a real route, a future-capable date, and a
// permalink to link back to. City validity + future-date checks happen in JS.
const promotableStmt = db.prepare(`
  SELECT post_id, group_id, route_from, route_to, seats,
         departure_date, departure_time, departure_at, permalink, captured_at, text
  FROM posts
  WHERE kind = 'post'
    AND user_type = 'driver'
    AND route_from IS NOT NULL AND route_to IS NOT NULL
    AND route_from <> route_to
    AND departure_date IS NOT NULL AND departure_date >= @today
    AND (permalink IS NOT NULL OR group_id IS NOT NULL)
    AND captured_via = 'monitor'
  ORDER BY departure_date ASC
  LIMIT @limit`);

// Every driver ride-offer with a route — the universe of things that COULD be
// promoted. The inspector (see promote.js evaluateCandidates) runs each through
// the same gate as listPromotable and labels why it did/didn't qualify.
// Candidates = only what the live monitor freshly captured (captured_via='monitor').
// The big historical archive (bulk crawls / backfill) is a write-only record and
// is deliberately NOT surfaced here — a fresh setup shows ~0 and grows with runs.
const promoteCandidatesStmt = db.prepare(`
  SELECT post_id, group_id, route_from, route_to, seats, departure_date, departure_time,
         date_source, captured_via, permalink, captured_at, text
  FROM posts
  WHERE kind = 'post' AND user_type = 'driver' AND captured_via = 'monitor'
    AND route_from IS NOT NULL AND route_to IS NOT NULL
  ORDER BY captured_at DESC
  LIMIT @limit`);
const promoteCandidatesCountStmt = db.prepare(`
  SELECT COUNT(*) n FROM posts
  WHERE kind = 'post' AND user_type = 'driver' AND captured_via = 'monitor'
    AND route_from IS NOT NULL AND route_to IS NOT NULL`);

const queries = {
  // today = YYYY-MM-DD (Tbilisi). The trust rule is load-bearing: FB hides post
  // timestamps, so we only surface a ride whose date we can actually trust —
  // either it's stated explicitly in the text (date_source='absolute'), or the
  // live monitor saw the post fresh (captured_via='monitor', ≈ written time). A
  // bulk backfill's relative-dated posts (today/tomorrow stamped at crawl time)
  // are exactly what this excludes.
  listPromotable: (today, limit = 500) => promotableStmt.all({ today, limit }),
  promoteCandidates: (limit = 300) => promoteCandidatesStmt.all({ limit }),
  promoteCandidatesCount: () => promoteCandidatesCountStmt.get().n,
  listPosts: (limit = 200, type) =>
    (type ? q.byType.all(type, limit) : q.posts.all(limit)).map(withPhones),
  listPhones: () => q.allPhones.all(),
  contacts: (limit = 5000) =>
    q.contacts.all(limit).map((r) => ({
      phone: r.phone,
      appearances: r.appearances,
      names: r.names ? [...new Set(r.names.split(","))] : [],
      types: r.types ? [...new Set(r.types.split(","))] : [],
      routes: r.routes ? [...new Set(r.routes.split(","))] : [],
      lastDate: r.last_date,
    })),
  listProfiles: (limit = 200) => q.profiles.all(limit),
  stats: () => ({
    totals: q.totals.get(),
    byType: q.countByType.all(),
    topRoutes: q.topRoutes.all(),
    unclassified: unclassifiedCountStmt.get().n,
    missingDeparture: missingDepartureCountStmt.get().n,
  }),
  listUnclassified: (limit = 40) => unclassifiedStmt.all(limit),
  listMissingDeparture: (limit = 40) => missingDepartureStmt.all(limit),
};

module.exports = { db, upsertPost, applyClassification, inheritCommentContext, reenrichRoutes, queries, DB_FILE };
