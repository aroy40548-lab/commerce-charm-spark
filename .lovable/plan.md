# Re-test checkout after the Razorpay website fix

## Goal
Confirm a customer can complete a real purchase end to end now that Razorpay accepts payments from the Shopify checkout address, and confirm the order appears in Shopify.

## Steps
1. Open the storefront at mobile width (393px) and desktop (1280px).
2. Pick a product with stock (avoid known sold-out sizes, e.g. Chaos Skull Tee M/L/XL), select a size, add to bag.
3. Open the bag and go to checkout; confirm the checkout opens on the Shopify (myshopify.com) address.
4. Fill a test delivery address (Siliguri, West Bengal 734007) and check the shipping options — expect Standard ₹100 (7–14 days) and Diamond ₹500 (2–4 days).
   - If shipping rates are missing or "not available" appears again, stop and report: the India shipping zone was never confirmed as fixed, and it must be completed in Shopify admin first.
5. Complete the Razorpay payment with a small amount.
6. Verify the customer lands on a success/thank-you page (ideally the /order-success page on zankyo.in) and the order appears in the store's Orders.
7. Report results, including any step that still needs a change in Shopify or Razorpay admin.

## Notes
- Sign-in testing is still blocked until the Customer Account API Client ID is pasted from Shopify admin (Settings → Customer accounts → Customer Account API → View configuration) — separate from this test.
- If the payment is again blocked by Razorpay with a website-mismatch error, report the exact error so the registered-website change can be re-checked.
