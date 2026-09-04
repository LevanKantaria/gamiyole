#!/usr/bin/env node
// export-bundle.js — make a safe, portable copy of the database for moving to
// another machine.
//
//   node export-bundle.js                 → writes ./bundle/rides.db (+ checksum)
//   node export-bundle.js /path/to/out    → writes there instead
//   node export-bundle.js --verify FILE   → check a transferred copy is intact
//
// Why not just `cp rides.db`? The DB runs in WAL mode: recent writes can live in
// the rides.db-wal sidecar, so a plain copy of the .db alone can be STALE or
// inconsistent. VACUUM INTO asks SQLite itself to write a single, fully
// checkpointed, self-contained file — the correct way to snapshot a live DB.
//
// NOTE: this file contains real people's phone numbers. Move it directly
// (USB / AirDrop / scp). Never commit it — the repo is public.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const SRC = process.env.DB_FILE || path.join(__dirname, "rides.db");

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function summarize(file) {
  const db = new Database(file, { readonly: true });
  const one = (sql) => { try { return db.prepare(sql).get().n; } catch { return "n/a"; } };
  const out = {
    posts: one("SELECT COUNT(*) n FROM posts"),
    comments: one("SELECT COUNT(*) n FROM posts WHERE kind='comment'"),
    phones: one("SELECT COUNT(DISTINCT phone) n FROM phones"),
    profiles: one("SELECT COUNT(*) n FROM profiles"),
  };
  db.close();
  return out;
}

function verify(file) {
  if (!fs.existsSync(file)) { console.error(`✗ not found: ${file}`); process.exit(1); }
  let s;
  try {
    const db = new Database(file, { readonly: true });
    const integrity = db.prepare("PRAGMA integrity_check").get();
    db.close();
    if (integrity && integrity.integrity_check !== "ok") {
      console.error("✗ integrity_check failed:", integrity.integrity_check);
      process.exit(1);
    }
    s = summarize(file);
  } catch (e) {
    console.error("✗ could not open as a SQLite database:", e.message);
    process.exit(1);
  }
  console.log(`✓ ${path.basename(file)} is a valid, intact database`);
  console.log(`  ${s.posts} rows (${s.comments} comments) · ${s.phones} phone numbers · ${s.profiles} people`);
  console.log(`  sha256 ${sha256(file)}`);
}

function exportBundle(outDir) {
  if (!fs.existsSync(SRC)) { console.error(`✗ no database at ${SRC}`); process.exit(1); }
  fs.mkdirSync(outDir, { recursive: true });
  const dest = path.join(outDir, "rides.db");
  if (fs.existsSync(dest)) fs.unlinkSync(dest); // VACUUM INTO refuses to overwrite

  const db = new Database(SRC, { readonly: true });
  db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`); // consistent snapshot
  db.close();

  const s = summarize(dest);
  const sum = sha256(dest);
  fs.writeFileSync(path.join(outDir, "rides.db.sha256"), sum + "  rides.db\n");

  const mb = (fs.statSync(dest).size / 1048576).toFixed(1);
  console.log(`✓ exported → ${dest}  (${mb} MB)`);
  console.log(`  ${s.posts} rows (${s.comments} comments) · ${s.phones} phone numbers · ${s.profiles} people`);
  console.log(`  sha256 ${sum}`);
  console.log(`\nNext: copy this folder to the other PC (USB / AirDrop / scp).`);
  console.log(`Do NOT commit it — the repo is public and this holds real phone numbers.`);
  console.log(`On the other PC, verify with:  node export-bundle.js --verify rides.db`);
}

const args = process.argv.slice(2);
if (args[0] === "--verify") verify(args[1] || path.join(__dirname, "rides.db"));
else exportBundle(path.resolve(args[0] || path.join(__dirname, "bundle")));
