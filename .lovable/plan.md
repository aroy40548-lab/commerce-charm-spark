# Set up Razorpay online payments

The checkout already includes Razorpay (card/UPI/netbanking), payment checking and the order confirmation. Online payments stay switched off until the store's Razorpay keys are added. This plan connects them and tests a real payment.

## Steps

1. **Add your Razorpay keys (secure form)**
   - In Razorpay Dashboard → Account & Settings → API Keys, generate a key pair (start with **Test mode**, switch to **Live** later).
   - Paste them into the secure form: `RAZORPAY_KEY_ID` (starts `rzp_test_` or `rzp_live_`) and `RAZORPAY_KEY_SECRET`.

2. **Set up the payment confirmation link (webhook)**
   - The form generates a `RAZORPAY_WEBHOOK_SECRET` for you to copy.
   - In Razorpay → Webhooks → Add: URL `https://zankyo.in/api/public/razorpay-webhook`, paste the same secret, tick events `payment.captured` and `order.paid`.
   - This records the order as paid even if the customer closes the tab right after paying.

3. **Razorpay website setting**
   - Since checkout now happens on zankyo.in (no longer on Shopify), the registered website in Razorpay → Website and app settings must be **zankyo.in**. This fixes the old "Business – Website mismatch" error.

4. **Check and test**
   - Make sure the checkout shows "Pay online" once the keys are in.
   - Place a test order in Test mode: bag → checkout → Razorpay → success page → order shows as Paid in /admin → Orders, stock is reduced and the confirmation email is sent.
   - Check that cancelling the payment leaves the order pending and lets the customer try again.
   - Fix anything that breaks along the way.

5. **Go live**
   - Once the test works, replace the test keys with live keys (same form) and publish.

## Technical details
- The code is already in `src/lib/store.server.ts` (order creation, HMAC signature check), `src/lib/checkout.functions.ts` (placeOrder/confirmPayment) and `src/routes/api/public/razorpay-webhook.ts`. `getCheckoutConfig.online` becomes true when both keys exist.
- Also confirm that `crypto`/`Buffer` work in the published worker runtime. If they don't, switch to Web Crypto HMAC.
- Update roadmap.md once the secrets are added.
