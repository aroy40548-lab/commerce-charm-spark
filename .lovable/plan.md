# Finish the Shopify store launch

The domain fix worked: checkout links now open the real Shopify payment page (verified, page loads with HTTP 200). Remaining steps to fully launch:

## 1. Re-test the full buying flow in the browser
- Open the shop, add a product with a size to the bag
- Open the cart, click checkout, confirm the Shopify payment page opens in a new tab
- Test customer sign-up and sign-in (email + password via Shopify customer accounts)
- Confirm "My account" shows orders, addresses and saved items

## 2. Clean up test data
- Delete the test customer account created during earlier testing

## 3. Final checks and publish
- Typecheck + build
- Publish the site so zankyo.in serves the finished store

## Technical details
- Checkout verified: cartCreate returns a myshopify.com checkout URL that redirects to the live checkout page (HTTP 200)
- zankyo.in stays connected in Lovable as the storefront (status: active, primary)
- No code changes expected unless a test fails
