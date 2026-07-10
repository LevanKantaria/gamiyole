# MakersHub.ge — Bug & UX Audit (July 2026)

## 🔴 Critical — do these first

1. **Secrets are in the repo.** `server/.env` contains live keys: SendGrid API key, Firebase Admin private key, Meta page token, MongoDB password (also hardcoded as fallback in `server/index.js:34`). If this repo is on GitHub, treat all of them as leaked: rotate the Mongo password (Atlas), revoke+regenerate the SendGrid key, generate a new Firebase service-account key, regenerate the Meta token, change AGENT_API_KEY. Then `git rm --cached server/.env`, add to `.gitignore`. Check: `git ls-files server/.env` — if it prints the path, it's committed.
2. **CORS is wide open** (`app.use(cors())`). Restrict to makershub.ge / app.makershub.ge / localhost-dev.
3. **Contact form can silently fail** — it returns success to the visitor even when the email to you failed (`server/index.js` contact handler). You may be losing customer messages. Add failure handling / log review.
4. **Email HTML injection** — contact form input is interpolated into email HTML unescaped (`server/utils/email.js`). Escape name/subject/message.

## 🟠 Bugs / logic

5. **Seller name comes from 3 different fields** — `creator`, `makerName`, `makerProfile.businessName`; ProductCard uses creator→makerName, detail page uses displayName→creator→makerName. This is why "levani" (not Cozy Crafts 3D) shows on the Meccha item on the homepage right now. Standardize (recommend: always `makerName`, snapshot at creation).
6. **Price is a String** in the schema, rendered raw — `"999abc ₾"` would display. Validate numeric at API level.
7. **Admin order-status updates skip transition validation** — admin can mark unpaid orders fulfilled (`controllers/orders.js`).
8. **Admin item upload accepts arbitrary `makerId`** from request body (`controllers/items.js:302`).
9. **Tags unbounded** — no count/length limit; can bloat DB.
10. **Stale `makerPhotoURL`** — snapshotted at creation, never refreshed when profile photo changes.
11. **Missing maker notifications** — TODOs in code: no email on product rejection, no payment-confirmation email.

## 🟡 UI/UX polish

12. **Homepage had ~19 images not loading/completed** when I checked (partly lazy-load, but verify on slow connection — product cards with gray boxes kill conversion).
13. **Product page has no error state** — failed fetch renders an empty page instead of "something went wrong / retry".
14. **Currency hardcoded** as ₾ in components — fine for now, worth centralizing in one formatter (also fixes inconsistent "9 ₾" vs "ფასი: X GEL" in social captions).
15. **Console.logs throughout server** — wrap in NODE_ENV check.
16. **Dead files** — empty `Link.jsx` at repo root and in factory-l public/build.
17. **Email templates English-only** even for KA users — order emails accept a language param; complete the KA translations.
18. **Agent items hardcode the cozy_craft.3d contact URL** — fine while single-tenant, revisit for multi-store.
19. **Two frontends in repo** (`client/factory-l` CRA + `client/next-seo` Next.js) — if factory-l is legacy, archive it; it doubles confusion and contains its own Firebase config.

## Suggested order of attack
Week 1: #1–4 (secrets, CORS, contact form, escaping). 
Week 2: #5 seller naming + #6 price validation + #13 error states. 
Week 3: notifications (#11), image loading (#12), cleanup (#15,16,19).
