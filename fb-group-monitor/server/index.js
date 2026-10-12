// Ingest + query server for the FB Group Monitor.
// Receives batches of posts, enriches them (phones, type, route, seats),
// stores them in a local SQLite DB, and exposes read endpoints.
//
// Run:  node index.js        (add API_KEY=secret to require X-Api-Key on /ingest)

const http = require("http");
const fs = require("fs");
const path = require("path");
const { enrich } = require("./parse");
const { parseCommentText, parsePostUrl } = require("./import-text");
const { upsertPost, inheritCommentContext, reenrichRoutes, queries, DB_FILE } = require("./db");
const { promoteRides, clearExternalRides, evaluateCandidates } = require("./promote");

const DASHBOARD = path.join(__dirname, "dashboard.html");

const PORT = process.env.PORT || 8787;
const API_KEY = process.env.API_KEY || "";
// A plain `node index` should publish when Firebase credentials are installed.
// Explicit 0 still disables publishing; explicit 1 also exposes credential errors.
const HAS_FIREBASE_CREDENTIALS = !!process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  fs.existsSync(path.join(__dirname, "serviceAccount.json"));
const AUTO_PROMOTE = process.env.AUTO_PROMOTE === "1" ||
  (process.env.AUTO_PROMOTE !== "0" && HAS_FIREBASE_CREDENTIALS);
const PROMOTE_MODE = AUTO_PROMOTE ? "enabled" : process.env.AUTO_PROMOTE === "0"
  ? "disabled by AUTO_PROMOTE=0" : "Firebase credentials missing";
// With AUTO_PROMOTE on, also re-promote on a timer — picks up rides Claude
// enriched via mcp.js (no ingest involved) and expires past-dated listings.
const PROMOTE_INTERVAL_MIN = Number(process.env.PROMOTE_INTERVAL_MIN) || 15;
const PROMOTE_LOG = path.join(__dirname, "promote.log");

// Single promote runner: calls from ingest, crawl-done, the timer and startup
// can overlap, so never run two passes at once — a request that arrives while
// one is running queues exactly one follow-up pass (which sees the newer DB).
let promoteRunning = null;
let promotePending = false;
let lastPromote = null;
function runPromote(reason) {
  if (promoteRunning) { promotePending = true; return promoteRunning; }
  promoteRunning = promoteRides()
    .then((s) => {
      lastPromote = { at: new Date().toISOString(), reason, ok: true, ...s };
      logPromote(`${reason}: rides ${s.qualified}/${s.candidates} qualified, ${s.written} posted, ${s.removed} stale removed; requests ${s.requestsQualified}/${s.requestCandidates} qualified, ${s.requestsWritten} posted, ${s.requestsRemoved} stale removed`);
      return s;
    })
    .catch((e) => {
      lastPromote = { at: new Date().toISOString(), reason, ok: false, error: e.message };
      logPromote(`${reason}: FAILED ${e.message}`);
      throw e;
    })
    .finally(() => {
      promoteRunning = null;
      if (promotePending) { promotePending = false; runPromote(`${reason}+queued`).catch(() => {}); }
    });
  return promoteRunning;
}
// Console window scrolls away / closes on reboot — keep a file you can check.
function logPromote(line) {
  const stamped = `[${new Date().toISOString()}] promote ${line}`;
  console.log(stamped);
  fs.appendFile(PROMOTE_LOG, stamped + "\n", () => {});
}

function readableDate(p) {
  if (p.timeText && p.timeText.trim()) return p.timeText.trim();
  for (const t of [p.postedAt, p.capturedAt]) { // when written if known, else when seen
    const d = t ? new Date(t) : null;
    if (d && !isNaN(d)) return d.toLocaleString();
  }
  return "unknown";
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 8_000_000) reject(new Error("payload too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj, null, 2));
}

const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Render the promotion inspector as a standalone HTML table. refreshSecs>0 makes
// the page reload itself so it tracks a running crawl live.
function renderCandidates(d, refreshSecs = 0) {
  const meta = refreshSecs > 0
    ? `<meta http-equiv="refresh" content="${refreshSecs}">` : "";
  const now = new Date().toLocaleTimeString();
  const refreshNote = refreshSecs > 0
    ? `auto-refreshing every ${refreshSecs}s · loaded ${now} · <a href="?refresh=0">stop</a>`
    : `not auto-refreshing · loaded ${now} · <a href="?refresh=15">auto-refresh</a>`;
  const reasons = Object.entries(d.byReason)
    .sort((a, b) => b[1] - a[1])
    .map(([r, n]) => `<span class="pill">${esc(r)}: <b>${n}</b></span>`)
    .join(" ");
  const rows = d.items
    .map((it) => {
      const badge = it.verdict === "qualified"
        ? `<span class="ok">✓ ${esc(it.reason)}</span>`
        : `<span class="no">✗ ${esc(it.reason)}</span>`;
      const link = it.link
        ? `<a href="${esc(it.link)}" target="_blank" rel="noopener">post↗</a>` : "—";
      const cap = (it.captured || "").slice(5, 16).replace("T", " "); // MM-DD HH:MM
      // "Ureki (Batumi)" when a place is grouped under the site's nearest city
      const place = (p, site) => esc(p) + (site && site !== p ? ` <small style="color:#65676b">(${esc(site)})</small>` : "");
      return `<tr class="${it.verdict}">
        <td>${badge}</td>
        <td>${place(it.from, it.siteFrom)} → ${place(it.to, it.siteTo)}</td>
        <td>${esc(it.date) || "—"} ${esc(it.time) || ""}</td>
        <td>${esc(it.dateSource) || "—"}</td>
        <td>${esc(it.via) || "—"}</td>
        <td style="white-space:nowrap;color:#65676b">${esc(cap) || "—"}</td>
        <td>${link}</td>
        <td class="txt">${esc(it.text)}</td>
      </tr>`;
    })
    .join("");
  return `<!doctype html><meta charset="utf-8">${meta}<title>Promote inspector</title>
  <style>
    body{font:13px/1.4 system-ui,sans-serif;margin:20px;color:#1c1e21}
    h1{font-size:17px} .sum{margin:8px 0 14px}
    .pill{display:inline-block;background:#eef;border-radius:10px;padding:2px 8px;margin:2px}
    table{border-collapse:collapse;width:100%} th,td{border-bottom:1px solid #e5e7eb;padding:6px 8px;text-align:left;vertical-align:top}
    th{background:#f6f8fb;position:sticky;top:0}
    tr.qualified{background:#f0fdf4} .ok{color:#15803d;font-weight:700;white-space:nowrap}
    .no{color:#6b7280;white-space:nowrap} .txt{color:#65676b;max-width:420px}
    a{color:#1877f2}
  </style>
  <h1>Promote inspector <small style="color:#65676b">— today ${esc(d.today)}</small></h1>
  <div class="sum" style="color:#65676b;font-size:12px">${refreshNote}</div>
  <div class="sum">showing newest <b>${d.shown}</b> of <b>${d.total}</b> driver-route posts (freshest crawl first) · <b style="color:#15803d">${d.qualified} qualified</b> · rejected: ${reasons || "none"}</div>
  <table><thead><tr><th>verdict</th><th>route</th><th>date</th><th>date&nbsp;src</th><th>seen&nbsp;via</th><th>captured</th><th>link</th><th>text</th></tr></thead>
  <tbody>${rows}</tbody></table>`;
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Api-Key");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, "http://localhost");

  // ---- dashboard ----
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    return fs.readFile(DASHBOARD, (err, buf) => {
      if (err) { res.writeHead(500); return res.end("dashboard missing"); }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(buf);
    });
  }

  // ---- ingest ----
  if (req.method === "POST" && url.pathname === "/ingest") {
    if (API_KEY && req.headers["x-api-key"] !== API_KEY) {
      res.writeHead(401); return res.end("unauthorized");
    }
    try {
      const { posts = [] } = JSON.parse((await readBody(req)) || "{}");
      let added = 0, processed = 0;
      for (const raw of posts) {
        if (!raw || !raw.postId) continue;
        const enriched = { ...enrich(raw), date: readableDate(raw) };
        const isNew = upsertPost(enriched);
        processed++;
        if (isNew) {
          added++;
          const r = [enriched.routeFrom, enriched.routeTo].filter(Boolean).join("→") || "?";
          console.log(
            `• [${enriched.userType}] ${r} · ${enriched.author || "?"}` +
            (enriched.phones.length ? ` · ${enriched.phones.join(", ")}` : "") +
            ` · ${(enriched.text || "").replace(/\s+/g, " ").slice(0, 70)}`
          );
        }
      }
      // Give comments a direction/time from the post they reply to.
      const inh = inheritCommentContext();
      if (inh.route || inh.departure) {
        console.log(`  ↳ inherited from parent post: ${inh.route} routes, ${inh.departure} times`);
      }
      console.log(`ingest: received ${posts.length}, new ${added}`);
      // Optionally surface any new qualifying rides on the website right away.
      // Never let a promote failure break ingest — it's a best-effort side task.
      if (AUTO_PROMOTE && processed > 0) runPromote("ingest").catch(() => {});
      return json(res, 200, { ok: true, received: posts.length, added, processed, inherited: inh });
    } catch (e) {
      res.writeHead(400); return res.end("bad request: " + e.message);
    }
  }

  // ---- paste-import: a pasted comment thread (text, no DOM) ----
  if (req.method === "POST" && url.pathname === "/import-text") {
    if (API_KEY && req.headers["x-api-key"] !== API_KEY) {
      res.writeHead(401); return res.end("unauthorized");
    }
    try {
      const body = JSON.parse((await readBody(req)) || "{}");
      const { groupId, postId } = parsePostUrl(body.url || "");
      if (!postId) return json(res, 400, { ok: false, error: "need a post URL like /groups/<id>/permalink/<id>/" });

      const records = parseCommentText(body.text || "", {
        parentId: postId,
        groupId,
        assumeType: body.assumeType || null,      // e.g. "driver" for a numbers thread
        requirePhone: body.requirePhone !== false, // default: keep only entries with a number
      });

      let added = 0, phones = 0;
      for (const rec of records) {
        if (upsertPost({ ...rec, date: readableDate(rec) })) added++;
        phones += rec.phones.length;
      }
      inheritCommentContext();
      console.log(`import-text: post ${postId} → ${records.length} parsed, ${added} new, ${phones} phones`);
      return json(res, 200, { ok: true, parsed: records.length, added, phones });
    } catch (e) {
      res.writeHead(400); return res.end("bad request: " + e.message);
    }
  }

  // ---- queries ----
  if (req.method === "GET" && url.pathname === "/posts") {
    const type = url.searchParams.get("type") || undefined; // driver|passenger|unknown
    const limit = Number(url.searchParams.get("limit")) || 200;
    return json(res, 200, queries.listPosts(limit, type));
  }
  if (req.method === "GET" && url.pathname === "/phones") {
    return json(res, 200, queries.listPhones());
  }
  if (req.method === "GET" && url.pathname === "/contacts") {
    return json(res, 200, queries.contacts());
  }

  // Re-run the improved route parser over stored rows (adds/upgrades routes).
  if (req.method === "POST" && url.pathname === "/reenrich") {
    if (API_KEY && req.headers["x-api-key"] !== API_KEY) {
      res.writeHead(401); return res.end("unauthorized");
    }
    const r = reenrichRoutes();
    console.log(`reenrich: ${r.routes} routes, ${r.types} types, ${r.inherited.route} inherited to comments`);
    return json(res, 200, { ok: true, ...r });
  }
  // Push qualifying driver rides to the gamiyole website (externalRides node).
  if (req.method === "POST" && url.pathname === "/promote") {
    if (API_KEY && req.headers["x-api-key"] !== API_KEY) {
      res.writeHead(401); return res.end("unauthorized");
    }
    try {
      if (url.searchParams.get("clear") === "1") {
        const s = await clearExternalRides();
        console.log(`promote/clear: removed ${s.removed} external listings`);
        return json(res, 200, { ok: true, cleared: s.removed });
      }
      // ?reason=crawl — sent by the extension when a monitor cycle finishes.
      // Honors AUTO_PROMOTE so turning it off really means "promote by hand".
      const reason = url.searchParams.get("reason");
      if (reason === "crawl" && !AUTO_PROMOTE) {
        return json(res, 200, { ok: true, skipped: "AUTO_PROMOTE is off" });
      }
      if (url.searchParams.get("dry") === "1") {
        const s = await promoteRides({ dryRun: true });
        console.log(`promote (dry): ${s.qualified}/${s.candidates} qualified`);
        return json(res, 200, { ok: true, ...s });
      }
      const s = await runPromote(reason === "crawl" ? "crawl-done" : "manual");
      return json(res, 200, { ok: true, ...s });
    } catch (e) {
      return json(res, 500, { ok: false, error: e.message });
    }
  }
  if (req.method === "GET" && url.pathname === "/promote/status") {
    return json(res, 200, { autoPromote: AUTO_PROMOTE, mode: PROMOTE_MODE, dbFile: DB_FILE,
      intervalMin: PROMOTE_INTERVAL_MIN, running: !!promoteRunning, last: lastPromote });
  }
  // Promotion inspector: every driver-route post with a qualify/reject verdict
  // + reason. `.html` renders a table; otherwise JSON. Read-only (no Firebase).
  if (req.method === "GET" && (url.pathname === "/promote/candidates" || url.pathname === "/promote/candidates.html")) {
    const limit = Math.min(2000, Number(url.searchParams.get("limit")) || 300);
    const data = evaluateCandidates(limit);
    if (url.pathname.endsWith(".html")) {
      const rp = url.searchParams.get("refresh");
      const refreshSecs = rp == null ? 15 : Math.max(0, Number(rp) || 0);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(renderCandidates(data, refreshSecs));
    }
    return json(res, 200, data);
  }
  if (req.method === "GET" && url.pathname === "/profiles") {
    return json(res, 200, queries.listProfiles());
  }
  if (req.method === "GET" && url.pathname === "/stats") {
    return json(res, 200, queries.stats());
  }

  res.writeHead(404); res.end("not found");
});

server.listen(PORT, () => {
  // Connect any already-stored comments to their post's direction/time
  // (covers comments captured before this feature existed).
  const inh = inheritCommentContext();
  if (inh.route || inh.departure) {
    console.log(`backfill: linked ${inh.route} comments to a route, ${inh.departure} to a departure time`);
  }
  console.log(`FB Group Monitor server on http://localhost:${PORT}`);
  console.log(`  DB: ${DB_FILE}`);
  console.log(`  open http://localhost:${PORT}  →  dashboard`);
  console.log(`  POST /ingest                 receive + enrich + store posts`);
  console.log(`  GET  /posts[?type=&limit=]   posts (filter by driver/passenger)`);
  console.log(`  GET  /phones                 all captured numbers + who/route`);
  console.log(`  GET  /contacts               one row per phone (deduped people)`);
  console.log(`  GET  /profiles               people, ranked by post count`);
  console.log(`  GET  /stats                  totals, type split, top routes`);
  console.log(`  POST /promote[?dry=1]        push good driver rides → gamiyole website`);
  console.log(`  GET  /promote/candidates.html  inspector: every candidate + why it did/didn't qualify`);
  console.log(`  GET  /promote/status         last auto-promote result (also logged to promote.log)`);
  if (AUTO_PROMOTE) {
    console.log(`  auto-promote: ON (startup, new posts, end of every crawl, every ${PROMOTE_INTERVAL_MIN} min)`);
    // Publish whatever already qualifies right now, so booting the service
    // reflects the current DB instead of waiting for the next crawl.
    runPromote("startup").catch(() => {});
    setInterval(() => runPromote("timer").catch(() => {}), PROMOTE_INTERVAL_MIN * 60000);
  } else {
    console.log(`  auto-promote: OFF (${PROMOTE_MODE}) — captured posts will not publish automatically`);
  }
  if (!API_KEY) console.log("  auth: OFF (set API_KEY to require X-Api-Key)");
});
