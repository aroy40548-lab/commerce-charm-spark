# Fix "Reviews aren't available" for customers who bought the product

## Likely cause (not confirmed yet)
zankyo.in is probably still running the older Judge.me version of reviews. I removed the Judge.me key when we switched to ZANKYO's own review system, so the old version can't do its purchase check. The error gets hidden behind the message "Reviews aren't available for this product right now." The new system hasn't been published yet. I checked that the store finds Chaos Skull Tee correctly, so the product itself is fine.

## Steps
1. **Show the real reason instead of a generic message.** If the check fails, the review box will say what went wrong, for example "Please sign in again" or "Couldn't check your orders, try again", and offer a Retry button. "Reviews aren't available" will only show when the product truly can't be found.
2. **Test the purchase check on this site first.** Sign in with your account, open Chaos Skull Tee, and confirm the review form appears. If it still doesn't, look into how your order's items are matched to the product, and fix that.
3. **Publish**, so zankyo.in gets the new review system. Then try reviewing Chaos Skull Tee again.

## Technical details
- `ProductReviews.tsx` ReviewForm: handle `elig.isError` separately. Show `elig.error.message` with a retry that calls `elig.refetch()`. Keep "unavailable" only for `status === "unavailable"`.
- `getReviewEligibility`: log the customer's order productIds and the target product ID on a mismatch, so a silent `not_purchased` can be diagnosed. Also treat a variant-only line item as a match by querying `lineItems { productId variantId }` and comparing against the product's variant IDs from the Storefront API.
