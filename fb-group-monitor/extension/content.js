// content.js — runs inside facebook.com/groups/* pages.
// Facebook is a React SPA with obfuscated class names, so we select by the
// stable post-only data-ad-rendering-role attributes (profile_name / story_message /
// the action bar) rather than CSS classes or role="article" (which marks comments,
// not posts). New posts are picked up with a MutationObserver.

(() => {
  const SEEN = new Set(); // post ids already forwarded this page-session
  let enabled = false;
  let groupFilter = ""; // only forward when URL contains this group id/slug

  // ---- helpers ---------------------------------------------------------------
  //
  // Facebook feed posts are NOT reliably marked with role="article" (in current
  // builds only COMMENTS carry role="article", e.g. aria-label="Comment by …").
  // What IS reliable are the post-only data-ad-rendering-role attributes:
  //   profile_name  → the post author (comments never have this)
  //   story_message → the post body text
  //   like_button / comment_button / share_button → the post action bar
  // So we anchor on the author element and walk up to the post container.

  const PERMALINK_RE = /\/groups\/([^/]+)\/(?:posts|permalink)\/(\d+)/;
  const ACTION_BAR_SEL =
    '[data-ad-rendering-role="comment_button"], [data-ad-rendering-role="like_button"], [data-ad-rendering-role="share_button"]';

  // Post facts from the data FB loaded (see page-hook.js, which runs in the page's
  // own JS world): FB only puts a post's own link in the DOM once its timestamp
  // is hovered, but the hook reads each post's id and creation time from the
  // page's JSON/GraphQL payloads, keyed by the opening of the post's text.
  const STORIES = new Map(); // storyKey(text) → { postId, groupId, url, time, author }
  const storyKey = (text) => String(text || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "").slice(0, 60);
  document.addEventListener("fbgm:story", (e) => {
    try {
      const s = JSON.parse(e.detail);
      if (!s || !s.key || !s.postId) return;
      const cur = STORIES.get(s.key);
      if (!cur || (s.time || 0) >= (cur.time || 0)) STORIES.set(s.key, s); // same text twice → newer post
    } catch (err) { void err; }
  });
  document.dispatchEvent(new CustomEvent("fbgm:hello")); // replay what the hook saw before we loaded

  // Cheap stable hash → base36 string, for posts that expose no numeric id.
  function hashId(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return "h" + (h >>> 0).toString(36);
  }

  // From an author element, climb to the smallest ancestor that also contains
  // the post's action bar — that ancestor is the whole post (body + comments).
  function postContainerOf(authorEl) {
    let node = authorEl.parentElement;
    for (let i = 0; i < 30 && node; i++) {
      if (node.querySelector && node.querySelector(ACTION_BAR_SEL)) return node;
      node = node.parentElement;
    }
    return null;
  }

  function extractPost(authorEl, container) {
    const author = (authorEl.innerText || authorEl.textContent || "").trim() || null;

    // Author's Facebook profile — taken from WITHIN the profile_name element so
    // it's the poster, never a commenter. Href looks like /groups/<gid>/user/<id>/.
    let authorUserId = null;
    let authorUrl = null;
    const authorLink = authorEl.querySelector('a[href*="/user/"], a[href*="/profile.php"]');
    if (authorLink) {
      const href = authorLink.getAttribute("href") || "";
      const um = href.match(/\/user\/(\d+)/) || href.match(/profile\.php\?id=(\d+)/);
      if (um) authorUserId = um[1];
      const clean = href.split("?")[0].split("&")[0];
      authorUrl = clean.startsWith("/") ? "https://www.facebook.com" + clean : clean;
    }

    // Body text: the post-only story_message container. Never a comment.
    let text = "";
    const msgEl = container.querySelector(
      '[data-ad-rendering-role="story_message"], [data-ad-comet-preview="message"], [data-ad-preview="message"]'
    );
    if (msgEl) text = (msgEl.innerText || msgEl.textContent || "").trim();

    // Post id from any post link in the container (a comment permalink embeds the
    // PARENT post id too). FB uses several forms; we PREFER a numeric id (stable
    // for dedup) but accept the opaque pfbid form so we still get a real post URL
    // instead of falling back to the group feed.
    let postId = null;
    let groupId = null;
    let pfbid = null;
    let pfbidGroup = null;
    for (const a of container.querySelectorAll(
      'a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid="]'
    )) {
      const href = a.getAttribute("href") || "";
      // /groups/<gid>/posts|permalink/<numeric> — best, stop here.
      let m = href.match(/\/groups\/([^/?]+)\/(?:posts|permalink)\/(\d+)/);
      if (m) { groupId = m[1]; postId = m[2]; break; }
      // ?story_fbid=<numeric>&id=<gid> (older/permalink.php form).
      m = href.match(/story_fbid=(\d+)/);
      if (m) { const g = href.match(/[?&]id=(\d+)/); postId = m[1]; groupId = g ? g[1] : groupId; break; }
      // /groups/<gid>/posts|permalink/<pfbid…> — opaque but a working URL; keep
      // as a fallback and keep scanning for a numeric id first.
      if (!pfbid) {
        m = href.match(/\/groups\/([^/?]+)\/(?:posts|permalink)\/(pfbid[A-Za-z0-9]+)/);
        if (m) { pfbidGroup = m[1]; pfbid = m[2]; }
      }
    }
    // No numeric id in the DOM → the page data usually has it (see STORIES).
    const story = STORIES.get(storyKey(text));
    if (!postId && story) {
      postId = story.postId;
      const gm = authorLink && (authorLink.getAttribute("href") || "").match(/\/groups\/([^/?]+)\//);
      groupId = story.groupId || (gm && gm[1]) || currentGroupId();
    }
    if (!postId && pfbid) { groupId = pfbidGroup; postId = pfbid; }
    // Fallback identity for posts with no id anywhere. Posts captured before the
    // page data was available have this id, so it's also sent as aliasId to keep
    // recognizing them (monitor boundary) and to merge them server-side.
    const hashed = hashId((author || "") + "|" + text.slice(0, 200));
    if (!postId) postId = hashed;

    const hasRealId = groupId && (/^\d+$/.test(postId) || /^pfbid/.test(postId));
    const permalink = hasRealId
      ? `https://www.facebook.com/groups/${groupId}/posts/${postId}/`
      : location.href;
    // When the post was written (not when we saw it) — anchors "today/tomorrow".
    const postedAt = story && story.postId === postId && story.time
      ? new Date(story.time * 1000).toISOString() : null;

    // DIAGNOSTIC: when we couldn't find a post permalink, dump every link the
    // post actually exposed so the matcher can be extended. Look for "[FBGM]"
    // in the group tab's console. (Temporary — remove once patterns cover it.)
    if (!hasRealId) {
      try {
        const hrefs = [...new Set(
          [...container.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).filter(Boolean)
        )].slice(0, 15);
        console.log("[FBGM] no post link · " + (text || author || "").replace(/\s+/g, " ").slice(0, 45), hrefs);
      } catch (e) { void e; }
    }

    // The post timestamp is CSS-scrambled and not readably in the DOM; postedAt
    // comes from the page data when we have it, else the server uses capturedAt.
    return {
      postId,
      aliasId: postId !== hashed ? hashed : null,
      groupId,
      permalink,
      author,
      authorUserId,
      authorUrl,
      text,
      timeText: null,
      postedAt,
      capturedAt: new Date().toISOString(),
      url: location.href,
    };
  }

  // Comments render as nested role="article" with aria-label="Comment by …" and
  // a permalink carrying ?comment_id=. We capture each as its own record linked
  // to the parent post — e.g. drivers replying to a passenger's request.
  function extractComments(container, parentPostId, parentGroupId) {
    const out = [];
    const arts = container.querySelectorAll('[role="article"]');
    for (const art of arts) {
      const label = art.getAttribute("aria-label") || "";
      if (!/^\s*(comment|reply|replied)\b/i.test(label)) continue;

      // comment id + parent post id from the comment permalink (or data-commentid)
      let commentId = null, groupId = parentGroupId, parentId = parentPostId;
      const permA = art.querySelector('a[href*="comment_id="]');
      if (permA) {
        const href = permA.getAttribute("href") || "";
        const pm = href.match(/\/groups\/([^/]+)\/posts\/(\d+)\/.*comment_id=(\d+)/);
        if (pm) { groupId = pm[1]; parentId = pm[2]; commentId = pm[3]; }
      }
      if (!commentId) {
        const cid = art.closest("[data-commentid]") || art.querySelector("[data-commentid]");
        if (cid) commentId = cid.getAttribute("data-commentid");
      }
      if (!commentId || SEEN.has(commentId)) continue;

      // author — the first profile link with visible text (skips the hidden avatar link)
      let author = null, authorUserId = null, authorUrl = null;
      for (const a of art.querySelectorAll('a[href*="/user/"], a[href*="/profile.php"]')) {
        const t = (a.textContent || "").trim();
        if (!t) continue;
        author = t;
        const href = a.getAttribute("href") || "";
        const um = href.match(/\/user\/(\d+)/) || href.match(/profile\.php\?id=(\d+)/);
        if (um) authorUserId = um[1];
        const clean = href.split("?")[0];
        authorUrl = clean.startsWith("/") ? "https://www.facebook.com" + clean : clean;
        break;
      }
      if (!author) {
        const lm = label.match(/^\s*comment by\s+(.+?)\s+\d/i);
        if (lm) author = lm[1];
      }

      // text — dir="auto" blocks in THIS comment (not a nested reply), and not
      // inside a link (author name & timestamp live in <a> elements).
      let text = "";
      art.querySelectorAll('div[dir="auto"]').forEach((n) => {
        if (n.closest('[role="article"]') !== art) return;
        if (n.closest("a")) return;
        const t = (n.innerText || n.textContent || "").trim();
        if (t && t.length > text.length) text = t;
      });

      const timeText = permA ? (permA.textContent || "").trim() || null : null;
      SEEN.add(commentId);
      out.push({
        postId: commentId,
        parentId,
        kind: "comment",
        groupId,
        author,
        authorUserId,
        authorUrl,
        text,
        timeText,
        capturedAt: new Date().toISOString(),
        permalink: parentId
          ? `https://www.facebook.com/groups/${groupId}/posts/${parentId}/?comment_id=${commentId}`
          : location.href,
        url: location.href,
      });
    }
    return out;
  }

  // Set by scan() whenever the pass encountered a post already in SEEN — i.e.
  // we've reached posts captured on a previous check. The incremental monitor
  // uses this as its "caught up, stop scrolling" boundary.
  let lastScanSawSeen = false;

  // ---- run lock ---------------------------------------------------------------
  // Exactly one explicit run (crawl / harvest / monitor) at a time, and the
  // MutationObserver's live scan must never run alongside one.
  //
  // Why this matters: scrolling during a monitor run fires the observer, whose
  // live scan would capture the freshly-rendered posts FIRST and add them to
  // SEEN. The monitor's own scan would then see them as already-seen, flip
  // lastScanSawSeen, and stop at once — so the monitor silently captured almost
  // nothing whenever the "Monitoring on" toggle happened to be enabled.
  let activeRun = null; // 'crawl' | 'harvest' | 'monitor' | null
  function beginRun(kind) {
    if (activeRun) return false;
    activeRun = kind;
    return true;
  }
  function endRun() { activeRun = null; }

  // Returns the number of NEW POSTS captured this pass (comments don't count
  // toward the crawl limit, but are still captured and forwarded).
  // `force` bypasses the enabled toggle; `cap` limits how many new posts to take.
  // `via` records how we saw the post ('monitor'|'crawl'|'live') — the server
  // only trusts relative dates ("today") from 'monitor' captures (genuinely new).
  function scan(force = false, cap = Infinity, ignoreFilter = false, via = "live") {
    lastScanSawSeen = false;
    // Never let the live/observer scan run inside an explicit run (see run lock).
    if (!force && activeRun) return 0;
    if (!force && !enabled) return 0;
    if (!ignoreFilter && groupFilter && !location.pathname.includes(groupFilter)) return 0;
    if (cap <= 0) return 0;

    const feed = document.querySelector('[role="feed"]') || document;
    // Each post has exactly one author element; comments do not have one.
    const authorEls = feed.querySelectorAll('[data-ad-rendering-role="profile_name"]');

    const batch = [];
    let newPosts = 0;
    const seenContainers = new Set();
    for (const authorEl of authorEls) {
      if (newPosts >= cap) break;
      const container = postContainerOf(authorEl);
      if (!container || seenContainers.has(container)) continue;
      seenContainers.add(container);

      const post = extractPost(authorEl, container);
      if (post && post.postId) {
        if (SEEN.has(post.postId) || (post.aliasId && SEEN.has(post.aliasId))) {
          // Reached a post from a previous check — the new/old boundary.
          lastScanSawSeen = true;
          continue;
        }
        SEEN.add(post.postId);
        if (post.aliasId) SEEN.add(post.aliasId);
        batch.push(post);
        newPosts++;
        // capture the commenters on this post too
        for (const c of extractComments(container, post.postId, post.groupId)) batch.push(c);
      }
    }

    if (batch.length) {
      for (const p of batch) p.via = via; // tag posts + their comments with the capture mode
      chrome.runtime.sendMessage({ type: "POSTS", posts: batch }, () => {
        // swallow "receiving end does not exist" if worker is asleep; it will wake.
        void chrome.runtime.lastError;
      });
    }
    return newPosts;
  }

  // Debounced scan so a burst of DOM mutations triggers one pass.
  let scanTimer = null;
  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 400);
  }

  // ---- wiring ----------------------------------------------------------------

  const observer = new MutationObserver(scheduleScan);

  function start() {
    observer.observe(document.body, { childList: true, subtree: true });
    scheduleScan();
  }

  // Read current config, then react to changes from the popup.
  chrome.storage.local.get(["enabled", "groupFilter"], (cfg) => {
    enabled = !!cfg.enabled;
    groupFilter = cfg.groupFilter || "";
    start();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.enabled) enabled = !!changes.enabled.newValue;
    if (changes.groupFilter) groupFilter = changes.groupFilter.newValue || "";
    scheduleScan();
  });

  // ---- crawl controller ------------------------------------------------------
  // On demand: scroll the feed, wait for each batch to render, capture new posts,
  // and stop when we hit the target limit or run out of new posts (end of feed).

  let crawl = null;

  function reportCrawl(status) {
    chrome.storage.local.set({
      crawlProgress: {
        active: !!(crawl && crawl.running),
        captured: crawl ? crawl.captured : 0,
        limit: crawl ? crawl.limit : 0,
        status,
        at: new Date().toISOString(),
      },
    });
  }

  async function runCrawl(limit) {
    if (groupFilter && !location.pathname.includes(groupFilter)) {
      crawl = { running: false, captured: 0, limit };
      reportCrawl("wrong-group"); // not on the configured group page
      return;
    }
    if (!beginRun("crawl")) {
      reportCrawl("busy"); // a crawl/harvest/monitor run is already in progress
      return;
    }

    crawl = { running: true, captured: 0, limit, idleRounds: 0 };
    reportCrawl("running");

    const MAX_IDLE = 4;         // consecutive scrolls with no new posts => end of feed
    const WAIT_MS = 2500;       // let posts render + network settle after each scroll
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    let reason = "end-of-feed";
    try {
      // Capture whatever is already on screen first (never exceed the limit).
      crawl.captured += scan(true, limit - crawl.captured, false, "crawl");
      reportCrawl("running");

      while (crawl.running && crawl.captured < limit && crawl.idleRounds < MAX_IDLE) {
        const beforeHeight = document.body.scrollHeight;
        window.scrollTo(0, document.body.scrollHeight);
        await wait(WAIT_MS);

        const newCount = scan(true, limit - crawl.captured, false, "crawl");
        crawl.captured += newCount;

        // Idle if nothing new was captured AND the page didn't grow taller.
        const grew = document.body.scrollHeight > beforeHeight;
        if (newCount === 0 && !grew) crawl.idleRounds += 1;
        else crawl.idleRounds = 0;

        reportCrawl("running");
      }
      reason = !crawl.running ? "stopped"
        : crawl.captured >= limit ? "limit-reached"
        : "end-of-feed";
    } catch (e) {
      reason = "error";
    } finally {
      // Clear the flag BEFORE the final report, so crawlProgress.active is false
      // and the popup's Start button can never stay disabled after a failure.
      crawl.running = false;
      endRun();
      reportCrawl(reason);
    }
  }

  function stopCrawl() {
    if (crawl) crawl.running = false;
    reportCrawl("stopped");
  }

  // ---- comment harvester -----------------------------------------------------
  // For a SINGLE post's page (…/permalink/<id>/ or …/posts/<id>/): expand and
  // scroll the whole comment thread, capturing every comment (drivers posting
  // their numbers, etc.). Unlike the feed crawl, the "unit" here is comments.

  let harvest = null;

  function currentPostId() {
    const m = location.pathname.match(/\/(?:permalink|posts)\/(\d+)/);
    return m ? m[1] : null;
  }
  function currentGroupId() {
    const m = location.pathname.match(/\/groups\/([^/]+)/);
    return m ? m[1] : null;
  }

  // Georgian + English labels for the "view more comments / replies / see more"
  // controls. Matched against short clickable elements only.
  const EXPANDER_RE =
    /(view|see)\s+\d*\s*(more|previous|all)?\s*(comment|repl)|more\s+comment|previous\s+comment|see\s+more|\d+\s+repl(y|ies)|(მეტი|წინა|ყველა).{0,6}კომენტ|პასუხ.{0,6}ნახვა|კომენტ.{0,6}ნახვა/i;

  function clickExpanders() {
    let clicked = 0;
    for (const n of document.querySelectorAll('[role="button"], [tabindex]')) {
      if (n.__fbgmClicked) continue;
      const t = (n.innerText || n.textContent || "").trim();
      if (!t || t.length > 40) continue;
      if (EXPANDER_RE.test(t)) {
        try { n.click(); n.__fbgmClicked = true; clicked++; } catch (e) { /* ignore */ }
      }
    }
    return clicked;
  }

  function reportHarvest(status) {
    chrome.storage.local.set({
      harvestProgress: {
        active: !!(harvest && harvest.running),
        captured: harvest ? harvest.captured : 0,
        status,
        at: new Date().toISOString(),
      },
    });
  }

  async function runHarvest() {
    const postId = currentPostId();
    const groupId = currentGroupId();
    if (!postId) { harvest = { running: false, captured: 0 }; reportHarvest("not-a-post"); return; }
    if (!beginRun("harvest")) { reportHarvest("busy"); return; }

    harvest = { running: true, captured: 0 };
    reportHarvest("running");
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const MAX_IDLE = 4, WAIT_MS = 2200;
    let idle = 0;

    // Capture the post itself + whatever comments are already rendered.
    scan(true);
    const first = extractComments(document, postId, groupId);
    if (first.length) {
      chrome.runtime.sendMessage({ type: "POSTS", posts: first }, () => void chrome.runtime.lastError);
      harvest.captured += first.length;
    }
    reportHarvest("running");

    let reason = "done";
    try {
      while (harvest.running && idle < MAX_IDLE) {
        const beforeH = document.body.scrollHeight;
        const clicked = clickExpanders();          // "view more comments/replies"
        window.scrollTo(0, document.body.scrollHeight);
        await wait(WAIT_MS);

        const batch = extractComments(document, postId, groupId); // already dedups via SEEN
        if (batch.length) {
          chrome.runtime.sendMessage({ type: "POSTS", posts: batch }, () => void chrome.runtime.lastError);
          harvest.captured += batch.length;
        }

        const grew = document.body.scrollHeight > beforeH;
        if (batch.length === 0 && clicked === 0 && !grew) idle += 1;
        else idle = 0;
        reportHarvest("running");
      }
      reason = !harvest.running ? "stopped" : "done";
    } catch (e) {
      reason = "error";
    } finally {
      harvest.running = false;
      endRun();
      reportHarvest(reason);
    }
  }

  function stopHarvest() {
    if (harvest) harvest.running = false;
    reportHarvest("stopped");
  }

  // ---- incremental monitor (driven by the background scheduler) --------------
  // A persistent set of recently-seen post ids (in chrome.storage) lets each
  // check stop as soon as it reaches posts captured on a previous check.

  let monitor = null;

  async function preloadSeen() {
    const { seenIds = [] } = await chrome.storage.local.get("seenIds");
    for (const id of seenIds) SEEN.add(id);
  }
  async function persistSeen() {
    await chrome.storage.local.set({ seenIds: [...SEEN].slice(-3000) }); // keep most recent
  }

  function loggedOut() {
    return /\/login|\/checkpoint/.test(location.pathname) ||
      !!document.querySelector('input[name="email"][type="text"], #email');
  }

  // cap = max NEW posts on a warm (ongoing) run; coldCap = max on the first
  // (cold) run when seeding a brand-new group. Set independently from the popup.
  function stopMonitor() {
    if (monitor) monitor.running = false;
  }

  // Returns { captured, reason } — the scheduler needs to tell a real "0 new
  // posts" apart from "logged out" / "stopped" / "couldn't run".
  async function runMonitor(cap = 20, coldCap = 40) {
    if (loggedOut()) return { captured: 0, reason: "logged-out" };
    if (!beginRun("monitor")) return { captured: 0, reason: "busy" };

    await preloadSeen();
    monitor = { running: true, captured: 0 };

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const MAX_SCROLLS = 25; // hard backstop so a run can never dive endlessly

    let reason = "ok";
    try {
    // Cold start: the first time we monitor a group we have no boundary to stop
    // at, so a normal run would dive the whole feed. Instead, seed the recent
    // posts (up to coldCap) and stop — later runs pick up new posts via the
    // boundary logic. This is the "take the first N posts and stop" cold start.
    const gid = currentGroupId();
    const { seededGroups = [] } = await chrome.storage.local.get("seededGroups");
    const coldStart = !gid || !seededGroups.includes(gid);
    const runCap = coldStart ? coldCap : cap; // this run's post budget

    monitor.captured += scan(true, runCap, true, "monitor"); // top of the (New-posts) feed

    if (coldStart) {
      // Scroll until we've seeded coldCap posts or hit the end of the feed. A
      // higher scroll ceiling here so a larger coldCap can actually be reached.
      const COLD_MAX_SCROLLS = 15;
      for (let i = 0; i < COLD_MAX_SCROLLS && monitor.running && monitor.captured < runCap; i++) {
        const beforeH = document.body.scrollHeight;
        window.scrollTo(0, document.body.scrollHeight);
        await wait(2000);
        const n = scan(true, runCap - monitor.captured, true, "monitor");
        monitor.captured += n;
        if (document.body.scrollHeight <= beforeH && n === 0) break; // end of feed
      }
      // Only mark the group seeded if the cold start actually ran to completion.
      // If it was stopped part-way, leaving it unseeded means the next run
      // resumes the cold start instead of switching to boundary logic and
      // never finishing the seed.
      if (gid && monitor.running) {
        await chrome.storage.local.set({ seededGroups: [...new Set([...seededGroups, gid])] });
      }
    } else {
      // Warm run: capture new posts until we reach the previous check's boundary.
      let zeroRun = 0;
      let scrolls = 0;
      let boundary = lastScanSawSeen; // first pass may already be at the boundary
      while (monitor.running && monitor.captured < runCap && !boundary && scrolls < MAX_SCROLLS) {
        const beforeH = document.body.scrollHeight;
        window.scrollTo(0, document.body.scrollHeight);
        await wait(2000);
        scrolls++;
        const n = scan(true, runCap - monitor.captured, true, "monitor");
        monitor.captured += n;
        // Primary stop: we've scrolled into posts captured on a previous check.
        // Everything below is older and was already processed — don't dive in.
        if (lastScanSawSeen) { boundary = true; break; }
        if (n === 0) zeroRun++; else zeroRun = 0;
        if (zeroRun >= 2) break;                                   // caught up
        if (document.body.scrollHeight <= beforeH && n === 0) break; // end of feed
      }
    }
      if (!monitor.running) reason = "stopped"; // aborted via STOP_MONITOR
    } catch (e) {
      reason = "error";
    } finally {
      // Persist the seen-set even on abort/error so the next run still has a
      // boundary and doesn't re-dive the whole feed.
      try { await persistSeen(); } catch (e) { void e; }
      monitor.running = false;
      endRun();
    }
    return { captured: monitor.captured, reason };
  }

  // Commands from the popup / background scheduler (via chrome.tabs.sendMessage).
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "START_CRAWL") {
      runCrawl(Math.max(1, Number(msg.limit) || 100));
      sendResponse({ ok: true });
    } else if (msg?.type === "STOP_CRAWL") {
      stopCrawl();
      sendResponse({ ok: true });
    } else if (msg?.type === "HARVEST_COMMENTS") {
      runHarvest();
      sendResponse({ ok: true });
    } else if (msg?.type === "STOP_HARVEST") {
      stopHarvest();
      sendResponse({ ok: true });
    } else if (msg?.type === "START_MONITOR") {
      // resolve when the incremental crawl finishes so the scheduler can advance
      runMonitor(Number(msg.cap) || 20, Number(msg.coldCap) || 40).then((res) =>
        sendResponse({ ok: true, ...res })
      );
      return true; // async response
    } else if (msg?.type === "STOP_MONITOR") {
      stopMonitor();
      sendResponse({ ok: true });
    } else if (msg?.type === "PING") {
      // Readiness probe: lets the scheduler wait for the feed to actually render
      // instead of guessing with a fixed sleep, and distinguishes an unreachable
      // page from a genuine "no new posts".
      sendResponse({
        ok: true,
        ready: !!document.querySelector('[data-ad-rendering-role="profile_name"]'),
        loggedOut: loggedOut(),
        busy: !!activeRun,
        url: location.href,
      });
    }
    return true;
  });
})();
