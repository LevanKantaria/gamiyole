const FIELDS = ["enabled", "groupFilter", "endpoint", "apiKey", "crawlLimit"];

const ALL_KEYS = [
  ...FIELDS, "lastFlush", "lastError", "outbox", "crawlProgress",
  "monitorEnabled", "monitorInterval", "monitorCap", "monitorColdCap", "monitorGroups",
  "monitorLastCycle", "monitorLastResults", "monitorLoggedOut", "monitorCycle", "monitorError",
];

// Fill the form inputs from storage. Called ONLY when the popup opens.
// It must never run on a refresh: the extension writes to storage constantly
// (crawlProgress, monitorCycle, outbox, lastFlush…), and re-filling the inputs
// on every write wipes whatever you're in the middle of typing.
function fillForm(cfg) {
  document.getElementById("enabled").checked = !!cfg.enabled;
  document.getElementById("groupFilter").value = cfg.groupFilter || "";
  document.getElementById("endpoint").value = cfg.endpoint || "http://localhost:8787/ingest";
  document.getElementById("apiKey").value = cfg.apiKey || "";
  if (cfg.crawlLimit) document.getElementById("crawlLimit").value = cfg.crawlLimit;
  document.getElementById("monitorEnabled").checked = !!cfg.monitorEnabled;
  document.getElementById("monitorInterval").value = cfg.monitorInterval || 30;
  document.getElementById("monitorCap").value = cfg.monitorCap || 20;
  document.getElementById("monitorColdCap").value = cfg.monitorColdCap || 40;
  document.getElementById("monitorGroups").value = (cfg.monitorGroups || []).join("\n");
}

// Status/labels/buttons only — never touches an input, so it's safe to run on a
// timer and on every storage change while you're typing.
function refreshStatus() {
  chrome.storage.local.get(ALL_KEYS, (cfg) => {
    renderStatus(cfg);
    renderCrawl(cfg.crawlProgress);
    renderMonitor(cfg);
  });
}

// Full load: inputs + status. Only on popup open.
function load() {
  chrome.storage.local.get(ALL_KEYS, (cfg) => {
    fillForm(cfg);
    renderStatus(cfg);
    renderCrawl(cfg.crawlProgress);
    renderMonitor(cfg);
  });
}

// A cycle whose heartbeat has gone quiet died with the service worker.
const CYCLE_STALE_MS = 5 * 60 * 1000;
function cycleIsLive(c) {
  return !!(c && c.running && Date.now() - (c.at || 0) < CYCLE_STALE_MS);
}

// Short, plain-language reason per group so a silent failure is never invisible.
const STATUS_LABEL = {
  ok: "", "logged-out": "logged out", unreachable: "page unreachable",
  "not-ready": "feed didn't load", timeout: "timed out", stopped: "stopped",
  busy: "busy", error: "error",
};

function renderMonitor(cfg) {
  const el = document.getElementById("monitorStatus");
  const stopBtn = document.getElementById("monitorStop");
  const runBtn = document.getElementById("monitorTest");
  const cyc = cfg.monitorCycle;
  const live = cycleIsLive(cyc);

  stopBtn.disabled = !live;
  runBtn.disabled = live;
  el.className = "hint";

  if (live) {
    el.textContent = `⏳ Running… group ${cyc.index || 0}/${cyc.total || 0}`;
    return;
  }
  if (cfg.monitorLoggedOut) {
    el.textContent = "⚠ Facebook looks logged out — open FB and log in.";
    el.className = "hint err";
    return;
  }

  const n = (cfg.monitorGroups || []).filter(Boolean).length;
  const results = cfg.monitorLastResults || [];
  const got = results.reduce((s, r) => s + (r.captured || 0), 0);
  const bad = results.filter((r) => r.status && r.status !== "ok");
  const last = cfg.monitorLastCycle ? new Date(cfg.monitorLastCycle).toLocaleTimeString() : "—";

  let msg = cfg.monitorEnabled
    ? `On · ${n} groups · every ${cfg.monitorInterval || 30}m`
    : `Off · ${n} groups configured`;
  if (results.length) msg += ` · last ${last} (${got} new)`;
  if (cyc && cyc.status === "interrupted") msg += " · last cycle was interrupted";

  if (bad.length) {
    // Name what actually went wrong instead of silently reporting "0 new".
    const detail = bad.map((r) => STATUS_LABEL[r.status] || r.status).join(", ");
    msg += ` · ⚠ ${bad.length}/${results.length} failed: ${detail}`;
    el.className = "hint err";
  }
  el.textContent = msg;
}

const CRAWL_LABELS = {
  running: (p) => `Crawling… captured ${p.captured}/${p.limit}`,
  "limit-reached": (p) => `Done — reached limit (${p.captured}).`,
  "end-of-feed": (p) => `Done — end of feed (${p.captured} captured).`,
  stopped: (p) => `Stopped at ${p.captured}.`,
  "wrong-group": () => `Not on the configured group page.`,
  busy: () => `Busy — another run is in progress.`,
  error: (p) => `Failed after ${p.captured}. Try again.`,
};

// If the crawling tab was closed or navigated, no final report ever arrives and
// crawlProgress.active stays true forever. Treat a quiet "running" as finished
// so the Start button can never get permanently stuck.
const CRAWL_STALE_MS = 90 * 1000;
function crawlIsLive(p) {
  return !!(p && p.active && Date.now() - new Date(p.at || 0).getTime() < CRAWL_STALE_MS);
}

function renderCrawl(p) {
  const el = document.getElementById("crawlProgress");
  const startBtn = document.getElementById("startCrawl");
  const stopBtn = document.getElementById("stopCrawl");
  if (!p) {
    el.textContent = "Idle.";
    startBtn.disabled = false;
    stopBtn.disabled = true;
    return;
  }
  const live = crawlIsLive(p);
  const fmt = CRAWL_LABELS[p.status] || (() => `Idle.`);
  el.textContent = p.active && !live ? "Idle (previous run ended)." : fmt(p);
  startBtn.disabled = live;
  stopBtn.disabled = !live;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

document.getElementById("startCrawl").addEventListener("click", async () => {
  const limit = Math.max(1, Number(document.getElementById("crawlLimit").value) || 100);
  const tab = await activeTab();
  if (!tab || !/^https:\/\/www\.facebook\.com\/groups\//.test(tab.url || "")) {
    document.getElementById("crawlProgress").textContent = "Open your group tab first.";
    return;
  }
  // Remember WHICH tab is crawling so Stop can reach it even if you switch tabs.
  chrome.storage.local.set({ crawlLimit: limit, crawlTabId: tab.id });
  chrome.tabs.sendMessage(tab.id, { type: "START_CRAWL", limit }, () => void chrome.runtime.lastError);
});

// Stop must work regardless of which tab you're looking at: message the tab that
// started the crawl, plus every open group tab as a fallback, and clear the local
// progress state so the UI recovers even if no tab answers.
document.getElementById("stopCrawl").addEventListener("click", async () => {
  const { crawlTabId } = await chrome.storage.local.get("crawlTabId");
  const tabs = await chrome.tabs.query({ url: "https://www.facebook.com/groups/*" });
  const ids = new Set([...(crawlTabId ? [crawlTabId] : []), ...tabs.map((t) => t.id)]);
  for (const id of ids) {
    chrome.tabs.sendMessage(id, { type: "STOP_CRAWL" }, () => void chrome.runtime.lastError);
  }
  chrome.storage.local.set({
    crawlProgress: { active: false, captured: 0, limit: 0, status: "stopped", at: new Date().toISOString() },
  });
});

function renderStatus(cfg) {
  const el = document.getElementById("status");
  const pending = (cfg.outbox || []).length;
  const parts = [];
  if (cfg.lastFlush) parts.push(`Last sent: ${new Date(cfg.lastFlush).toLocaleTimeString()}`);
  if (pending) parts.push(`${pending} pending`);
  el.textContent = parts.join(" · ") || "No posts sent yet.";
  el.className = "status" + (cfg.lastError ? " err" : "");
  if (cfg.lastError) el.textContent = `Error: ${cfg.lastError}`;
}

function monitorGroupsFromUI() {
  return document.getElementById("monitorGroups").value
    .split("\n").map((s) => s.trim()).filter((s) => /facebook\.com\/groups\//.test(s));
}

function monitorCapFromUI() {
  return Math.max(1, Number(document.getElementById("monitorCap").value) || 20);
}

function monitorColdCapFromUI() {
  return Math.max(1, Number(document.getElementById("monitorColdCap").value) || 40);
}

// Forget which posts we've seen so the next run cold-starts (re-scans from the
// top). Clears ONLY the seen-set + seed flags — never the outbox or the DB.
document.getElementById("resetSeen").addEventListener("click", () => {
  chrome.storage.local.remove(["seenIds", "seededGroups"], () => {
    document.getElementById("resetSeenStatus").textContent =
      "Seen-set cleared — next run re-scans from the top.";
  });
});

document.getElementById("save").addEventListener("click", () => {
  const values = {
    enabled: document.getElementById("enabled").checked,
    groupFilter: document.getElementById("groupFilter").value.trim(),
    endpoint: document.getElementById("endpoint").value.trim(),
    apiKey: document.getElementById("apiKey").value,
    monitorInterval: Math.max(5, Number(document.getElementById("monitorInterval").value) || 30),
    monitorCap: monitorCapFromUI(),
    monitorColdCap: monitorColdCapFromUI(),
    monitorGroups: monitorGroupsFromUI(),
  };
  chrome.storage.local.set(values, () => {
    // Report what was accepted instead of silently re-filling the textarea from
    // the filtered list — that made rejected lines just vanish, which looked
    // like the field "reset itself".
    const typed = document.getElementById("monitorGroups").value
      .split("\n").map((s) => s.trim()).filter(Boolean).length;
    const kept = values.monitorGroups.length;
    const dropped = typed - kept;
    // Own element: #status belongs to renderStatus(), which would overwrite this
    // on the very next refresh tick.
    const el = document.getElementById("saveStatus");
    el.textContent = dropped
      ? `Saved ${kept} group URL${kept === 1 ? "" : "s"} · ${dropped} line${dropped === 1 ? "" : "s"} ignored (must contain facebook.com/groups/)`
      : `Saved · ${kept} group URL${kept === 1 ? "" : "s"}`;
    el.className = "hint" + (dropped ? " err" : "");
    refreshStatus(); // status only — leaves your typing alone
  });
});

// live-toggle enabled without needing Save
document.getElementById("enabled").addEventListener("change", (e) => {
  chrome.storage.local.set({ enabled: e.target.checked });
});

// Toggling the monitor also persists the current URLs/interval so the alarm syncs.
document.getElementById("monitorEnabled").addEventListener("change", (e) => {
  chrome.storage.local.set({
    monitorEnabled: e.target.checked,
    monitorGroups: monitorGroupsFromUI(),
    monitorInterval: Math.max(5, Number(document.getElementById("monitorInterval").value) || 30),
    monitorCap: monitorCapFromUI(),
    monitorColdCap: monitorColdCapFromUI(),
  });
});

document.getElementById("monitorStop").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "STOP_MONITOR_NOW" }, () => void chrome.runtime.lastError);
  document.getElementById("monitorStatus").textContent = "Stopping…";
});

document.getElementById("monitorTest").addEventListener("click", () => {
  chrome.storage.local.set({
    monitorGroups: monitorGroupsFromUI(),
    monitorInterval: Math.max(5, Number(document.getElementById("monitorInterval").value) || 30),
    monitorCap: monitorCapFromUI(),
    monitorColdCap: monitorColdCapFromUI(),
  }, () => {
    chrome.runtime.sendMessage({ type: "RUN_MONITOR_NOW" }, () => void chrome.runtime.lastError);
    document.getElementById("monitorStatus").textContent = "Running one cycle…";
  });
});

// Refresh STATUS only — never the inputs, or typing gets clobbered.
chrome.storage.onChanged.addListener(refreshStatus);
// "Is this run still alive?" is time-based, so poll as well as react to writes.
setInterval(refreshStatus, 2000);
// Inputs are populated exactly once, when the popup opens.
load();
