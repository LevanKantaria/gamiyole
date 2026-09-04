// Runs the real popup.html + popup.js in jsdom with a stubbed chrome API.
// Guards the bug where typing in the popup got wiped: the extension writes to
// storage constantly, and the popup used to re-fill every input on each write
// (and on a 2s timer), clobbering whatever you were typing.
//
//   node test/popup.test.js
const fs = require("fs");
const path = require("path");
const { JSDOM } = require(path.join(__dirname, "..", "..", "node_modules", "jsdom"));

const EXT = path.join(__dirname, "..", "extension");
const HTML = fs.readFileSync(path.join(EXT, "popup.html"), "utf8");
const JS = fs.readFileSync(path.join(EXT, "popup.js"), "utf8");

function makePopup(initial = {}) {
  const dom = new JSDOM(HTML, { runScripts: "outside-only" });
  const { window } = dom;
  const store = { ...initial };
  const changeListeners = [];

  window.chrome = {
    storage: {
      local: {
        get(keys, cb) {
          const ks = typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
          const out = {};
          for (const k of ks) if (k in store) out[k] = store[k];
          if (cb) { cb(out); return; }
          return Promise.resolve(out);
        },
        set(obj, cb) {
          Object.assign(store, obj);
          // mirror Chrome: every write notifies listeners
          for (const fn of changeListeners) fn(Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k, { newValue: v }])), "local");
          if (cb) cb();
          return Promise.resolve();
        },
        remove(keys, cb) { for (const k of [].concat(keys)) delete store[k]; if (cb) cb(); },
      },
      onChanged: { addListener(fn) { changeListeners.push(fn); } },
    },
    tabs: { query: async () => [], sendMessage() {} },
    runtime: { lastError: null, sendMessage(_m, cb) { if (cb) cb(); } },
  };

  window.eval(JS);
  return {
    window, store,
    $: (id) => window.document.getElementById(id),
    // simulate the background worker writing state (monitor cycle, flush, etc.)
    backgroundWrite(obj) { window.chrome.storage.local.set(obj); },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, pass, detail = "") => {
  results.push(pass);
  console.log(`  ${pass ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
};

(async () => {
  console.log("\nTEST — typing survives background storage writes + the refresh timer");
  {
    const p = makePopup({
      monitorGroups: ["https://www.facebook.com/groups/111/"],
      monitorInterval: 30, endpoint: "http://localhost:8787/ingest",
    });
    await sleep(60); // initial load fills the form

    // Start typing a new URL list (as a user would).
    const typed = "https://www.facebook.com/groups/111/\nhttps://www.facebook.com/groups/222/";
    p.$("monitorGroups").value = typed;
    p.$("endpoint").value = "http://localhost:9999/ingest";

    // The background writes state repeatedly while you type.
    for (let i = 0; i < 5; i++) {
      p.backgroundWrite({ crawlProgress: { active: false, captured: i, status: "running", at: new Date().toISOString() } });
      p.backgroundWrite({ monitorCycle: { running: true, index: 1, total: 4, at: Date.now() } });
      await sleep(80);
    }
    check("textarea kept what was typed after 10 storage writes",
      p.$("monitorGroups").value === typed,
      p.$("monitorGroups").value === typed ? "" : `got: ${JSON.stringify(p.$("monitorGroups").value)}`);
    check("endpoint field kept what was typed",
      p.$("endpoint").value === "http://localhost:9999/ingest");

    // And survive the 2s status-refresh timer.
    await sleep(2400);
    check("still intact after the 2s refresh timer fired",
      p.$("monitorGroups").value === typed,
      p.$("monitorGroups").value === typed ? "" : `got: ${JSON.stringify(p.$("monitorGroups").value)}`);

    check("status still updates live (not frozen)",
      /Running|group 1\/4/.test(p.$("monitorStatus").textContent),
      `status="${p.$("monitorStatus").textContent}"`);
  }

  console.log("\nTEST — Save reports rejected lines instead of silently deleting them");
  {
    const p = makePopup({});
    await sleep(60);
    const typed = [
      "https://www.facebook.com/groups/111/",
      "not-a-group-url",                       // should be rejected, but NOT vanish
      "https://www.facebook.com/groups/222/",
    ].join("\n");
    p.$("monitorGroups").value = typed;
    p.$("save").dispatchEvent(new p.window.Event("click"));
    await sleep(120);

    check("only valid URLs are stored for the scheduler",
      JSON.stringify(p.store.monitorGroups) ===
        JSON.stringify(["https://www.facebook.com/groups/111/", "https://www.facebook.com/groups/222/"]),
      JSON.stringify(p.store.monitorGroups));
    check("the rejected line is NOT wiped from the textarea",
      p.$("monitorGroups").value === typed);
    check("user is told why a line was ignored",
      /ignored/.test(p.$("saveStatus").textContent),
      `saveStatus="${p.$("saveStatus").textContent}"`);
    // the save message must survive the status refresh that follows
    await sleep(2400);
    check("that message isn't clobbered by the status refresh",
      /ignored/.test(p.$("saveStatus").textContent));
  }

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
})();
