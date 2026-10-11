// Runs extension/page-hook.js in a simulated page and feeds it payloads shaped
// like Facebook's (a streamed /api/graphql/ XHR response and the JSON embedded
// in the page), checking it announces each post's id / time / link / text key.
//
//   node test/page-hook.test.js
//
// jsdom is resolved from the repo root's node_modules.
const fs = require("fs");
const path = require("path");
const { JSDOM } = require(path.join(__dirname, "..", "..", "node_modules", "jsdom"));

const HOOK = fs.readFileSync(path.join(__dirname, "..", "extension", "page-hook.js"), "utf8");
const GID = "657384847985376";

// A feed story roughly as FB nests it; post_id at the top, the rest buried.
const story = (postId, text, time, extra = {}) => ({
  __typename: "Story",
  id: "UzpfSTEw" + postId,
  post_id: postId,
  comet_sections: {
    content: { story: { message: { text } } },
    context_layout: { story: { comet_sections: {
      actor_photo: { story: { actors: [{ name: "Giorgi" }] } },
      metadata: [{ story: { creation_time: time, url: `https://www.facebook.com/groups/${GID}/posts/${postId}/` } }],
    } } },
  },
  ...extra,
});

const results = [];
function check(name, pass, detail = "") {
  results.push(pass);
  console.log(`  ${pass ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dom = new JSDOM(`<body></body>`, { url: `https://www.facebook.com/groups/${GID}/`, runScripts: "outside-only" });
  const { window } = dom;

  // Minimal XHR that lets the test stream a response in chunks.
  class FakeXHR {
    constructor() { this.readyState = 0; this.responseText = ""; this.responseType = ""; this.listeners = []; }
    open() { this.readyState = 1; }
    send() {}
    addEventListener(type, fn) { if (type === "readystatechange") this.listeners.push(fn); }
    push(chunk, final = false) {
      this.responseText += chunk;
      this.readyState = final ? 4 : 3;
      for (const fn of this.listeners) fn();
    }
  }
  window.XMLHttpRequest = FakeXHR;

  const got = [];
  window.document.addEventListener("fbgm:story", (e) => got.push(JSON.parse(e.detail)));
  window.eval(HOOK);

  console.log("\nTEST 1 — streamed GraphQL response (XHR)");
  {
    const xhr = new window.XMLHttpRequest();
    xhr.open("POST", "/api/graphql/");
    xhr.send("fb_api_req_friendly_name=GroupsCometFeedRegularStoriesPaginationQuery");
    const line1 = JSON.stringify({ data: { node: { group_feed: { edges: [{ node: story("3180000000000001",
      "ხვალ დილით გავდივარ ქუთაისიდან თბილისში", 1789000000,
      { attached_story: story("3170000000000009", "a shared original post", 1780000000) }) }] } } } });
    const line2 = JSON.stringify({ label: "deferred", data: { node: story("3180000000000002", "დღეს საღამოს ბათუმიდან", 1789000500) } });
    // first line arrives in two pieces, the second line only at the end
    xhr.push(line1.slice(0, 50));
    check("nothing parsed from a half-received line", got.length === 0, `got ${got.length}`);
    xhr.push(line1.slice(50) + "\n");
    xhr.push(line2, true);
    const a = got.find((s) => s.postId === "3180000000000001");
    const b = got.find((s) => s.postId === "3180000000000002");
    const shared = got.find((s) => s.postId === "3170000000000009");
    check("post found with its text key", a && a.key === "ხვალდილითგავდივარქუთაისიდანთბილისში", a && a.key);
    check("…creation time", a && a.time === 1789000000, a && a.time);
    check("…permalink + group", a && a.url === `https://www.facebook.com/groups/${GID}/posts/3180000000000001/` && a.groupId === GID,
      a && a.url);
    check("…author", a && a.author === "Giorgi", a && a.author);
    check("shared original didn't leak its text/time into the post", a && a.time !== 1780000000, a && a.time);
    check("shared original announced as its own post", shared && shared.key === "asharedoriginalpost", shared && shared.key);
    check("deferred (second-line) post parsed", b && b.time === 1789000500, b && b.postId);
  }

  console.log("\nTEST 2 — JSON embedded in the page");
  {
    const s = window.document.createElement("script");
    s.type = "application/json";
    s.textContent = JSON.stringify({ require: [["ScheduledServerJS", "handle", null, [{ __bbox: { result: { data: {
      node: story("3180000000000003", "გავდივარ ზუგდიდიდან", 1789001000) } } } }]]] });
    window.document.body.appendChild(s);
    await sleep(20);
    const c = got.find((x) => x.postId === "3180000000000003");
    check("post from embedded JSON announced", c && c.time === 1789001000, c && c.postId);
  }

  console.log("\nTEST 3 — content.js loading late gets a replay");
  {
    const before = got.length;
    window.document.dispatchEvent(new window.CustomEvent("fbgm:hello"));
    check("every known post re-announced on hello", got.length - before === window.__fbgmHook.stories.size,
      `${got.length - before} replayed of ${window.__fbgmHook.stories.size}`);
  }

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
})();
