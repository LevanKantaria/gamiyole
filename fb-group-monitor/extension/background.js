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
    runMonitorCycle(true); // manual: runs even if the toggle is off
    sendResponse({ ok: true });
  } else if (msg?.type === "STOP_MONITOR_NOW") {
    stopMonitorNow();
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
// Important: if an alarm at the right cadence already exists we leave it ALONE,
// so saving unrelated settings doesn't reset the countdown or kick off a run.
// Only a fresh enable (no alarm yet) starts one shortly after.
async function syncMonitorAlarm() {
  const cfg = await getMonitorCfg();
  const existing = await chrome.alarms.get("monitor");

  if (!cfg.enabled || !cfg.groups.length) {
    if (existing) await chrome.alarms.clear("monitor");
    return;
  }
  if (existing && Math.abs((existing.periodInMinutes || 0) - cfg.interval) < 0.01) return;

  await chrome.alarms.clear("monitor");
  chrome.alarms.create("monitor", {
    periodInMinutes: cfg.interval,
    // fresh enable → first run in ~12s; interval change → wait a full interval
    delayInMinutes: existing ? cfg.interval : 0.2,
  });
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

// One round-trip to the content script; resolves null if it can't be reached.
function askTab(tabId, message, timeoutMs = 10000) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v) => { if (!settled) { settled = true; clearTimeout(timer); resolve(v); } };
    const timer = setTimeout(() => finish(null), timeoutMs);
    try {
      chrome.tabs.sendMessage(tabId, message, (resp) => {
        void chrome.runtime.lastError; // "receiving end does not exist" → null
        finish(resp || null);
      });
    } catch (e) { finish(null); }
  });
}

// Poll until the feed has actually rendered, instead of guessing with a fixed
// sleep. Returns the last PING response, or null if the page never got ready.
async function waitForFeed(tabId, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const r = await askTab(tabId, { type: "PING" }, 5000);
    if (r) {
      last = r;
      if (r.loggedOut || r.ready) return r;
    }
    await sleep(1000);
  }
  return last; // not ready (or never answered)
}

// Navigate the tab to a group and run one incremental monitor pass.
// active:false — navigate in the background so the monitor never steals focus
// or flips the page in front of you. (Keep the Chrome window visible/un-minimized
// so the background tab's timers aren't heavily throttled.)
// Returns { status, captured } where status is one of:
//   ok | logged-out | unreachable | not-ready | timeout | stopped | error
async function monitorOneGroup(tabId, url, cap = 20, coldCap = 40) {
  await chrome.tabs.update(tabId, { url: chronoUrl(url), active: false });
  await waitForComplete(tabId);

  const ping = await waitForFeed(tabId);
  if (!ping) return { status: "unreachable", captured: 0 };
  if (ping.loggedOut) return { status: "logged-out", captured: 0 };
  if (!ping.ready) return { status: "not-ready", captured: 0 };

  const resp = await askTab(tabId, { type: "START_MONITOR", cap, coldCap }, 180000);
  if (!resp) return { status: "timeout", captured: 0 };
  return {
    status: resp.reason === "ok" ? "ok" : resp.reason || "ok",
    captured: typeof resp.captured === "number" ? resp.captured : 0,
  };
}

// Live cycle state, mirrored into storage so the popup can show exactly what's
// happening (and detect a cycle that died with the service worker).
async function setCycleState(patch) {
  const { monitorCycle = {} } = await chrome.storage.local.get("monitorCycle");
  await chrome.storage.local.set({ monitorCycle: { ...monitorCycle, ...patch, at: Date.now() } });
}

let cycleRunning = false;
let abortCycle = false;

// Abort a running cycle now: stop the in-flight scroll in the tab and prevent
// the loop from advancing to the next group.
async function stopMonitorNow() {
  abortCycle = true;
  const { monitorTabId } = await chrome.storage.local.get("monitorTabId");
  if (monitorTabId) await askTab(monitorTabId, { type: "STOP_MONITOR" }, 3000);
  await setCycleState({ running: false, status: "stopped" });
}

async function runMonitorCycle(manual = false) {
  if (cycleRunning) return;
  const cfg = await getMonitorCfg();
  if (!cfg.groups.length) return;
  if (!cfg.enabled && !manual) return; // scheduled runs require the toggle

  cycleRunning = true;
  abortCycle = false;
  const results = [];
  let loggedOut = false;
  await setCycleState({
    running: true, status: "running", startedAt: Date.now(),
    index: 0, total: cfg.groups.length, group: null,
  });

  try {
    const tab = await ensureMonitorTab();
    for (let i = 0; i < cfg.groups.length; i++) {
      const url = cfg.groups[i];
      // Stop promptly if the user paused/stopped the monitor mid-cycle.
      const { monitorEnabled } = await chrome.storage.local.get("monitorEnabled");
      if (abortCycle || (!monitorEnabled && !manual)) break;

      await setCycleState({ index: i + 1, group: url, status: "running" });
      const r = await monitorOneGroup(tab.id, url, cfg.cap, cfg.coldCap);
      results.push({ url, captured: r.captured, status: r.status });
      if (r.status === "logged-out") { loggedOut = true; break; }
      if (abortCycle) break;
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
    await setCycleState({
      running: false,
      status: abortCycle ? "stopped" : loggedOut ? "logged-out" : "idle",
      group: null,
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
  // Turning the monitor OFF is a real pause: abort the run that's in flight,
  // don't just skip the next one.
  if (changes.monitorEnabled && changes.monitorEnabled.newValue === false) {
    stopMonitorNow();
  }
  if (changes.monitorEnabled || changes.monitorInterval || changes.monitorGroups) {
    syncMonitorAlarm();
  }
});

// A restarted service worker means any cycle that was running is dead — clear
// the flag so the UI doesn't show a phantom "running" forever.
async function bootstrap() {
  const { monitorCycle } = await chrome.storage.local.get("monitorCycle");
  if (monitorCycle && monitorCycle.running) {
    await setCycleState({ running: false, status: "interrupted", group: null });
  }
  await syncMonitorAlarm();
}
chrome.runtime.onStartup.addListener(bootstrap);
chrome.runtime.onInstalled.addListener(bootstrap);
bootstrap();
