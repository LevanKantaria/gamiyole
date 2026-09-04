# FB Group Monitor

A Manifest V3 browser extension that reads posts from a Facebook **group you admin**
(from your own logged-in browser session) and forwards them to a local server that
**enriches** each post and stores it in a **SQLite database** you can query.

Built for a Georgian rideshare group, so each raw post is parsed into structured fields:

- **author** + **Facebook profile** (user id + URL)
- **phone numbers** (Georgian `5XX…` / `+995…`, grouping-agnostic)
- **user type** — `driver` / `passenger` / `unknown` (rule-based on Georgian cues)
- **route** — from → to city (uses the `-დან` / `-ში` case markers, plus `City-City` dashes)
- **departure** — resolves `დღეს`/`ხვალ`/`ზეგ` + `17ში` / `17:00` / `საღამოს` into an absolute
  date + hour (Georgia is UTC+4, no DST), relative to the post's capture time
- **seats**, **readable date**, original text

**Comments too.** When someone asks for a driver, the drivers who reply in the comments are
captured as their own records (`kind='comment'`, linked to the post via `parent_id`) and run
through the same enrichment — so a commenting driver lands in the DB with their phone, profile,
and type. (Only comments that render in the feed are captured; Facebook lazy-loads the rest.)

**Direction from the post.** A comment ("I'll take you") rarely restates the route, so a
comment with no route/time of its own **inherits them from the post it replies to**, flagged
`route_inherited` / `departure_inherited` (shown with a ↩︎ in the dashboard). This runs after
every ingest and once at server startup, so it also backfills comments captured earlier.

> ⚠️ **Read this first.** Meta deprecated the Facebook Groups API in April 2024 — there is
> no official way to read group posts anymore. This extension works by reading the DOM of the
> group page in your own browser. That violates Facebook's Terms of Service even for a group
> you own; the realistic risk is account restriction, not legal action, but use it on an
> account you're willing to risk. It only sees posts that actually render in the feed, so it's
> "monitor what scrolls by," not a complete firehose. Facebook's markup changes often, so the
> selectors in `content.js` will need occasional patching.

## Layout

```
fb-group-monitor/
├── extension/        # load this unpacked in Chrome
│   ├── manifest.json
│   ├── content.js    # reads posts from the group DOM (MutationObserver)
│   ├── background.js # buffers + POSTs batches to your server, retries
│   ├── popup.html/js # config: on/off, group, endpoint, API key
│   └── icons/
└── server/
    ├── index.js       # HTTP: /ingest + query endpoints
    ├── parse.js       # rule-based enrichment (phones, type, route, seats)
    ├── db.js          # SQLite schema + upserts + queries (rides.db)
    └── package.json   # depends on better-sqlite3
```

## Run the server

```bash
cd server
npm install          # first time — builds better-sqlite3
node index.js        # or: API_KEY=yoursecret node index.js
```

Data lives in `server/rides.db` (SQLite), keyed by post id so re-ingesting dedupes.

**Endpoints**

- `POST /ingest` — the extension posts `{ "posts": [...] }`; each is enriched + stored.
- `GET /posts?type=driver&limit=200` — posts (optionally filter `driver`/`passenger`), each with its `phones[]`.
- `GET /phones` — every captured number with who posted it, their type, and route.
- `GET /contacts` — **one row per phone**: the same person collapsed across every post/comment/thread, with all names they used, `# seen`, types, and routes. The dashboard's **Contacts** tab renders each number as a WhatsApp link.
- `GET /profiles` — people (by FB user id), ranked by post count.
- `GET /stats` — totals, driver/passenger split, top routes.

Each new post also prints as it arrives, e.g.
`• [driver] Tbilisi→Batumi · <author> · +9955XXXXXXXX · <text>`

## Paste-import a comment thread

Some threads are just drivers dropping their phone numbers under one post. When
the DOM harvest isn't worth it, **copy the comment text** from the post and paste it
into the dashboard's **Import ⛭** tab: give the post URL, pick "Drivers", paste, Import.

It parses each `Name → number` block (handles `+995…`, spaced `598 922 177`,
`wa.me/…` links, "· " separators), keeps only entries containing a phone, and links
them all to that post via `parent_id`. The per-person FB profile link is lost (plain
text has no hrefs), but name + number + which-post are kept. Also available as
`POST /import-text` with `{ url, text, assumeType }`.

## Data model

| table | one row per | key columns |
|-------|-------------|-------------|
| `posts` | post **or comment** | `post_id`, `kind` (post/comment), `parent_id`, `author_user_id`, `user_type`, `route_from`, `route_to`, `seats`, `departure_date`, `departure_time`, `departure_at`, `text`, `date`, `enriched_by` |
| `phones` | number | `post_id`, `phone` (many per post) |
| `profiles` | person | `user_id`, `name`, `url`, `post_count`, `first_seen`, `last_seen` |

Enrichment is **rule-based and offline** (`parse.js`) — no API keys, no cost. The
driver/passenger + route rules are Georgian-specific; adjust the keyword and city
lists there as you see real data. Posts the rules can't type are stored as
`user_type='unknown'` and cleaned up on demand by Claude Desktop (below).

## Classifying the `unknown` posts with Claude Desktop

The offline rules only match Georgian script, so transliterated posts
(`"Dges vinme xom ar gadixart dasavletisken"`) and unusual phrasing land as
`unknown`. Instead of paying per-post for the API, an **MCP server** (`mcp.js`)
lets **Claude Desktop** classify them in batches, on demand, using your existing
Claude Desktop usage. It writes straight back into `rides.db`.

Already wired into `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
"mcpServers": {
  "rideshare-db": { "command": "node", "args": [".../server/mcp.js"] }
}
```

**To use it:** restart Claude Desktop, then in a chat say
*"classify the unclassified rideshare posts."* Claude will:
1. call `get_unclassified_posts` for a batch,
2. read each post/comment (Georgian or Latin) and decide driver / passenger / unknown,
3. call `apply_classifications` to write type + route + seats + phones + departure back,
4. repeat until `get_stats` shows `unclassified: 0`.

Say *"fill in missing departure times"* to run the same loop over
`get_posts_missing_departure` — driver/passenger rows where the rules found no time but
the text has one. `get_unclassified_posts` and that tool both return `captured_at` so
Claude resolves `დღეს`/`ხვალ` correctly, and it writes the `+04:00` timestamp for you.

A post Claude reviews is marked `enriched_by='claude'`, so it's never re-fed —
even if it stays `unknown` (e.g. a non-ride post). The three tools are read/write
against the local DB only; nothing leaves your machine except what you ask Claude
Desktop to reason over.

## Load the extension

1. Chrome → `chrome://extensions` → toggle **Developer mode** on.
2. **Load unpacked** → select the `extension/` folder.
3. Click the extension icon to open the popup and set:
   - **Monitoring on**
   - **Group id / slug** — the part after `/groups/` in your group URL (blank = any group).
   - **Server endpoint** — e.g. `http://localhost:8787/ingest`.
   - **API key** — match the server's `API_KEY` (or leave blank if the server has none).
4. Open your group at `https://www.facebook.com/groups/<your-group>/` and sort by **New posts**.
   New posts get forwarded as they render.

### 24/7 monitor (scheduler)

For unattended monitoring of several groups, use the popup's **24/7 monitor** box:
enable it, set the interval (default 30 min), and paste the group URLs (one per line).

Every interval, the background worker cycles the groups in **one dedicated tab**:
navigates to each (sorted newest-first), runs an **incremental crawl** that scrolls
only until it reaches posts already in the DB (a persistent seen-set, capped ~40),
then moves on. New posts + their comments flow through the normal pipeline; the
server dedups, so nothing is double-stored.

- **Needs an always-on machine** with this Chrome profile open and **logged into Facebook** — the scrape uses your real session. Keep that Chrome window un-minimized (background tabs get throttled).
- **Self-healing:** if a cycle is cut short (worker suspended, machine asleep), the next one catches up, because "stop when you hit seen posts" naturally resumes from where it left off.
- If Facebook logs out, the monitor detects it and the popup shows a warning instead of silently capturing nothing.
- **"Run one cycle now"** triggers a cycle immediately for testing.

### Reliability guarantees (and the test that proves them)

`node test/extension.test.js` runs the real `content.js` against a simulated
Facebook feed with a stubbed `chrome` API. It asserts:

- **One run at a time.** Crawl / harvest / monitor take a run lock, and the
  `MutationObserver`'s live scan is suppressed while any run is active. Without
  this the live scan stole freshly-rendered posts, so the monitor saw them as its
  "already captured" boundary and stopped early — the test catches exactly that
  regression (it fails with 2/4 posts captured and a stray `via:"live"` tag).
- **The UI can never get stuck.** Every run reports a final state from a
  `finally`, with the active flag cleared *before* the report. The popup also
  treats a run whose heartbeat went quiet (closed/navigated tab) as finished.
- **Stop always works.** `STOP_MONITOR` aborts an in-flight scroll; Stop for a
  crawl messages the tab that started it *plus* every open group tab, and clears
  local state regardless. Turning the monitor off aborts the running cycle rather
  than just skipping the next one.
- **An aborted cold start stays unseeded**, so the next run resumes seeding
  instead of silently switching to boundary logic with a half-seeded group.
- **Failures are never silent.** The scheduler polls a `PING` until the feed
  actually renders (instead of a fixed sleep) and reports `unreachable` /
  `not-ready` / `timeout` / `logged-out` per group, shown in the popup — so a
  broken group can't masquerade as "0 new posts".

### Two modes

- **Live monitoring** — with *Monitoring on*, any post that renders while you're on the group
  page is captured and forwarded as it appears.
- **Crawl** — set a **limit** (e.g. 100) and hit **Start crawl**. The extension scrolls the
  feed, waits for each batch to render, parses posts one by one, and stops when it hits the
  limit or reaches the end of the feed. The popup shows live progress (`captured X/limit`);
  **Stop** halts it early. Crawl works even if live monitoring is off. Keep the group tab
  focused/open while it runs.

## How it works

- `content.js` watches the page with a `MutationObserver`. For each `[role="article"]` it
  extracts a stable **post id** from the permalink (`/groups/<gid>/posts/<id>/`), plus author,
  text, and the relative timestamp. It dedupes per page-session and messages the background worker.
- `background.js` keeps a small persistent outbox in `chrome.storage` (survives the worker
  sleeping), POSTs batches to your endpoint, and retries every minute if the server was down.
- The server dedupes again by post id, so restarting either side won't double-store.

## Deploying the server to Firebase (matches your stack)

The ingest handler is plain Node HTTP, so it drops into a Cloud Function with minimal change:

```js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.ingest = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const { posts = [] } = req.body || {};
  const db = admin.database();
  await Promise.all(posts.filter(p => p?.postId).map(p =>
    db.ref(`fbGroupPosts/${p.postId}`).update(p)  // RTDB path handles dedup
  ));
  res.json({ ok: true, received: posts.length });
});
```

Then point the extension's **endpoint** at the function URL and add an `X-Api-Key` check.

## Cleaner, ToS-safe channels to combine

- Your **Facebook Page** still has a real API + webhooks (posts, comments) — no scraping.
- **Group email notifications** to a dedicated inbox can feed the same server via a mail webhook.
