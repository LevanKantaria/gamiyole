// background.js — service worker. Buffers posts from content scripts and
// ships them to your server. Retries on failure; survives the worker sleeping.

const DEFAULTS = {
  endpoint: "http://localhost:8787/ingest",
  apiKey: "",
  enabled: false,
};

async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(Object.keys(DEFAULTS), (cfg) => {
      resolve({ ...DEFAULTS, ...cfg });
    });
  });
}

// The outbox lives in chrome.storage and is touched by every content-script
// message AND the periodic alarm. Multiple crawling tabs feed this one shared
// worker, so we serialize all outbox read-modify-writes through a mutex —
// otherwise concurrent enqueue/flush interleave at their awaits and lose posts.
let lock = Promise.resolve();
function withLock(fn) {
  const run = lock.then(fn, fn); // run after prior op, even if it rejected
  lock = run.catch(() => {});    // keep the chain alive; swallow rejections here
  return run;
}

// Persist a small outbox in storage so posts survive worker restarts.
async function enqueueInner(posts) {
  const { outbox = [] } = await chrome.storage.local.get("outbox");
  // cap the outbox so it can't grow unbounded if the server is down
  const capped = outbox.concat(posts).slice(-500);
  await chrome.storage.local.set({ outbox: capped });
}

async function flushInner() {
  const cfg = await getConfig();
  if (!cfg.endpoint) return;

  const { outbox = [] } = await chrome.storage.local.get("outbox");
  if (!outbox.length) return;
  const sending = outbox.slice(); // snapshot of what we're sending

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000); // don't hang the mutex
  try {
    const res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.apiKey ? { "X-Api-Key": cfg.apiKey } : {}),
      },
      body: JSON.stringify({ posts: sending }),
      signal: ctrl.signal,
    });
    if (res.ok) {
      // Remove exactly the items we sent (they're at the front, since we always
      // append), preserving anything enqueued while the request was in flight.
      const { outbox: cur = [] } = await chrome.storage.local.get("outbox");
      await chrome.storage.local.set({
        outbox: cur.slice(sending.length),
        lastFlush: new Date().toISOString(),
        lastError: "",
      });
    } else {
      await chrome.storage.local.set({ lastError: `HTTP ${res.status}` });
    }
  } catch (e) {
    await chrome.storage.local.set({ lastError: String((e && e.message) || e) });
  } finally {
    clearTimeout(timer);
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "POSTS" && Array.isArray(msg.posts)) {
    withLock(() => enqueueInner(msg.posts)).then(() => withLock(flushInner));
    sendResponse({ ok: true, count: msg.posts.length });
  } else if (msg?.type === "RUN_MONITOR_NOW") {
    runMonitorCycle();
    sendResponse({ ok: true });
  }
  return true; // keep the channel open for async response
});

// ---- 24/7 monitor scheduler -------------------------------------------------
// Every N minutes, cycle through the configured group URLs in one dedicated tab,
// running an incremental crawl on each. Reuses your logged-in FB session.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getMonitorCfg() {
  const c = await chrome.storage.local.get([
    "monitorEnabled", "monitorGroups", "monitorInterval", "monitorCap", "monitorColdCap", "monitorTabId",
  ]);
  return {
    enabled: !!c.monitorEnabled,
    groups: Array.isArray(c.monitorGroups) ? c.monitorGroups.filter(Boolean) : [],
    interval: Math.max(5, Number(c.monitorInterval) || 30),
    cap: Math.max(1, Number(c.monitorCap) || 20),       // warm-run cap (new posts per group)
    coldCap: Math.max(1, Number(c.monitorColdCap) || 40), // cold-start cap (first run on a group)
    tabId: c.monitorTabId || null,
  };
}

// (Re)create the alarm to match the configured interval.
async function syncMonitorAlarm() {
  const cfg = await getMonitorCfg();
  await chrome.alarms.clear("monitor");
  if (cfg.enabled && cfg.groups.length) {
    chrome.alarms.create("monitor", { periodInMinutes: cfg.interval, delayInMinutes: 0.1 });
  }
}

// Add FB's "chronological" sort so newest posts are at the top.
function chronoUrl(url) {
  try {
    const u = new URL(url);
    u.searchParams.set("sorting_setting", "CHRONOLOGICAL");
    return u.toString();
  } catch {
    return url;
  }
}

// Ensure we have a live dedicated tab to drive; create one if missing.
async function ensureMonitorTab() {
  const { monitorTabId } = await chrome.storage.local.get("monitorTabId");
  if (monitorTabId) {
    try { return await chrome.tabs.get(monitorTabId); } catch { /* gone */ }
  }
  const tab = await chrome.tabs.create({ url: "https://www.facebook.com/", active: false });
  await chrome.storage.local.set({ monitorTabId: tab.id });
  return tab;
}

function waitForComplete(tabId, timeoutMs = 45000) {
  return new Promise((resolve) => {
    const done = (id, info) => {
      if (id === tabId && info.status === "complete") { cleanup(); resolve(true); }
    };
    const timer = setTimeout(() => { cleanup(); resolve(false); }, timeoutMs);
    function cleanup() { clearTimeout(timer); chrome.tabs.onUpdated.removeListener(done); }
    chrome.tabs.onUpdated.addListener(done);
  });
}

// Navigate the tab to a group and run one incremental monitor pass.
// active:false — navigate in the background so the monitor never steals focus
// or flips the page in front of you. (Keep the Chrome window visible/un-minimized
// so the background tab's timers aren't heavily throttled.)
async function monitorOneGroup(tabId, url, cap = 20, coldCap = 40) {
  await chrome.tabs.update(tabId, { url: chronoUrl(url), active: false });
  await waitForComplete(tabId);
  await sleep(4500); // let the SPA render the feed
  const captured = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(0), 120000);
    chrome.tabs.sendMessage(tabId, { type: "START_MONITOR", cap, coldCap }, (resp) => {
      clearTimeout(timer);
      void chrome.runtime.lastError;
      resolve(resp && typeof resp.captured === "number" ? resp.captured : 0);
    });
  });
  return captured;
}

let cycleRunning = false;
async function runMonitorCycle() {
  if (cycleRunning) return;
  const cfg = await getMonitorCfg();
  if (!cfg.enabled || !cfg.groups.length) return;
  cycleRunning = true;
  const results = [];
  let loggedOut = false;
  try {
    const tab = await ensureMonitorTab();
    for (const url of cfg.groups) {
      // Stop promptly if the user turned the monitor off mid-cycle.
      const { monitorEnabled } = await chrome.storage.local.get("monitorEnabled");
      if (!monitorEnabled) break;
      const captured = await monitorOneGroup(tab.id, url, cfg.cap, cfg.coldCap);
      if (captured < 0) { loggedOut = true; break; } // content script flagged logged-out
      results.push({ url, captured });
      await sleep(3000); // small gap between groups
    }
    await withLock(flushInner); // push anything still buffered
  } catch (e) {
    await chrome.storage.local.set({ monitorError: String((e && e.message) || e) });
  } finally {
    cycleRunning = false;
    await chrome.storage.local.set({
      monitorLastCycle: new Date().toISOString(),
      monitorLastResults: results,
      monitorLoggedOut: loggedOut,
    });
  }
}

// Periodic flush in case a POST failed while the server was down.
chrome.alarms.create("flush", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === "flush") withLock(flushInner);
  else if (a.name === "monitor") runMonitorCycle();
});

// Keep the alarm in sync with config changes, and on startup/install.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.monitorEnabled || changes.monitorInterval || changes.monitorGroups) {
    syncMonitorAlarm();
  }
});
chrome.runtime.onStartup.addListener(syncMonitorAlarm);
chrome.runtime.onInstalled.addListener(syncMonitorAlarm);
syncMonitorAlarm();
