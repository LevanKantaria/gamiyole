# Autonomous Product Flow — Spec (v1)

## Flow
1. Scheduled task (weekly or on demand): Claude browses MakerWorld with License=BY filter, picks candidate toys.
2. Claude writes for each: name (KA+EN), description (KA+EN), price suggestion (GEL), designer attribution line, tags, image URLs from MakerWorld listing (for reference only — final photos should be your own prints).
3. Claude calls your server: items created as **drafts**.
4. You approve in your admin → server publishes to website + FB + IG.

## Your server: endpoints Claude needs
```
POST /api/products          # create draft {title_ka, title_en, desc_ka, desc_en, price_gel, attribution, tags[], image_urls[], source_url, license}
GET  /api/products?status=draft|published
POST /api/products/{id}/publish   # triggered by YOUR approval, not Claude
```
Auth: API key in header (you generate, share with me when ready).

## Your server: Meta integration (one-time setup by you)
1. developers.facebook.com → create Business app.
2. Link FB Page; convert IG to Business account linked to that Page.
3. Permissions: pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish.
4. Exchange for a long-lived Page access token (~60 days; refresh via cron).
5. On publish:
   - FB: `POST /{page_id}/photos` (attach image + caption) or `/feed`
   - IG: `POST /{ig_user_id}/media` (image_url must be public — host on your site) → `POST /{ig_user_id}/media_publish`

## Rules baked into the flow
- Only Public Domain / CC-BY / CC-BY-SA models, or designers whose membership you've bought.
- Attribution line required in every post for CC-BY: "Design by {designer}, CC-BY, makerworld.com/..."
- Skip branded IP (Disney, Pokémon, Mario, etc.) even if the model license allows it.

## What I need from you to proceed
1. Website API base URL + docs (or tell me the stack and I'll build the endpoints).
2. An API key for the products endpoints.
3. Posting cadence (e.g., 3 drafts/week?).
