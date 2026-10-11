// page-hook.js — runs in the PAGE's own JavaScript world ("world": "MAIN") at
// document_start, before Facebook's own scripts.
//
// Why: Facebook doesn't put a post's own link in the DOM until its timestamp is
// hovered, so content.js only finds a real post id when a comment happens to be
// rendered (comment links embed it). But every post FB renders first arrives as
// data — the JSON embedded in the page and the /api/graphql/ responses loaded
// while scrolling — and that data carries the post id, its permalink and its
// exact creation time. We read it as it arrives and hand each post to content.js
// (an isolated world, which can't see page JS) as a string CustomEvent, keyed by
// the opening of the post's text so content.js can match it to the DOM post.
//
// Read-only: no requests are made or changed. Inspect in DevTools with
// __fbgmHook.stats / __fbgmHook.stories.
(() => {
  if (window.__fbgmHook) return;
  const stories = new Map(); // key → story
  const stats = { payloads: 0, stories: 0, errors: 0 };
  window.__fbgmHook = { stories, stats };

  // Must match storyKey() in content.js.
  const keyOf = (text) => String(text || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "").slice(0, 60);
  const POST_URL = /\/groups\/([^/?#]+)\/(?:posts|permalink)\/(\d+|pfbid\w+)/;

  function announce(s) {
    document.dispatchEvent(new CustomEvent("fbgm:story", { detail: JSON.stringify(s) }));
  }
  // content.js loads after us (document_idle) — replay what it missed.
  document.addEventListener("fbgm:hello", () => { for (const s of stories.values()) announce(s); });

  // A post node carries post_id; its text, creation time, permalink and author
  // sit somewhere inside it (FB reshuffles the nesting between builds, so search
  // rather than hard-code paths). Skip nested nodes of a DIFFERENT post — a
  // shared post's original has its own text and time.
  function take(node) {
    const id = node.post_id;
    let text = null, time = null, url = null, author = null;
    const queue = [[node, 0]];
    for (let steps = 0; queue.length && steps < 5000; steps++) {
      const [o, d] = queue.shift();
      if (Array.isArray(o)) { for (const v of o) if (v && typeof v === "object") queue.push([v, d + 1]); continue; }
      if (o !== node && typeof o.post_id === "string" && o.post_id !== id) continue;
      if (text == null && o.message && typeof o.message.text === "string") text = o.message.text;
      if (time == null && typeof o.creation_time === "number") time = o.creation_time;
      if (author == null && Array.isArray(o.actors) && o.actors[0] && typeof o.actors[0].name === "string") author = o.actors[0].name;
      for (const k of ["url", "wwwURL", "permalink_url"]) {
        const v = o[k];
        // prefer the link that names this post's numeric id; accept a pfbid one
        if (typeof v === "string" && POST_URL.test(v) && (!url || (!url.includes(id) && v.includes(id)))) url = v;
      }
      if (text != null && time != null && author != null && url && url.includes(id)) break;
      if (d < 10) for (const k in o) { const v = o[k]; if (v && typeof v === "object") queue.push([v, d + 1]); }
    }
    const key = keyOf(text);
    if (!key) return; // photo-only post — nothing to match it by
    const gm = url && url.match(POST_URL);
    const s = { key, postId: id, groupId: gm ? gm[1] : null, url: url ? url.split("?")[0] : null, time, author };
    const cur = stories.get(key);
    if (cur && cur.postId === id && cur.time === s.time) return; // already known
    stories.set(key, s);
    stats.stories++;
    announce(s);
  }

  // Walk a parsed payload for post nodes (bounded — some payloads are large).
  function harvest(root) {
    const stack = [root];
    for (let steps = 0; stack.length && steps < 300000; steps++) {
      const o = stack.pop();
      if (Array.isArray(o)) { for (const v of o) if (v && typeof v === "object") stack.push(v); continue; }
      if (typeof o.post_id === "string" && /^\d{5,}$/.test(o.post_id)) {
        try { take(o); } catch (e) { stats.errors++; }
      }
      for (const k in o) { const v = o[k]; if (v && typeof v === "object") stack.push(v); }
    }
  }

  // GraphQL responses are one JSON object per line (streamed: more lines arrive
  // as deferred parts resolve), sometimes behind a "for (;;);" guard.
  function parseLines(chunk) {
    for (const line of chunk.split("\n")) {
      const t = line.trim().replace(/^for \(;;\);/, "");
      if (!t || (t[0] !== "{" && t[0] !== "[")) continue;
      try { stats.payloads++; harvest(JSON.parse(t)); } catch (e) { stats.errors++; }
    }
  }
  const isGraphQL = (url) => /\/api\/graphql\/?/.test(String(url || ""));

  // XHR — FB's main transport. Parse complete lines as they stream in, since
  // posts can render before the whole response has finished.
  const open = XMLHttpRequest.prototype.open;
  const send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__fbgmGraphQL = isGraphQL(url);
    return open.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    if (this.__fbgmGraphQL) {
      let done = 0; // chars already parsed
      const read = () => {
        if (this.readyState < 3 || (this.responseType && this.responseType !== "text")) return;
        let body;
        try { body = this.responseText; } catch (e) { return; }
        const end = this.readyState === 4 ? body.length : body.lastIndexOf("\n") + 1;
        if (end > done) { parseLines(body.slice(done, end)); done = end; }
      };
      this.addEventListener("readystatechange", read);
    }
    return send.apply(this, args);
  };

  // fetch — in case some feed loads use it.
  const origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (input, init) {
      const p = origFetch.apply(this, arguments);
      const url = typeof input === "string" ? input : input && input.url;
      if (isGraphQL(url)) {
        p.then((res) => res.clone().text()).then(parseLines).catch(() => { stats.errors++; });
      }
      return p;
    };
  }

  // The first screen of posts is embedded in the page as JSON <script> tags
  // (and more are appended while the page streams in).
  const parsedScripts = new WeakSet();
  function scanScripts(root) {
    const list = root.querySelectorAll ? root.querySelectorAll('script[type="application/json"]') : [];
    for (const el of list) {
      if (parsedScripts.has(el)) continue;
      const t = el.textContent;
      if (!t || !t.includes("post_id")) continue; // cheap skip for the many unrelated blobs
      let data;
      try { data = JSON.parse(t); } catch (e) { continue; } // still streaming in — retried later
      parsedScripts.add(el);
      stats.payloads++;
      harvest(data);
    }
  }
  new MutationObserver((muts) => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.tagName === "SCRIPT") scanScripts(n.parentNode || document);
      else if (n.querySelector && n.querySelector('script[type="application/json"]')) scanScripts(n);
    }
  }).observe(document, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", () => scanScripts(document));
})();
