# Judge.me product reviews (verified buyers only)

## Part 1 — Your steps in Shopify (about 5 minutes)
1. Shopify admin → Apps → search "Judge.me Product Reviews" → Install → approve permissions.
2. In Judge.me: Settings → Integrations → Developers (API) → copy the **Private API token**. Also note your shop domain: shopflow-suite-r7tnw-wrwxaq1e.myshopify.com.
3. Judge.me → Settings → Review collection: turn on **photo reviews**, and set "Who can write reviews" to verified buyers.
4. Send me a message when done — I'll ask you to paste the private token into a secure box (never in chat).

Note: zankyo.in is a custom storefront, so Judge.me's automatic widgets don't show on it. The website talks to Judge.me directly instead (Part 2).

## Part 2 — What I build on zankyo.in
- **Product page reviews section**: star average, review count, list of reviews with customer photos, "Verified buyer" badges.
- **Stars on product cards** in the shop and homepage.
- **Write a review** button on product pages:
  - Signed out → "Sign in to review".
  - Signed in but never bought it → "Only customers who bought this can review it."
  - Signed in and bought it → form with star rating, title, comment and up to 5 photos.
- **Review from My account**: each delivered item in Past orders gets a "Write a review" button.
- Reviews are tied to the customer's Shopify account (their name and email come from the account, not typed in). All reviews still appear and can be moderated in the Judge.me dashboard.

## Technical details
- Secret `JUDGEME_API_TOKEN` stored server-side; all Judge.me calls go through server functions (`src/lib/reviews.functions.ts`).
- Read: `GET /api/v1/reviews?product_id=…` (map Shopify product GID to numeric ID); aggregate stars cached with React Query.
- Write: server fn receives the Customer Account API token, verifies it with Shopify, re-queries the customer's orders and confirms a line item for this product exists, then posts to `POST /api/v1/reviews` with the customer's name/email, rating, body and photo URLs.
- Photos: uploaded to a Lovable Cloud storage bucket (size/type validated, max 5 × 5MB), public URLs passed to Judge.me.
- Rate limit: one review per customer per product (checked against existing Judge.me reviews by email).
- Components: `ProductReviews.tsx`, `ReviewForm.tsx`, `StarRating.tsx`; wired into `product.$handle.tsx`, `ProductCard.tsx`, `account.tsx`. Adds Product `aggregateRating` to page SEO data.
