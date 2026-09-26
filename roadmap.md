# Roadmap
- [x] Move storefront to Shopify (catalog, cart, checkout, customer accounts, account page, wishlist)
- [x] Remove custom admin panel
- [x] Connected existing Shopify store; code points at shopflow-suite store; shop/product/cart verified
- [x] Verify add to bag and checkout against the existing store (checkout page loads, HTTP 200)
- [x] Publish requested for zankyo.in
- [ ] Customer sign-up blocked: Shopify store's Storefront API token lacks `unauthenticated_write_customers` scope — user must enable it in Shopify admin → Settings → Apps and sales channels → Headless → Storefront API scopes (also enable unauthenticated_read_customers)
- [ ] Stock: several sizes show "Sold out" (e.g. Chaos Skull Tee M/L/XL) — user sets inventory per size in Shopify admin
- [ ] Delete test customer accounts (zankyo.test+launch1/launch2@gmail.com) in Shopify admin → Customers once sign-up works
