# Moving the monitor to another PC

Three things have to travel, and they travel **differently**:

| What | How | Why |
|------|-----|-----|
| **Code** (extension + server) | `git push` → `git clone` | already tracked; safe to publish |
| **Database** (`rides.db`) | direct copy (USB / AirDrop / scp) | ⚠️ contains ~300 real phone numbers — **never commit it**, the repo is public |
| **Firebase key** (`serviceAccount.json`) | direct copy (USB) | ⚠️ gitignored secret with full DB write access. **Without it, promoting rides to the website silently no-ops** |
| **Dependencies** (`node_modules`) | **re-install on the target** | `better-sqlite3` is a *native* module compiled per-OS/arch/Node version — copying it will not work |

---

## 1. On THIS machine — push the code

```bash
cd /Users/levanikantaria/gamiyole
git add fb-group-monitor
git commit -m "fb-group-monitor: reliability pass + migration tooling"
git push
```

`rides.db` is gitignored, so this publishes code only.

## 2. On THIS machine — export the database

```bash
cd fb-group-monitor/server
node export-bundle.js
```

Writes `server/bundle/rides.db` plus a `.sha256`. It uses SQLite's `VACUUM INTO`,
not a file copy — the DB runs in **WAL mode**, so copying `rides.db` on its own
can hand you a stale or torn snapshot.

Copy that `bundle/` folder to the other PC by USB / AirDrop / scp.

## 3. On the OTHER PC — set up

Install **Node 20+** (nodejs.org, LTS) and **Git for Windows**, then in PowerShell:

```powershell
git clone https://github.com/LevanKantaria/gamiyole.git
cd gamiyole\fb-group-monitor\server
npm install            # fetches a prebuilt better-sqlite3 for this machine
```

*If `npm install` tries to compile and fails*, install the C++ build chain once —
`npm install --global windows-build-tools`, or add "Desktop development with C++"
via the Visual Studio Installer — then re-run `npm install`.

Copy the transferred `bundle\rides.db` into this `server\` folder, then confirm it
survived the trip:

```powershell
copy ..\..\bundle\rides.db .\rides.db      # adjust to wherever you put the bundle
node export-bundle.js --verify rides.db
```

You should see the **same row/phone counts and the same sha256** as step 2. Then:

Also copy **`server\serviceAccount.json`** across the same way (USB — it's a
gitignored secret). Without it the server still runs and captures fine, but
promoting rides to the website is skipped with
`auto-promote skipped: No Firebase credentials`.

```powershell
node index.js          # dashboard at http://localhost:8787
```

**Promotion is off unless you ask for it.** `start-server.bat` sets
`AUTO_PROMOTE=1`, so the always-on machine publishes qualifying driver rides on
startup and after each ingest. Running `node index.js` by hand leaves it off —
promote manually with `node promote.js` (or `--dry-run`), and inspect decisions
at `http://localhost:8787/promote/candidates.html`.

## 4. On the OTHER PC — the extension

1. `chrome://extensions` → **Developer mode** on → **Load unpacked** →
   select `gamiyole/fb-group-monitor/extension`.
2. **Log into Facebook** in that Chrome. *(A login from a new device may trigger
   a checkpoint / 2FA — clear it before relying on the monitor.)*
3. Open the popup and re-enter the monitor settings: the group URLs, interval,
   posts-per-run, cold-start posts, and the server endpoint.

**You do not need to move the extension's stored state.** Its `seenIds` /
`seededGroups` only exist to avoid re-scrolling; the server dedups by post id, so
a fresh extension simply cold-starts each group once and those already-known
posts land as `added: 0`. Nothing is duplicated.

## 5. Keep it running 24/7 (Windows)

Two things must stay up: **the server** and **Chrome** (logged into Facebook,
window not minimised — Chrome throttles timers in minimised windows).

**a) Server on login.** `server\start-server.bat` runs the server and restarts it
if it ever exits. Add it to startup:

1. Press `Win+R`, type `shell:startup`, Enter.
2. Right-click → New → Shortcut → point it at
   `...\gamiyole\fb-group-monitor\server\start-server.bat`.

For something sturdier (survives without you logging in, retries on failure), use
Task Scheduler instead: *Create Task → Triggers: At startup → Actions: Start a
program →* `start-server.bat` *→ Settings: "Restart every 1 minute, up to 3 times"*,
and tick *"Run whether user is logged on or not"*.

**b) Chrome on login.** Put a Chrome shortcut in that same `shell:startup` folder.
Chrome remembers unpacked extensions, so it reloads the monitor automatically.
*After the first reboot, check `chrome://extensions` — Windows Chrome sometimes
shows a "disable developer mode extensions" prompt; make sure it's still enabled.*

**c) Never sleep.** Sleep stops both the server and Chrome's timers:

```
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /change monitor-timeout-ac 15
```

(Monitor off is fine — only *sleep* breaks it.)

**Verify after a reboot:** open `http://localhost:8787`, hit the extension popup,
press **Run now**, and confirm the status line shows a cycle completing.

---

## Don't do these

- ❌ **Don't run both machines at once.** Two extensions pointing at two separate
  databases will diverge and you'll have to merge them by hand. Decommission the
  old one once the new one is capturing.
- ❌ **Don't copy `node_modules`** — native module, it will fail to load.
- ❌ **Don't commit `rides.db`** or the `bundle/` folder.
- ❌ **Don't copy `rides.db` while the server is running** without `export-bundle.js`
  — the WAL sidecar means a raw copy can be inconsistent.
