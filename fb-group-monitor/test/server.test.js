// Exercise real HTTP startup + repeated ingests without touching real data/Firebase.
const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');
const index = path.resolve(__dirname, '../server/index.js');

async function testServer({ mode, credentials, enabled }) {
  const bootstrap = `
    const fs = require('fs'), path = require('path'), http = require('http');
    const exists = fs.existsSync;
    fs.existsSync = (p) => path.basename(String(p)) === 'serviceAccount.json' ? ${credentials} : exists(p);
    // Suppress the real server's log file while its publisher is mocked.
    fs.appendFile = (...args) => args.at(-1)(null);
    const listen = http.Server.prototype.listen;
    http.Server.prototype.listen = function (...args) {
      this.once('listening', () => process.send({ port: this.address().port }));
      return listen.apply(this, args);
    };
    let calls = 0;
    const promotePath = require.resolve(${JSON.stringify(path.resolve(__dirname, '../server/promote.js'))});
    require.cache[promotePath] = { exports: {
      promoteRides: async () => ({ qualified: 1, candidates: 1, written: 1, removed: 0,
        requestsQualified: 0, requestCandidates: 0, requestsWritten: 0, requestsRemoved: 0,
        callNumber: ++calls }),
      clearExternalRides: async () => ({}), evaluateCandidates: () => ({})
    }};
    require(${JSON.stringify(index)});
  `;
  const env = { ...process.env, PORT: '0', DB_FILE: ':memory:', API_KEY: '' };
  delete env.GOOGLE_APPLICATION_CREDENTIALS;
  delete env.AUTO_PROMOTE;
  if (mode != null) env.AUTO_PROMOTE = mode;
  const child = spawn(process.execPath, ['-e', bootstrap], { env, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  let output = '';
  child.stdout.on('data', (s) => { output += s; });
  child.stderr.on('data', (s) => { output += s; });
  const exited = new Promise((resolve) => child.once('exit', resolve));
  try {
    const port = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('server startup timed out: ' + output)), 10000);
      child.once('message', (m) => { clearTimeout(timeout); resolve(m.port); });
      child.once('error', (e) => { clearTimeout(timeout); reject(e); });
      child.once('exit', (code) => { clearTimeout(timeout); reject(new Error('server exited: ' + code + ' ' + output)); });
    });
    const base = `http://127.0.0.1:${port}`;
    const status = async () => (await fetch(base + '/promote/status')).json();
    const initial = await status();
    assert.strictEqual(initial.autoPromote, enabled);
    assert.strictEqual(initial.dbFile, ':memory:');
    if (enabled) {
      const post = { postId: '123', text: 'გავდივარ ბათუმიდან თბილისში', via: 'monitor',
        capturedAt: '2026-10-12T12:00:00Z', groupId: '123' };
      for (const expectedAdded of [1, 0]) {
        const before = (await status()).last.callNumber;
        const res = await fetch(base + '/ingest', { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ posts: [post] }) });
        const body = await res.json();
        assert.strictEqual(body.added, expectedAdded);
        assert.strictEqual(body.processed, 1);
        const after = await status();
        assert.strictEqual(after.last.reason, 'ingest');
        assert.ok(after.last.callNumber > before, 'new and updated captures both trigger promotion');
      }
    }
    console.log(`startup mode=${mode ?? 'default'} credentials=${credentials} autoPromote=${enabled} passed`);
  } finally {
    child.kill();
    await exited;
  }
}

(async () => {
  await testServer({ credentials: true, enabled: true });
  await testServer({ credentials: false, enabled: false });
  await testServer({ mode: '0', credentials: true, enabled: false });
  await testServer({ mode: '1', credentials: false, enabled: true });
})().catch((e) => { console.error(e); process.exitCode = 1; });
