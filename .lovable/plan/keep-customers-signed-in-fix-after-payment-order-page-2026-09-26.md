# Keep customers signed in + fix after-payment order page

## What's wrong
1. **You get signed out when you go back to the store.** Right now, "Sign in" sends customers to Shopify's own account page on shopify.com. That page and zankyo.in are separate sites, so zankyo.in can't tell that the customer is signed in. It shows them as signed out again and can't list their orders.
2. **After paying with Razorpay, customers don't see their order.** Shopify's checkout sends the payment to Razorpay. After payment, Razorpay has to report back to Shopify, and Shopify then shows the "Thank you / order confirmed" page. If Razorpay isn't set up correctly inside Shopify, the money arrives but the customer never gets sent back. The order might also not appear in Shopify.

## What I'll build
1. **Real sign-in on zankyo.in** using Shopify's official customer login (one-time email code, then back to zankyo.in):
   - Customers stay signed in on zankyo.in until they sign out or close the browser.
   - The header shows the customer's name and a Sign out button.
   - "My account" on zankyo.in lists current and past orders from Shopify, with status, items, totals and tracking links.
   - Orders and profile stay in Shopify permanently. Saved items (wishlist) stay linked to the customer's email permanently and come back every time they sign in, on any device.
   - Each bag links to the signed-in customer, so their orders always show up in their account.
2. **An order confirmation page on zankyo.in** at /order-success. It shows "Payment successful", the order number and items, and a link to My account. Shopify's thank-you page will point customers here.
3. Test sign-in, staying signed in across pages, sign-out, the account order list and the confirmation page on phone and desktop.

## What you'll need to do in Shopify admin (I'll give you exact clicks)
- **Headless sales channel → Customer Account API:** turn it on and add these addresses:
  - Callback: `https://zankyo.in/account/callback`
  - JavaScript origin: `https://zankyo.in`
  - Logout: `https://zankyo.in`
  
  Then send me the **Client ID** it shows you.
- **Razorpay:** under Settings → Payments, open Razorpay and check that the app is fully activated with your live keys. Then check Orders to see whether your ₹2 test payment shows up as an order.
  - If it doesn't, the Razorpay setup inside Shopify is broken, and Razorpay support or re-installing the app will fix it. I can't change that setting.
- **Settings → Checkout → Order status page:** add a "Back to ZANKYO" link to zankyo.in/order-success. I'll send you the exact snippet.

## Technical details
- Customer Account API OAuth with PKCE. The code verifier and state live in sessionStorage. The access and refresh tokens are stored in a sessionStorage-backed store, so the session ends when the browser closes. Tokens refresh automatically, and signing out calls Shopify's logout endpoint.
- New routes: `/account/callback` and `/order-success`. `customerStore` is rewritten around the tokens. `account.tsx` queries `customer { orders { ... fulfillments trackingInfo } }`. The cart gets `buyerIdentity.customerAccessToken`.
- The existing wishlist sync stays as it is, keyed by the customer's email from the Customer Account API.
- Blocked until you send the Client ID. Everything else can be built first.
