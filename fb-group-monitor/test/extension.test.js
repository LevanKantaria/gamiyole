// Runs the real content.js inside a simulated Facebook feed + a stubbed chrome
// API, to verify the reliability guarantees: the run lock (live-scan race),
// stop, never-stuck UI state, and mutual exclusion.
//
//   node test/extension.test.js
//
// jsdom is resolved from the repo root's node_modules.
const fs = require("fs");
const path = require("path");
const { JSDOM } = require(path.join(__dirname, "..", "..", "node_modules", "jsdom"));

const CONTENT = fs.readFileSync(
  process.env.CONTENT || path.join(__dirname, "..", "extension", "content.js"),
  "utf8"
);

const GID = "657384847985376";
// link:false renders a post the way FB usually does: no link to the post itself
// in the DOM (its timestamp only gets an href on hover).
const postHtml = (id, name, text, link = true) => `
  <div class="post">
    <div><div data-ad-rendering-role="profile_name"><a href="/groups/${GID}/user/${id}/">${name}</a></div></div>
    <div data-ad-rendering-role="story_message"><div dir="auto">${text}</div></div>
    ${link ? `<a href="/groups/${GID}/posts/${id}/">5h</a>` : `<a href="#" role="link">5h</a>`}
    <div data-ad-rendering-role="like_button"></div>
  </div>`;

// Same stand-in id content.js gives a post with no id anywhere.
function hashId(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return "h" + (h >>> 0).toString(36);
}

function makeEnv({ enabled = false, seenIds = [], seededGroups = [], posts = [] } = {}) {
  const dom = new JSDOM(
    `<body><div role="feed">${posts.map((p) => postHtml(p.id, p.name, p.text, p.link !== false)).join("")}</div></body>`,
    // runScripts lets window.eval execute with the window as its global scope,
    // so content.js resolves MutationObserver/document/setTimeout from jsdom.
    { url: `https://www.facebook.com/groups/${GID}/`, runScripts: "outside-only" }
  );
  const { window } = dom;
  const store = { enabled, seenIds, seededGroups };
  const sent = [];          // POSTS batches the content script forwarded
  let msgListener = null;

  // chrome.storage stub supporting BOTH callback and promise styles (content.js uses both)
  const local = {
    get(keys, cb) {
      const ks = typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      const out = {};
      for (const k of ks) if (k in store) out[k] = store[k];
      if (cb) { cb(out); return; }
      return Promise.resolve(out);
    },
    set(obj, cb) {
      Object.assign(store, obj);
      if (cb) { cb(); return; }
      return Promise.resolve();
    },
  };
  window.chrome = {
    storage: { local, onChanged: { addListener() {} } },
    runtime: {
      lastError: null,
      sendMessage(msg, cb) { if (msg && msg.type === "POSTS") sent.push(...msg.posts); if (cb) cb(); },
      onMessage: { addListener(fn) { msgListener = fn; } },
    },
  };

  // jsdom has no layout: fake scrollHeight and make scrollTo load more posts.
  let height = 1000;
  let onScroll = null;
  Object.defineProperty(window.document.body, "scrollHeight", { get: () => height, configurable: true });
  window.scrollTo = () => { if (onScroll) onScroll(); };

  window.eval(CONTENT);

  const send = (msg) => new Promise((resolve) => {
    const keep = msgListener(msg, {}, resolve);
    if (keep !== true) resolve(undefined);
  });

  return {
    window, store, sent, send,
    addPosts(list) {
      const feed = window.document.querySelector('[role="feed"]');
      for (const p of list) feed.insertAdjacentHTML("beforeend", postHtml(p.id, p.name, p.text, p.link !== false));
      height += 500 * list.length;
    },
    setOnScroll(fn) { onScroll = fn; },
    get storeRef() { return store; },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, pass, detail = "") {
  results.push(pass);
  console.log(`  ${pass ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
}

(async () => {
  // ---- TEST 1: the race. Live scan must NOT steal posts during a monitor run.
  // This is the bug: with "Monitoring on" enabled, the MutationObserver's live
  // scan grabbed newly-rendered posts first, so the monitor saw them as its
  // already-seen boundary and stopped with almost nothing.
  console.log("\nTEST 1 — live scan does not race the monitor (enabled=true)");
  {
    const env = makeEnv({
      enabled: true,                       // the condition that triggered the bug
      seededGroups: [GID],                 // warm run (boundary logic)
      seenIds: ["9999"],                   // an old post exists to form a boundary
      posts: [{ id: "1001", name: "A", text: "new one" },
              { id: "1002", name: "B", text: "new two" }],
    });
    await sleep(50);
    // On scroll: render 2 more new posts + the already-seen one (the boundary).
    let scrolled = false;
    env.setOnScroll(() => {
      if (scrolled) return;
      scrolled = true;
      env.addPosts([{ id: "1003", name: "C", text: "new three" },
                    { id: "1004", name: "D", text: "new four" },
                    { id: "9999", name: "Old", text: "already captured" }]);
    });

    const res = await env.send({ type: "START_MONITOR", cap: 20, coldCap: 40 });
    const vias = [...new Set(env.sent.filter((p) => p.kind !== "comment").map((p) => p.via))];
    check("all posts tagged via 'monitor' (none stolen by live scan)",
      vias.length === 1 && vias[0] === "monitor", `saw: ${JSON.stringify(vias)}`);
    check("captured the 4 genuinely-new posts", res.captured === 4, `captured=${res.captured}`);
    check("stopped at the seen boundary (reason ok)", res.reason === "ok", `reason=${res.reason}`);
  }

  // ---- TEST 2: crawl always clears its active flag (UI can never get stuck)
  console.log("\nTEST 2 — crawl always ends with active:false");
  {
    const env = makeEnv({ posts: [{ id: "2001", name: "A", text: "x" }, { id: "2002", name: "B", text: "y" }] });
    await sleep(50);
    await env.send({ type: "START_CRAWL", limit: 2 }); // limit hit immediately
    await sleep(300);
    const p = env.storeRef.crawlProgress;
    check("crawlProgress.active === false", p && p.active === false, `status=${p && p.status}`);
    check("status is a finished state", p && ["limit-reached", "end-of-feed", "stopped"].includes(p.status),
      `status=${p && p.status}`);
  }

  // ---- TEST 3: STOP_MONITOR actually aborts an in-flight run
  console.log("\nTEST 3 — STOP_MONITOR aborts a running monitor");
  {
    // Cold start (group NOT seeded) so the run stays in its scroll loop and we
    // can actually interrupt it. A warm run stops at the boundary on its own.
    const env = makeEnv({
      posts: [{ id: "3001", name: "A", text: "x" }],
    });
    await sleep(50);
    // Keep feeding new posts so the run would otherwise keep scrolling.
    let n = 4000;
    env.setOnScroll(() => { env.addPosts([{ id: String(++n), name: "N", text: "more" }]); });
    const runP = env.send({ type: "START_MONITOR", cap: 100, coldCap: 100 });
    await sleep(2300);                       // let it enter the scroll loop
    await env.send({ type: "STOP_MONITOR" });
    const res = await Promise.race([runP, sleep(9000).then(() => ({ reason: "TIMED-OUT" }))]);
    check("run returned promptly with reason 'stopped'", res.reason === "stopped", `reason=${res.reason}`);
    check("seen-set was still persisted on abort", Array.isArray(env.storeRef.seenIds), "");
    check("aborted cold start did NOT mark the group seeded (so it can resume)",
      !(env.storeRef.seededGroups || []).includes(GID),
      `seededGroups=${JSON.stringify(env.storeRef.seededGroups)}`);
  }

  // ---- TEST 4: mutual exclusion — no two runs at once
  console.log("\nTEST 4 — a second run is refused while one is active");
  {
    const env = makeEnv({ seededGroups: [GID], posts: [{ id: "5001", name: "A", text: "x" }] });
    await sleep(50);
    env.setOnScroll(() => { env.addPosts([{ id: String(Math.random()).slice(2, 8), name: "N", text: "m" }]); });
    const monP = env.send({ type: "START_MONITOR", cap: 100, coldCap: 100 });
    await sleep(300);
    await env.send({ type: "START_CRAWL", limit: 50 });   // should be refused
    await sleep(100);
    check("crawl refused with status 'busy'",
      env.storeRef.crawlProgress && env.storeRef.crawlProgress.status === "busy",
      `status=${env.storeRef.crawlProgress && env.storeRef.crawlProgress.status}`);
    await env.send({ type: "STOP_MONITOR" });
    await monP;
  }

  // ---- TEST 5: PING readiness probe (distinguishes "not ready" from "0 new")
  console.log("\nTEST 5 — PING reports readiness / logged-out");
  {
    const ready = makeEnv({ posts: [{ id: "6001", name: "A", text: "x" }] });
    await sleep(50);
    const r1 = await ready.send({ type: "PING" });
    check("ready:true when the feed has posts", r1 && r1.ready === true && r1.loggedOut === false,
      JSON.stringify(r1 && { ready: r1.ready, loggedOut: r1.loggedOut }));

    const empty = makeEnv({ posts: [] });
    await sleep(50);
    const r2 = await empty.send({ type: "PING" });
    check("ready:false when no posts rendered", r2 && r2.ready === false, JSON.stringify(r2 && { ready: r2.ready }));
  }

  // What page-hook.js announces for a post it read from FB's page data.
  const announce = (env, story) =>
    env.window.document.dispatchEvent(new env.window.CustomEvent("fbgm:story", { detail: JSON.stringify(story) }));

  // ---- TEST 6: link-less posts get their real id + time from the page data
  console.log("\nTEST 6 — page data (page-hook.js) supplies ids for link-less posts");
  {
    const env = makeEnv({
      posts: [{ id: "x", name: "A", text: "ხვალ გავდივარ თბილისიდან ბათუმში", link: false },
              { id: "y", name: "B", text: "no page data for this one", link: false }],
    });
    await sleep(50);
    const story = { key: "ხვალგავდივართბილისიდანბათუმში", postId: "3179000000000001", groupId: GID,
      url: null, time: 1789999999, author: "A" };
    announce(env, story);
    await env.send({ type: "START_MONITOR", cap: 20, coldCap: 2 });
    const a = env.sent.find((p) => p.author === "A");
    const b = env.sent.find((p) => p.author === "B");
    check("link-less post got its real id", a && a.postId === story.postId, a && a.postId);
    check("…a real permalink", a && a.permalink === `https://www.facebook.com/groups/${GID}/posts/${story.postId}/`,
      a && a.permalink);
    check("…when it was written", a && a.postedAt === new Date(story.time * 1000).toISOString(), a && a.postedAt);
    check("…and its old stand-in id as aliasId", a && a.aliasId === hashId("A|" + "ხვალ გავდივარ თბილისიდან ბათუმში"),
      a && a.aliasId);
    check("a post with no page data still gets a stand-in id", b && /^h[0-9a-z]+$/.test(b.postId) && !b.postedAt,
      b && b.postId);
  }

  // ---- TEST 7: posts captured before the page data existed stay the boundary
  console.log("\nTEST 7 — monitor boundary still recognises a post seen under its old stand-in id");
  {
    const env = makeEnv({
      seededGroups: [GID],
      seenIds: [hashId("Old|already captured")], // stored before this change: stand-in id
      posts: [{ id: "7001", name: "A", text: "new one" }, { id: "7002", name: "B", text: "new two" }],
    });
    await sleep(50);
    announce(env, { key: "alreadycaptured", postId: "3179000000000002", groupId: GID, time: 1789990000, author: "Old" });
    let scrolled = false;
    env.setOnScroll(() => {
      if (scrolled) return;
      scrolled = true;
      env.addPosts([{ id: "z", name: "Old", text: "already captured", link: false }]);
    });
    const res = await env.send({ type: "START_MONITOR", cap: 20, coldCap: 40 });
    check("stopped at the old post (reason ok, 2 captured)", res.reason === "ok" && res.captured === 2,
      `reason=${res.reason} captured=${res.captured}`);
    check("the old post was not re-sent under its new id",
      !env.sent.some((p) => p.postId === "3179000000000002"), JSON.stringify(env.sent.map((p) => p.postId)));
  }

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
})();
