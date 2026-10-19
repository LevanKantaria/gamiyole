// node test/parse.test.js — parser regression cases, taken from real group posts.
// Reference capture: Fri 2026-09-18 17:32 in Tbilisi.
const assert = require("assert");
const { enrich, extractDeparture, extractRoute, classifyType } = require("../server/parse");

const REF = "2026-09-18T13:32:00Z";
let failed = 0;
function check(label, fn) {
  try { fn(); } catch (e) { failed++; console.log(`✗ ${label}\n    ${e.message}`); }
}
const dep = (text, date, time = null) =>
  check(`date "${text}"`, () => {
    const r = extractDeparture(text, REF);
    assert.deepStrictEqual([r.departureDate || null, r.departureTime || null], [date, time]);
  });
const route = (text, from, to) =>
  check(`route "${text}"`, () => {
    const r = extractRoute(text);
    assert.deepStrictEqual([r.from, r.to], [from, to]);
  });
const type = (text, t) => check(`type "${text}"`, () => assert.strictEqual(classifyType(text), t));

// ---- dates & times ----
dep("22 ში მივდივარ ბათუმში", "2026-09-22");               // N-ში = the Nth
dep("11 რიცხვში მივდივარ", "2026-10-11");                   // passed → next month
dep("დღეს 3ში ხომ არ მიდიხართ", "2026-09-18", "15:00");     // with a day word it's an hour
dep("ხვალ ანი 20ში 12 საათზე დღის", "2026-09-20", "12:00"); // 20 can't be an hour
dep("5-ზე გავდივარ", "2026-09-18", "17:00");                // bare hour → PM
dep("8 ზე საღამოს", "2026-09-18", "20:00");
dep("ხვალ დილით 9 საათზე", "2026-09-19", "09:00");
dep("ღამის 2 საათზე გავდივარ", "2026-09-18", "02:00");
dep("ღამე 12–ზე გავდივარ", "2026-09-19", "00:00");
dep("დღეს საღამოს 9-10 საათის შუალედში", "2026-09-18", "21:00"); // range → start
dep("დილამშვიდობის,დღეს საღამოს 9-10 საათის შუალედში", "2026-09-18", "21:00"); // greeting ≠ morning
dep("ხვალ საღამოს 11ის ნახევარზე", "2026-09-19", "22:30"); // half past ten
dep("დღეს 2-3 ისკენ", "2026-09-18", "14:00");
dep("დღეს ორ საათზე გავდივარ", "2026-09-18", "14:00");
dep("ხვალ პირველი საათის შემდეგ", "2026-09-19", "13:00");
dep("20.07 მივდივარ", "2026-07-20");                        // a date, not 20:07
dep("08.07.2026 21:00 საათზე", "2026-07-08", "21:00");
dep("3/09 ბათუმიდან გავდივარ", "2026-09-03");
dep("24/7 მგზავრობა", null);
dep("12 ისკენ გავდივარ ჩხოროწყუდან თბილიში მაქვს 2/3ადგილი", "2026-09-18", "12:00");
dep("12:00 ზე გავდივარ", "2026-09-18", "12:00");
dep("დღეს 17:30 ზე გავდივარ", "2026-09-18", "17:30");
dep("1 სთში გავდივარ", "2026-09-18", "18:32");               // "in 1 hour"
dep("20 წუთში ვაგდივარ", "2026-09-18", "17:52");
dep("ეხლა გავდივარ", "2026-09-18");
dep("კვირას გაგიყოლებთ", "2026-09-20");
dep("გავდივარ 7-ში დილის 11 დან 12მდე", "2026-10-07", "11:00"); // the 7th has passed → next month
dep("გავდივარ 16-ში დილით", "2026-09-16", "08:00");               // …but 2 days back = a late capture
dep("xval sagamos tbilisidan batumshi gaviyoleb", "2026-09-19", "19:00"); // Latin script
dep("dges 4shi xoar midixart", "2026-09-18", "16:00");
dep("ერთ კვირაში მივდივარ", null);
dep("სალამი.5სათზე გავდივარ", "2026-09-18", "17:00");      // "." after a word isn't a decimal
dep("ბათუმი 24/7 ზე დაკვეთით", null);                      // "24/7" is not "at 7"
dep("ხვალ ანუ 19ში ბათუმიდან", "2026-09-19");              // the 19th IS tomorrow → a date
dep("დღეს 12სთ საღამოთი", "2026-09-19", "00:00");          // 12 in the evening = midnight
dep("ხვალ, 24.09.26 დღის პირველ ნახევარში", "2026-09-24", "08:00");
dep("შაბათს, 25.09.2026, დილით ადრე მივდივარ, ხოლო საღამოს ვბრუნდები", "2026-09-25", "08:00");
dep("ამაღამ ან ხვალ დილით გავდივარ", "2026-09-19", "19:00"); // first-named part of day wins
dep("დღეს საღამის გავდივარ", "2026-09-18", "19:00");        // typo of საღამოს
dep("გვიან ესე 11 სკენ", "2026-09-18", "23:00");            // "late … 11" = 23:00

// Same-day intent belongs in the parser, with explicit later dates taking priority.
for (const text of [
  "გავდივარ ბათუმიდან თბილისში", "გავდივართ თბილისიდან ბათუმში",
  "ბათუმიდან მივდივარ თბილისისკენ", "გავდუვარ თბილისიდან ახალციხის მიმართულებით",
  "ბათუმიდან გავდივარ ქუთაიში და შემდეგ თბილისში",
  "gavdivar tbilisidan batumshi", "უახლოეს საათებში ბათუმიდან თბილისში დაგემგზავრებით",
]) dep(text, "2026-09-18");
dep("ხვალ გავდივარ ბათუმიდან თბილისში", "2026-09-19");
dep("22 სექტემბერს გავდივარ თბილისიდან ბათუმში", "2026-09-22");
dep("orsaatshi tbilisidan dasavletit usasyidlot", "2026-09-18", "19:32");
dep("Miaxloebit 1 saatshi gavdivar kutaisi-tbilisi wagiyvant usasyidlod", "2026-09-18", "18:32");
dep("ხვალ 2 საათში გავდივარ თბილისიდან ბათუმში", "2026-09-19");
dep("22 სექტემბერს 2 საათში გავდივარ თბილისიდან ბათუმში", "2026-09-22");
for (const text of [
  "გავდივარ მომავალ კვირას 5-ზე", "შემდეგ კვირას გავდივარ ბათუმში",
  "გავდივარ თვის ბოლოს", "ერთ კვირაში მივდივარ", "momaval kviras gavdivar batumshi",
  "ქუთაისიდან თბილისში ხომ არ მიდიხართ ამ დღეებში ვინმე?",
]) dep(text, null);
dep("დღეს გავდივარ, წინასწარ შემეხმიანეთ", "2026-09-18");
dep("ახლა გავდივარ თბილისიდან ბათუმში, წინასწარ მომწერეთ", "2026-09-18");
dep("დილა მშვიდობის, თბილისი ბათუმი", null); // greeting alone gives no date
check("relative duration rolls over the Tbilisi midnight", () => {
  const p = extractDeparture("orsaatshi gavdivar", "2026-09-18T19:30:00Z");
  assert.deepStrictEqual([p.departureDate, p.departureTime], ["2026-09-19", "01:30"]);
});
check("same-day intent is relative to publication, not a late capture", () => {
  const p = enrich({ text: "გავდივარ ბათუმიდან თბილისში", postedAt: "2026-09-17T12:00:00Z", capturedAt: REF });
  assert.deepStrictEqual([p.departureDate, p.dateSource, p.departureText], ["2026-09-17", "relative", "გავდივარ"]);
});
route("TBILISI--Lopota. Adgili 3", "Tbilisi", "Lopota");     // "ლოპოთა" is Lopota, not Poti
route("ახლა გავდივარ თბილისიდან ურეკში", "Tbilisi", "Ureki");  // places the site groups later
route("ეხლა ქუთაისიდან ჩოხატაურში ხომარ მიდიხართ", "Kutaisi", "Chokhatauri");
route("ხვალ მივდივარ სვანეთიდან თბილისში", "Svaneti", "Tbilisi");
route("Dges tbilisidan rachis mimartulebit xom aravin midis", "Tbilisi", "Racha");
route("თბილისიდან ახმეტაში", "Tbilisi", "Akhmeta");
route("21 batumidan kutaishi xom ar midixart", "Batumi", "Kutaisi"); // "kutaishi"
route("გავდივარ ქუთაშიდან ბათუნში", "Kutaisi", "Batumi");         // clipped + typo spellings
route("ნახალოვკიდან გავდივარ რუსთავში", "Tbilisi", "Rustavi");      // Tbilisi district
route("ბათუმიდან გავდივარ თბილისში, ურეკის გავლით", "Batumi", "Tbilisi"); // a city beats a stop on the way
route("დაურეკეთ ბათუმიდან თბილისში", "Batumi", "Tbilisi");          // "დაურეკეთ" (call) ≠ Ureki

// ---- routes ----
route("ხვალ გავდივარ ქუთაისიდან თბილიში", "Kutaisi", "Tbilisi");   // "თბილიში" typo
route("ბათუმიდან თფილისში გავიყოლებ", "Batumi", "Tbilisi");         // old name
route("თბილისიდანზუგდიდში მივდივარ", "Tbilisi", "Zugdidi");          // glued words
route("რუსთავი-თბილისიდან ბათუმი, ქობულეთი, ურეკის მიმართულებით! დასავლეთის", "Tbilisi", "Ureki"); // → Batumi on the site
route("რუსთავი-თბილისიდან ბათუმი, ქობულეთი, დასავლეთის მიმართულებით", "Tbilisi", "Batumi");
route("რუსთავიდან თბილისიდან წნორი-ლაგოდეხი კახეთის მიმართულებით", "Tbilisi", "Lagodekhi"); // town over village
route("martvilisken 250larad vin wamoxvalt", null, "Martvili");    // "თვილის" typo ≠ inside მართვილის
route("1 საათში რუსთავიდან გავდივარ კახეთში სიღნაღი", "Rustavi", "Sighnaghi"); // region → city
route("დიღმის მასივიდან გავდივართ ბათუმის მიმართულებით", "Tbilisi", "Batumi"); // district
route("ხვალ, ზეგ რუსთავი-თბილისიდან ბათუმი", "Tbilisi", "Batumi");
route("Dges gavdivar kutaisidan tbilisis mimartulebit", "Kutaisi", "Tbilisi");
route("დᲦეს Თუ წამოხვალᲗ 3 კაცი ბაᲗუმᲨი თბილისიდან", "Tbilisi", "Batumi"); // Mtavruli caps
route("სამგორიდან ბათუმში", "Tbilisi", "Batumi");                     // სამგორი is Tbilisi, not Gori
route("მივდივარ თბილისი-ბათუმი გაგიყოლებთ", "Tbilisi", "Batumi");
route("Exla tb xoar midis vinme? Qutaisidan", "Kutaisi", "Tbilisi");
route("tbilisidan batumshi", "Tbilisi", "Batumi"); // full name still wins over tb alias
route("qutaisidan tb_shi ro gamiyolot", "Kutaisi", "Tbilisi");
route("თბდან ბათუმში გავდივარ", "Tbilisi", "Batumi");
route("რუსთავში თუ მიდის ვინმე ნუცუბიძიდან ??", "Tbilisi", "Rustavi");
route("მოწითბო მანქანა ქუთაისში", null, "Kutaisi"); // abbreviation must be a word
route("გავიყოლებ თბილიდან ბოლნისში", "Tbilisi", "Bolnisi");
route("Hello , 21 ში გავდივარ თბილიდიდან დასავლეთის მიმართულებით გავიყოლებ 2 მგზავრს უსასყოდლოდ", "Tbilisi", "West");
route("დღეს ღამე გვიან გავდივარ თბილისში", null, "Tbilisi"); // no origin in the text
route("თბილი ამინდია ბათუმში", null, "Batumi"); // warm weather is not Tbilisi
check("October 21 departure survives a misspelled Tbilisi origin", () => {
  const p = enrich({ text: "Hello , 21 ში გავდივარ თბილიდიდან დასავლეთის მიმართულებით გავიყოლებ 2 მგზავრს უსასყოდლოდ",
    capturedAt: "2026-10-20T12:00:00+04:00" });
  assert.deepStrictEqual([p.userType, p.routeFrom, p.routeTo, p.departureDate], ["driver", "Tbilisi", "West", "2026-10-21"]);
});
check("today late-night departure has a date but no invented origin", () => {
  const p = enrich({ text: "დღეს ღამე გვიან გავდივარ თბილისში", capturedAt: "2026-10-20T12:00:00+04:00" });
  assert.deepStrictEqual([p.userType, p.routeFrom, p.routeTo, p.departureDate], ["driver", null, "Tbilisi", "2026-10-20"]);
});

// ---- driver / passenger ----
type("ქუთაისიდან თბილისში თუ მოდიხართ ვინმე შემიძლია გაგიყოლოთ", "driver");
type("ბათუმიდან თბილისში მოვდივართ ორი გოგო დღესვე გაგვიყოლეთ ვინმემ", "passenger");
type("17 ივლისს ვინმე ხო არ გადიხართ თბილისიდან ოზურგეთისკენ მინივენი უკეთესი იქნება 6 ვართ", "unknown");
type("ბათუმიდან თბილისსში ამაღამ მიდის ვინმე პრავიანი", "passenger");
type("6 სექტემბერს 23:30 საათისკენ სამტრედიიდან თბილისისკენ დავიმგზავრებ მაქს 2 ადამიანს", "driver");
type("ბათუმი თბილისი 3 ადგილი კაცი 70ლარი საკუთარი მანქანით", "driver");
type("ქობულეთამდე ერთი მგზავრია წამოსაყვანი. გადავიხდი 50ლარს", "passenger");
type("უახლოეს საათებში ბათუმი>თბილისი გამოგყვებით, 2 გოგო ვართ.", "passenger");
type("დღეს ღამე მივდივარ ქობულეთში მოდიხართ ვინმე", "driver");
type("6 ის ბათუმი თბილისი 17:10 ბილეთი მაქვს 1 ზედმეტი ვისაც გინდათ გაგიყოლებთ", "unknown");
type("Dges gavdivar kutaisidan tbilisis mimartulebit gagiyolebt tu modixart", "driver");
type("gamarjoba batumidan qutaisshi aravin midixart rogamiyolot? erti gogona var", "passenger");
type("ხვალ დილით გავდივარ ბათუმიდანა თფილისში.გავიყოლებ 2-3 ადამიანს.", "driver");
type("თბილისი → ბათუმი ხვალ 2 ოქტომბერს გასვლა: დილის 07:00 საათზე თავისუფალია 6 ადგილი ფასი: 45 ლარი — 1 ადამიანი", "driver");
type("გამარჯობათ ვარ 1ადამიანი დღეს ბათუმიდან თბილიში ხო არ მიდოხართ უახლოეს საათებში", "passenger");
type("მოგესალმებით ფოთელებო.ვარ სტუმრად მინდა დავემგზავრო თბილისამდე სანდო ადამიანს", "passenger");
type("ქუთაისიდან თბილისში ხომ არ მიდიხართ თავისუფალი ადგილი თუ გექნებათ?", "passenger");

// Real ride-seeker examples: intent, route and date must agree together.
const requestExamples = [
  ["dges batumidan tbilisis mimartulebit vinme xoar midixart rogagviyolot ori gogona vart 2patara chanta gvaqvs ❤️", "Batumi", "Tbilisi", "2026-10-10"],
  ["გამარჯობათ, დღეს 10 ოქტომბერსსს ვინმე ხოარმიდიხართ თბილისიდაააან ოზურგეთისკენნნნ 2 გოოგოო რომ გაგვიყოლოთ???", "Tbilisi", "Ozurgeti", "2026-10-10"],
  ["თბილისიდან ბათუმში ხოარ მიდიხართ ვინმე ხვალე ?", "Tbilisi", "Batumi", "2026-10-11"],
  ["გამარჯობა ეხლა ჩოხატაურიდან ბორჯომში ვერ დამიმგზავრებთ ერთ ადამიანს? მადლობა 🎀🩷", "Chokhatauri", "Borjomi", "2026-10-10"],
];
for (const [text, from, to, date] of requestExamples) {
  check(`ride request "${text}"`, () => {
    const p = enrich({ text, postedAt: "2026-10-10T12:00:00+04:00" });
    assert.deepStrictEqual([p.userType, p.routeFrom, p.routeTo, p.departureDate], ["passenger", from, to, date]);
  });
}

console.log(failed ? `\n${failed} failed` : "all parse cases pass");
process.exit(failed ? 1 : 0);
