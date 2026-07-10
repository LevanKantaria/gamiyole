// import-text.js — parse a pasted Facebook comment thread (plain text, no DOM)
// into comment records. Loses the per-person profile link, but keeps name +
// phone + which post it belongs to (from the post URL you paste alongside).
//
// The pasted format repeats, per comment:
//   <Author name>
//   [ · ]            (optional separator line)
//   <content>        (phone number and/or text, may be multiple lines)
//   <relative time>  e.g. 4w, 3w, 5h, 2d   ← delimiter between comments
//   Reply
//   [See translation]
//   Share

const { enrich } = require("./parse");

const NOISE = new Set(["Reply", "Share", "See translation", "See more", "Edited", "·", "Follow"]);
const TIME_RE = /^\+?\d+\s*(w|d|h|m|min|mo|y)$/i; // ends a comment block

function hashId(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return "pc" + (h >>> 0).toString(36); // "pc" = pasted comment
}

// Parse a Facebook group post URL into { groupId, postId }.
function parsePostUrl(url) {
  const m = (url || "").match(/\/groups\/([^/]+)\/(?:permalink|posts)\/(\d+)/);
  return m ? { groupId: m[1], postId: m[2] } : { groupId: null, postId: null };
}

// options: { parentId, groupId, assumeType, requirePhone, capturedAt }
function parseCommentText(text, opts = {}) {
  const { parentId = null, groupId = null, assumeType = null, requirePhone = true } = opts;
  const capturedAt = opts.capturedAt || new Date().toISOString();

  const rawLines = (text || "").split("\n");
  const blocks = [];
  let cur = [];
  const flush = () => { if (cur.length) blocks.push(cur); cur = []; };

  for (const raw of rawLines) {
    // strip bidi/RTL marks that wrap phone numbers, then trim
    const line = raw.replace(/[‎‏‪-‮]/g, "").trim();
    if (!line) continue;
    if (NOISE.has(line)) continue;
    if (TIME_RE.test(line)) { flush(); continue; } // time delimits a comment
    cur.push(line);
  }
  flush();

  const records = [];
  const seen = new Set();
  for (const b of blocks) {
    const author = b[0];
    const content = b.slice(1).join(" ").trim();
    if (!author) continue;

    const e = enrich({ text: content, capturedAt });
    if (requirePhone && e.phones.length === 0) continue; // keep only numbers

    // Prefer a type the text clearly implies; else the caller's assumption.
    const userType = e.userType !== "unknown" ? e.userType : (assumeType || "unknown");

    const id = hashId(`${parentId || ""}|${author}|${e.phones[0] || content.slice(0, 40)}`);
    if (seen.has(id)) continue;
    seen.add(id);

    records.push({
      postId: id,
      kind: "comment",
      parentId,
      groupId,
      author,
      authorUserId: null,
      authorUrl: null,
      text: content || null,
      phones: e.phones,
      userType,
      routeFrom: e.routeFrom,
      routeTo: e.routeTo,
      seats: e.seats,
      departureDate: e.departureDate,
      departureTime: e.departureTime,
      departureAt: e.departureAt,
      departureText: e.departureText,
      timeText: null,
      capturedAt,
      permalink:
        parentId && groupId
          ? `https://www.facebook.com/groups/${groupId}/permalink/${parentId}/`
          : null,
    });
  }
  return records;
}

module.exports = { parseCommentText, parsePostUrl };
