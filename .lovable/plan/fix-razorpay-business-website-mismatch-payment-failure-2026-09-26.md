# Fix Razorpay "Business – Website mismatch" payment failure

## What is happening

The ₹2 test payment failed with **"Business – Website mismatch"** (error reason: `payment_risk_check_failed`, initiated via the Razorpay Shopify Plugin).

Razorpay only allows payments to start from the website address registered in the Razorpay account. The user registered **zankyo.in** in Razorpay, but the actual checkout and payment happen on Shopify's own address:

```text
Registered in Razorpay:   zankyo.in            ← storefront (browsing only)
Payment actually runs on: shopflow-suite-r7tnw-wrwxaq1e.myshopify.com   ← checkout
```

Because the two don't match, Razorpay's risk check blocks every payment before money moves. Any amount deducted is auto-refunded within 5–7 working days.

## The fix (user action in Razorpay dashboard — no code change needed)

1. Log in to **dashboard.razorpay.com**.
2. Go to **Account & Settings → Website and app settings** (the "registered website(s)" link in the error).
3. Replace **zankyo.in** with the Shopify store address:
   `shopflow-suite-r7tnw-wrwxaq1e.myshopify.com`
   (If the form allows multiple websites, keep zankyo.in and add the myshopify.com address.)
4. Save, then place a small test order again from zankyo.in → bag → checkout → pay.

## Why zankyo.in can't be the payment domain

Shopify hosts the checkout on its own domain for security and PCI compliance; the payment page cannot be served from zankyo.in. So the Razorpay registration must follow the Shopify checkout domain, not the storefront domain.

## After the user confirms the change

- Re-test the full flow end to end in the browser: product → size → bag → checkout → Razorpay payment → confirm the customer lands on a success/thank-you page and the order appears in Shopify admin → Orders.
- Confirm the customer is redirected back properly after payment (order-success page on zankyo.in already exists).

## Technical details

- No project code changes are required for this fix; it is purely a Razorpay account setting.
- Payment ID of the failed attempt: `pay_Tgg5h3rBHLRGUk`, order `order_Tgg568dXVhDVnX` — failed at `payment_initiation`, so no money was captured.
- The checkout URL already opens on the myshopify.com domain with `channel=online_store` (src/lib/shopify.ts), which is correct and stays unchanged.
