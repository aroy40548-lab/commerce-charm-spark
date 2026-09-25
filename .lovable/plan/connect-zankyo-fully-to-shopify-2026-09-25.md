# Connect ZANKYO fully to Shopify

## What customers will be able to do
1. Pick a size, and see live stock: sizes that are sold out are greyed out ("Sold out"), available sizes can be added to the bag. Stock is re-checked when the product page opens, every 30 seconds while it stays open, and again at checkout.
2. Add to bag, then checkout on Shopify's secure checkout page, where they enter their delivery address and pay.
3. Pay with Razorpay (UPI, cards, netbanking) on that checkout page.
4. Create an account, sign in, and sign out. Accounts are stored as Shopify customers, so they appear in your Shopify admin under Customers.
5. See "My account": their name and email, saved addresses (add, edit, delete), and past orders with status, all read from Shopify.
6. Signed-in customers get checkout with their email filled in, and the order is linked to their Shopify account.

## Removed
- The Lookbook page and its menu and footer links. The "View Lookbook" button on the home banner will point to Shop instead.

## What you need to do in Shopify (I can't do these from here)
- **Claim the store and pick a paid Shopify plan.** Test stores can't take real payments. I'll give you the claim link.
- **Install Razorpay as a payment provider:** in Shopify admin go to Settings > Payments > add provider > "Razorpay Secure", then enter your Razorpay keys there. Razorpay then shows up automatically on checkout, with no code needed in the site.
- **Turn on customer accounts:** in Shopify admin go to Settings > Customer accounts. Classic accounts are needed for sign-in on our own page.
- **Publish:** after the build, press Publish in Lovable and it goes live on commerce-charm-spark.lovable.app. Your zankyo.in domain is still being set up and will connect once that finishes.

## Trade-off: Google sign-in
Shopify's customer accounts only support email and password on a custom sign-in page. To keep all customer data in Shopify, I'll replace the current sign-in (Lovable Cloud email + Google) with Shopify email and password sign-in, and remove the Google button. Tell me if you would rather keep Google sign-in in Lovable Cloud instead.

## Technical details
- `src/lib/shopify.ts`: add `quantityAvailable` to variants, and add a GraphQL Storefront customer layer: `customerCreate`, `customerAccessTokenCreate/Delete`, `customer { orders, addresses, defaultAddress }`, `customerAddressCreate/Update/Delete`, `customerRecover`.
- New `src/stores/customerStore.ts` (zustand, persisted): holds the Shopify customer access token and its expiry, plus login, logout, register, and refresh functions.
- Cart: on sign-in, call `cartBuyerIdentityUpdate` with the customer access token so checkout is prefilled and the order is linked to the customer. Before checkout, re-validate the cart lines and remove any sold-out items with a toast.
- Product page: the size buttons come from variant `selectedOptions`, disabled when `!availableForSale`. Poll with react-query `refetchInterval: 30000`, and refetch when the tab regains focus.
- Routes: rewrite `/auth` to use Shopify (sign in, register, forgot password via `customerRecover`). Add `/account` (profile, orders, addresses). Delete `/reset-password` (Shopify emails its own reset link) and `lookbook.tsx`, and update the Navbar, Footer, and home links.
- Remove the Lovable Cloud auth usage (useAuth, Google button). Cloud stays connected but unused.
- Verify with Playwright: size availability, add to bag, checkout URL opens, register and login against the store, and the account page loads its orders.
