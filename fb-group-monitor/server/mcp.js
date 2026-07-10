#!/usr/bin/env node
// mcp.js — MCP server exposing the local rideshare DB to Claude Desktop.
//
// Claude Desktop connects over stdio and uses these tools to clean up the posts
// the offline rules left as `unknown` — no API key, no per-post cost beyond your
// Claude Desktop usage. Nothing here calls out to the network; it only reads and
// writes the local rides.db.
//
// Tools:
//   get_stats               → totals + how many posts still need classifying
//   get_unclassified_posts  → a batch of {postId, text} the rules couldn't type
//   apply_classifications   → write Claude's {userType, route, seats, phones} back

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const { queries, applyClassification, DB_FILE } = require("./db");

const server = new McpServer({ name: "rideshare-db", version: "0.1.0" });

const text = (obj) => ({ content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] });

server.tool(
  "get_stats",
  "Totals for the rideshare DB, including how many posts are still `unknown` and need Claude to classify.",
  {},
  async () => text(queries.stats())
);

server.tool(
  "get_unclassified_posts",
  "Return a batch of posts (kind='post') or comments (kind='comment') the offline " +
    "rules could not type (user_type='unknown'). Each has postId, raw text (Georgian " +
    "script OR Latin transliteration), and captured_at (use it to resolve today/tomorrow). " +
    "Classify each and send results to apply_classifications. Call repeatedly until empty.",
  { limit: z.number().int().min(1).max(200).default(40).describe("How many to fetch") },
  async ({ limit }) => text(queries.listUnclassified(limit)),
);

server.tool(
  "get_posts_missing_departure",
  "Return driver/passenger posts where no departure time was computed but the text " +
    "may contain one. Each has captured_at as the reference for relative times " +
    "(დღეს=today, ხვალ=tomorrow, ზეგ=day-after). Send results to apply_classifications " +
    "with departureDate + departureTime filled in.",
  { limit: z.number().int().min(1).max(200).default(40).describe("How many to fetch") },
  async ({ limit }) => text(queries.listMissingDeparture(limit)),
);

server.tool(
  "apply_classifications",
  "Write classifications back to the DB. For each item set userType to 'driver' " +
    "(offering a ride / seats) or 'passenger' (seeking a ride / seat), or 'unknown' " +
    "if it's not a ride offer/request. Optionally include route from/to (English city " +
    "names), seat count, phone numbers, and departure: departureDate (YYYY-MM-DD) + " +
    "departureTime (HH:MM, 24h) computed from the text relative to the post's captured_at.",
  {
    items: z
      .array(
        z.object({
          postId: z.string(),
          userType: z.enum(["driver", "passenger", "unknown"]),
          routeFrom: z.string().nullish(),
          routeTo: z.string().nullish(),
          seats: z.number().int().nullish(),
          phones: z.array(z.string()).nullish(),
          departureDate: z.string().nullish().describe("YYYY-MM-DD"),
          departureTime: z.string().nullish().describe("HH:MM 24-hour"),
        })
      )
      .describe("One entry per classified post"),
  },
  async ({ items }) => {
    let updated = 0;
    for (const it of items) if (applyClassification(it)) updated++;
    return text({ ok: true, updated, received: items.length });
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr is safe to log to; stdout is the MCP channel.
  console.error(`rideshare-db MCP server ready (DB: ${DB_FILE})`);
}
main().catch((e) => {
  console.error("MCP server failed:", e);
  process.exit(1);
});
