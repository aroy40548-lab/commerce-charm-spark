# ZANKYO's own review system (Judge.me removed)

## What changes for you
- Judge.me is no longer used. Reviews are saved in your own store database, tied to each customer's ZANKYO account (the same email-code sign-in they already use).
- Customers see the same experience as now: star average, reviews with photos and a "Verified buyer" badge, "Sign in to review", and a form for star rating, title, comment and up to 5 photos.
- Only customers who actually bought the product can review it, one review per product. They can edit or delete their own review.
- Reviews appear right away. You can uninstall the Judge.me app from Shopify.

## Technical details
- Delete the Judge.me calls in `src/lib/reviews.functions.ts`, and remove the `JUDGEME_API_TOKEN` secret.
- New table `product_reviews`: id, product_handle, shopify_product_id, customer_id (Shopify customer GID), customer_name, rating (1–5), title, body, photo_paths text[], created_at, updated_at; unique (customer_id, product_handle). RLS on with no client policies. All reads and writes go through server functions using the admin client (same pattern as wishlists). Grants go to service_role only.
- `getProductReviews(handle)`: public. Returns the average, count and reviews (first name + last initial only, never email), with signed photo URLs from the private `review-photos` bucket.
- `getReviewEligibility` and `submitReview`: verify the Customer Account API token with Shopify, then check the customer's orders for the product (numeric ID from the Storefront product lookup) and check for an existing review. Photos are validated (JPG/PNG/WebP, 5MB, max 5) and uploaded to the bucket. The review is upserted.
- `deleteMyReview`: verifies the token, then deletes the customer's own row and its photos.
- `ProductReviews.tsx`: keeps the same UI. If the customer already reviewed the product, it shows "Edit your review" and a delete option.
