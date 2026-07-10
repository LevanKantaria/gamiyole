const FIELDS = ["enabled", "groupFilter", "endpoint", "apiKey", "crawlLimit"];

function load() {
  chrome.storage.local.get(
    [...FIELDS, "lastFlush", "lastError", "outbox", "crawlProgress",
     "monitorEnabled", "monitorInterval", "monitorCap", "monitorColdCap", "monitorGroups", "monitorLastCycle",
     "monitorLastResults", "monitorLoggedOut"],
    (cfg) => {
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
      renderStatus(cfg);
      renderCrawl(cfg.crawlProgress);
      renderMonitor(cfg);
    }
  );
}

function renderMonitor(cfg) {
  const el = document.getElementById("monitorStatus");
  if (cfg.monitorLoggedOut) { el.textContent = "⚠ Facebook looks logged out — open FB and log in."; el.className = "hint err"; return; }
  el.className = "hint";
  if (!cfg.monitorEnabled) { el.textContent = "Off."; return; }
  const last = cfg.monitorLastCycle ? new Date(cfg.monitorLastCycle).toLocaleTimeString() : "—";
  const got = (cfg.monitorLastResults || []).reduce((s, r) => s + (r.captured || 0), 0);
  const n = (cfg.monitorGroups || []).filter(Boolean).length;
  el.textContent = `On · ${n} groups · last cycle ${last} (${got} new)`;
}

const CRAWL_LABELS = {
  running: (p) => `Crawling… captured ${p.captured}/${p.limit}`,
  "limit-reached": (p) => `Done — reached limit (${p.captured}).`,
  "end-of-feed": (p) => `Done — end of feed (${p.captured} captured).`,
  stopped: (p) => `Stopped at ${p.captured}.`,
  "wrong-group": () => `Not on the configured group page.`,
};

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
  const fmt = CRAWL_LABELS[p.status] || (() => `Idle.`);
  el.textContent = fmt(p);
  startBtn.disabled = !!p.active;
  stopBtn.disabled = !p.active;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToTab(message) {
  const tab = await activeTab();
  if (!tab) return;
  if (!/^https:\/\/www\.facebook\.com\/groups\//.test(tab.url || "")) {
    document.getElementById("crawlProgress").textContent = "Open your group tab first.";
    return;
  }
  chrome.tabs.sendMessage(tab.id, message, () => void chrome.runtime.lastError);
}

document.getElementById("startCrawl").addEventListener("click", () => {
  const limit = Math.max(1, Number(document.getElementById("crawlLimit").value) || 100);
  chrome.storage.local.set({ crawlLimit: limit });
  sendToTab({ type: "START_CRAWL", limit });
});

document.getElementById("stopCrawl").addEventListener("click", () => {
  sendToTab({ type: "STOP_CRAWL" });
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
    document.getElementById("status").textContent = "Saved.";
    setTimeout(load, 800);
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

chrome.storage.onChanged.addListener(load);
load();
