# ZANKYO Reels + bottom tab bar + product-link affiliates

## 1. Bottom tab bar (phones only, Myntra-style)
- Fixed bar at the bottom on phones: **Home**, **Reels**, **Bag** (bag shows item count, opens the existing bag).
- ZANKYO theme: ink/paper colours, sharp edges, signal-red active state, works in dark and white mode.
- Safe-area padding for iPhones; page content gets bottom spacing so nothing hides behind the bar. Laptops keep the current top menu (Reels link added there too).

## 2. Reels page (`/reels`)
- Full-screen vertical feed, swipe/scroll one reel at a time, auto-play muted when on screen, tap to unmute/pause.
- Each reel shows: creator **name only** (never email), caption, like, dislike, comment count, share button.
- Small product popup at the bottom of the video: product photo, name, price. Tap opens the product page.
- Share copies a unique reel link (`/reels/<id>`), which opens that reel first. Opening a shared reel credits the creator (see section 4).
- Comments open in a bottom sheet; signed-in users can comment and delete their own. Name shown, email hidden.
- Like/dislike: one vote per user, tap again to remove. Signed-out users see "Sign in to like/comment".

## 3. Creator dashboard (`/reels/studio`, signed-in)
- Upload a video (MP4/MOV/WebM, max 59 seconds, max ~50MB) — length checked in the browser and on the server.
- Add caption and attach one or more ZANKYO products (search the catalog).
- List of my reels with views, likes, comments, sales earned; edit caption/products or delete.
- Uploading a reel automatically gives the user an affiliate account if they don't have one.
- Admin (`/admin`) gets a Reels section to hide/remove any reel or comment.

## 4. Affiliate system change: product links instead of site links
- Each affiliate gets a **unique link per product**: `zankyo.in/product/<handle>?ref=CODE` — a "Copy my link" button appears on every product page for affiliates, and in the affiliate dashboard.
- Reels links carry the creator's code automatically.
- Commission is paid only on the product(s) the link/reel was for, not the whole order (rate stays the store's affiliate rate, default 5%, owner approval stays the same).
- Old site-wide `?ref=` links keep working on product pages; the homepage-only link is no longer offered.
- Affiliate dashboard shows earnings per product and per reel.

## Technical details
- New tables (RLS on, no client policies; all access through server functions with the service-role client after auth, per project rule): `reels` (user_id, video_path, caption, duration, status, views), `reel_products`, `reel_votes` (unique user+reel, value ±1), `reel_comments`. Display name comes from `profiles` (first/last name or username), never email.
- New private storage bucket `reels` (50MB limit); videos served through the existing `/api/public/img/*` style proxy extended for video with range support, or via short-lived signed URLs.
- Referral store becomes `{ code, productHandle?, reelId?, until }`; checkout sends it; `affiliate_commissions` gains `product_id`/`reel_id`, and `commit_order` computes commission from the matching order items only.
- Bottom bar component mounted in `__root.tsx`, hidden on `/admin` and `/checkout`.
- Tests for: 59-second limit, one vote per user, commission only on linked product.
