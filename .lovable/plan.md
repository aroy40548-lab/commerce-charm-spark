# Fix "Customer sign-in is being set up"

## Why it happens
On-site sign-in needs a **Client ID** from Shopify's **Headless** channel. Your Sales channels list shows only Online Store, Lovable and Point of Sale. Headless is not installed yet, so there is no Client ID, and the button shows this message.

## Step 1 — Your part in Shopify admin (about 5 minutes)
1. Open the **Shopify App Store** (the button at the top right of Sales channels). Search for **Headless** (made by Shopify) and install it.
2. Open **Sales channels → Headless → Create storefront**.
3. Open **Customer Account API → Manage** and set:
   - Client type: **Public**
   - Callback URI: `https://zankyo.in/account/callback` (also add `https://www.zankyo.in/account/callback`)
   - JavaScript origin: `https://zankyo.in` and `https://www.zankyo.in`
   - Logout URI: `https://zankyo.in`
4. Save. Copy the **Client ID** (a long code) and send it to me here.

## Step 2 — My part, right now (so sign-in works today)
- Until the Client ID arrives, the "Continue with email code" button opens Shopify's own account page (`https://shopify.com/84384776449/account`) instead of the message. Customers can sign in there and see their orders and profile.
- Once you send the Client ID, I add it. Sign-in then happens on zankyo.in and you stay signed in until you sign out or close the browser. The header shows your name, and My account lists your orders and tracking.
- I test sign-in, staying signed in across pages, sign-out and the order list on phone and desktop.

## Technical details
- `src/stores/customerStore.ts` `signIn()`: when `customerLoginConfigured()` is false, `window.location.assign("https://shopify.com/84384776449/account")` instead of `alert`.
- After the Client ID is received: set `SHOPIFY_CUSTOMER_CLIENT_ID` in `src/lib/customerAccount.ts` (a public client ID, so it is safe to keep in the code).
