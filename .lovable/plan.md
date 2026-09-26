# Connect storefront to the existing Shopify store

Your existing Shopify store is now connected. The storefront code was already rebuilt on Shopify (products, cart, checkout, customer accounts, wishlist sync). This plan finishes the switch so everything runs on your live store.

## Steps

1. **Check your live catalog** — count and list the products in your connected store. If products are missing (the 16 ZANKYO items were created on the old test store), recreate them on your live store with your approval, since changes affect live data.
2. **Verify storefront reads your store** — shop, product pages, prices, sizes, and live stock all load from the connected store.
3. **Test the full buying flow** — add to bag, cart drawer, Shopify checkout link (opens in a new tab, no manual URLs).
4. **Test customer accounts** — sign up / sign in via Shopify customer accounts; "My account" shows current orders, order history with tracking, addresses, and saved items.
5. **Clean up leftovers** — remove any remaining references to the old custom backend (Lovable Cloud tables, Razorpay/Shiprocket code, deleted admin routes) so nothing points at the old system.
6. **Typecheck + build + browser check** — zero errors, key pages load clean.

## Notes

- The admin panel is already removed; you manage everything from your Shopify admin (products, orders, customers, discounts).
- Product or inventory changes made from chat go straight to your live store and will always ask for your confirmation first.
- Razorpay and shipping (Shiprocket/Delhivery) are configured inside Shopify admin, not in the app code.
