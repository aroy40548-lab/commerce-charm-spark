# Move ZANKYO back to Shopify and remove the custom admin panel

## About the new Shopify store
- We create a new Shopify development store. It's free to build on while you work.
- Claim it within 30 days to keep it. Claiming starts a 120-day free trial, and you need a paid plan after the trial to sell.

## What customers get
1. Shop, pick a size, and see live stock. Sold-out sizes are greyed out.
2. Add items to the bag, then pay on Shopify's secure checkout. Razorpay works there once you install it in Shopify.
3. Sign up and log in with email and password. Accounts are saved as Shopify customers.
4. "My account" shows current orders, past orders, order status, a tracking link (updated when Shopify or Shiprocket adds tracking), and saved addresses.
5. Saved items (wishlist) are stored with the customer's account so they show up on any device.

## What you manage in Shopify admin
Products, stock, categories (collections), orders, refunds, customers, discount codes, shipping (the Shiprocket/Delhivery Shopify app) and payments (Razorpay Secure).

## Removed
- The whole /admin panel and the admin.zankyo.in redirect.
- The username sign-in and Google sign-in. Shopify customer accounts only support email and password on our own sign-in page.
- Store data in Lovable Cloud (products, orders, discounts, customers). The site stops using it.

## What you need to do in Shopify
- Claim the store when you're ready (just ask "claim store").
- Settings > Customer accounts: turn on classic accounts.
- Settings > Payments: add Razorpay Secure.
- Install the Shiprocket app for Delhivery shipping.
- Publish in Lovable.

## Trade-off: saved items
Shopify has no built-in wishlist that the site can save to directly. Saved items stay linked to the customer's account in Lovable Cloud, matched by their Shopify customer email. Everything else lives in Shopify.

## Technical details
- Enable Shopify (new store). Recreate all 10 collections and 16 products with S/M/L/XL variants, INR prices, images and 10 stock each. Recreate the ZANKYO10 and GENZ500 discounts.
- `src/lib/shopify.ts`: Storefront API client with products, collections, cart (`cartCreate`/`cartLinesAdd`/`cartBuyerIdentityUpdate`) and customer queries (`customerCreate`, `customerAccessTokenCreate/Delete`, `customer { orders { fulfillmentStatus, successfulFulfillments { trackingInfo } }, addresses }`, address CRUD, `customerRecover`).
- `src/stores/customerStore.ts` holds the persisted token. The cart store is rewritten to use a Shopify cart, and checkout goes to `checkoutUrl`.
- Product page and shop use Shopify data. Keep 30s stock polling plus a refetch when the tab regains focus.
- Rewrite `/auth` and `/account` for Shopify. Delete `/checkout`, all `admin*.tsx` routes, `UsernameAuth`, `account/orders/admin/commerce` server functions, the Razorpay webhook, the image proxy, and the admin host redirects in `__root.tsx`.
- Wishlist: a server function takes the Shopify customer token, checks it with the Storefront API, and reads or writes a `wishlists` table keyed by Shopify customer ID (migration).
- Update AGENTS.md and project knowledge. Verify with Playwright: shop, add to bag, checkout URL, register/login, account orders, wishlist sync.
