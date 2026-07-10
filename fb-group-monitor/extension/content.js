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
    if (!postId && pfbid) { groupId = pfbidGroup; postId = pfbid; }
    // Fallback identity for comment-less posts with no exposed id at all.
    if (!postId) postId = hashId((author || "") + "|" + text.slice(0, 200));

    const hasRealId = groupId && (/^\d+$/.test(postId) || /^pfbid/.test(postId));
    const permalink = hasRealId
      ? `https://www.facebook.com/groups/${groupId}/posts/${postId}/`
      : location.href;

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

    // The post timestamp is CSS-scrambled and not readably in the DOM, so we
    // record the crawl time; the server renders a readable date from it.
    return {
      postId,
      groupId,
      permalink,
      author,
      authorUserId,
      authorUrl,
      text,
      timeText: null,
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

  // Returns the number of NEW POSTS captured this pass (comments don't count
  // toward the crawl limit, but are still captured and forwarded).
  // `force` bypasses the enabled toggle; `cap` limits how many new posts to take.
  // `via` records how we saw the post ('monitor'|'crawl'|'live') — the server
  // only trusts relative dates ("today") from 'monitor' captures (genuinely new).
  function scan(force = false, cap = Infinity, ignoreFilter = false, via = "live") {
    lastScanSawSeen = false;
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
        if (SEEN.has(post.postId)) {
          // Reached a post from a previous check — the new/old boundary.
          lastScanSawSeen = true;
          continue;
        }
        SEEN.add(post.postId);
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
    if (crawl && crawl.running) return; // already crawling
    if (groupFilter && !location.pathname.includes(groupFilter)) {
      crawl = { running: false, captured: 0, limit };
      reportCrawl("wrong-group"); // not on the configured group page
      return;
    }

    crawl = { running: true, captured: 0, limit, idleRounds: 0 };
    reportCrawl("running");

    const MAX_IDLE = 4;         // consecutive scrolls with no new posts => end of feed
    const WAIT_MS = 2500;       // let posts render + network settle after each scroll
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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

    const reason = !crawl.running
      ? "stopped"
      : crawl.captured >= limit
      ? "limit-reached"
      : "end-of-feed";
    crawl.running = false;
    reportCrawl(reason);
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
    if (harvest && harvest.running) return;
    const postId = currentPostId();
    const groupId = currentGroupId();
    if (!postId) { harvest = { running: false, captured: 0 }; reportHarvest("not-a-post"); return; }

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

    const reason = !harvest.running ? "stopped" : "done";
    harvest.running = false;
    reportHarvest(reason);
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
  async function runMonitor(cap = 20, coldCap = 40) {
    if (monitor && monitor.running) return 0;
    await preloadSeen();
    monitor = { running: true, captured: 0 };
    if (loggedOut()) { monitor.running = false; return -1; } // signal to scheduler

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const MAX_SCROLLS = 25; // hard backstop so a run can never dive endlessly

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
      if (gid) {
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

    await persistSeen();
    monitor.running = false;
    return monitor.captured;
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
      runMonitor(Number(msg.cap) || 20, Number(msg.coldCap) || 40).then((captured) =>
        sendResponse({ ok: true, captured })
      );
      return true; // async response
    }
    return true;
  });
})();
