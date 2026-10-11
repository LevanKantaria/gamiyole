// In-memory integration: parser -> stored posts -> actual promotion gates.
// Fixed Tbilisi day; dry runs never use Firebase or write live listings.
const assert = require("assert");
const RealDate = Date;
const REF = "2026-10-11T12:00:00Z";
global.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [REF])); }
  static now() { return RealDate.parse(REF); }
};
process.env.DB_FILE = ":memory:";
const { enrich } = require("../server/parse");
const { db, upsertPost, reenrichRoutes, queries } = require("../server/db");
const { promoteRides, evaluateCandidates } = require("../server/promote");

const add = (postId, text, extra = {}) => upsertPost(enrich({
  postId, text, kind: "post", via: "monitor", groupId: "123",
  permalink: `https://www.facebook.com/groups/123/posts/${postId}/`,
  capturedAt: REF, ...extra,
}));
const stored = (postId) => db.prepare("SELECT * FROM posts WHERE post_id=?").get(postId);

async function main() {
  add("1", "გავდივარ ბათუმიდან თბილისში");
  add("2", "ბათუმიდან გავდივარ ქუთაიში და შემდეგ თბილისში");
  add("3", "Miaxloebit 1 saatshi gavdivar kutaisi-tbilisi wagiyvant usasyidlod");
  add("4", "გამარჯობათ ვარ 1ადამიანი დღეს ბათუმიდან თბილიში ხო არ მიდოხართ უახლოეს საათებში");
  add("5", "Exla tb xoar midis vinme? Qutaisidan");
  add("6", "შემდეგ კვირას გავდივარ ბათუმიდან თბილისში 5-ზე");
  add("7", "momaval kviras gavdivar tbilisidan batumshi");
  add("8", "გავდივარ თვის ბოლოს თბილისიდან ბათუმში");
  add("9", "გავდივარ ბათუმიდან თბილისში", { postedAt: "2026-10-10T12:00:00Z" });
  add("10", "ხვალ გავდივარ თბილისიდან ბათუმში", { capturedAt: "2026-10-10T12:00:00Z" });
  add("10", "ხვალ გავდივარ თბილისიდან ბათუმში");
  add("11", "გავდივარ თბილისიდან ბათუმში", { capturedAt: "2026-10-10T12:00:00Z" });
  add("11", "გავდივარ თბილისიდან ბათუმში");
  add("h12", "გავდივარ თბილისიდან ქუთაისში", { capturedAt: "2026-10-10T12:00:00Z" });
  add("12", "გავდივარ თბილისიდან ქუთაისში", { aliasId: "h12" });
  add("13", "თბილისი → ბათუმი დღეს თავისუფალია 6 ადგილი");
  // Legacy undated records also use the corrected, normalized fallback guard.
  add("14", "ბათუმიდან გავდივარ ქუთაიში და შემდეგ თბილისში");
  db.prepare("UPDATE posts SET departure_date=NULL WHERE post_id='14'").run();
  add("15", "ხვალ მივდივარ თბილისიდან ბათუმში");
  // A known publication timestamp arriving later corrects the reference day.
  add("15", "ხვალ მივდივარ თბილისიდან ბათუმში", { postedAt: "2026-10-10T12:00:00Z" });

  assert.strictEqual(stored("10").departure_date, "2026-10-11", "tomorrow remains anchored to first capture");
  assert.strictEqual(stored("11").departure_date, "2026-10-10", "same-day post must not become new each day");
  assert.strictEqual(stored("12").captured_at, "2026-10-10T12:00:00Z", "hash to real-id replacement keeps first sighting");
  assert.strictEqual(stored("15").departure_date, "2026-10-11", "known publication time takes priority");
  assert.strictEqual(stored("3").departure_time, "17:00");
  assert.strictEqual(stored("4").user_type, "passenger");
  assert.strictEqual(stored("5").route_to, "Tbilisi");
  assert.strictEqual(stored("13").user_type, "driver");

  const candidates = evaluateCandidates().items;
  const qualifies = (text) => candidates.find((x) => x.text === text)?.verdict;
  assert.strictEqual(qualifies("გავდივარ ბათუმიდან თბილისში"), "qualified");
  assert.strictEqual(qualifies("ბათუმიდან გავდივარ ქუთაიში და შემდეგ თბილისში"), "qualified");
  assert.strictEqual(qualifies("შემდეგ კვირას გავდივარ ბათუმიდან თბილისში 5-ზე"), "rejected");
  assert.strictEqual(qualifies("momaval kviras gavdivar tbilisidan batumshi"), "rejected");

  const result = await promoteRides({ dryRun: true });
  assert.strictEqual(result.qualified, 6, "current/tomorrow offers qualify; expired and vague future offers do not");
  assert.strictEqual(result.requestsQualified, 2, "recovered requests use the same promotion path");
  assert.strictEqual(result.written + result.requestsWritten, 0);

  db.prepare("UPDATE posts SET departure_date=NULL, departure_text='old parser' WHERE post_id='1'").run();
  reenrichRoutes();
  assert.strictEqual(stored("1").departure_date, "2026-10-11");
  assert.strictEqual(stored("1").departure_text, "გავდივარ");
  assert.strictEqual(stored("11").departure_date, "2026-10-10", "re-enrichment also retains first sighting");
  console.log("all promotion cases pass");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => {
  db.close();
  global.Date = RealDate;
});
