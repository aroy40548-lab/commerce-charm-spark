# Fix checkout shipping + customer sign-in

## 1. Fix sign-in: "Customer accounts aren't switched on" (code change)
Your store uses Shopify's new customer accounts (one-time email code). The /auth page uses the old email-and-password method, which your store doesn't support — that's the real cause of the error.

- Rewrite `src/routes/auth.tsx`: remove the create-account / password form. "Sign in" and "Create account" both open your store's own Shopify account page (the one-time email code sign-in) in a new tab.
- `src/routes/account.tsx`: if the visitor isn't signed in, show the same "Sign in with Shopify" button. After they sign in on Shopify's page and come back, orders and addresses come from their Shopify account.
- `src/stores/customerStore.ts`: replace email+password login/register with Shopify's customer account session (opens Shopify's sign-in, reads the session when they're back). Saved items keep working as they do now, matched by customer email.
- Navbar account icon links to the same flow.

## 2. Fix "Shipping not available" + add the two shipping options (Shopify admin — only you can do this)
Checkout shows no shipping options because India isn't in any delivery zone. My Shopify tools can't create shipping zones or rates.

1. **Settings → Shipping and delivery → General shipping rates → Manage**.
2. **Create zone** named **India**, select India (all states), save.
3. In the India zone, **Add rate** twice:
   - **Standard (7–14 days)** — ₹100
   - **Diamond (2–4 days)** — ₹500
4. Delete the old ₹379 "मानक" rate and turn off **Local delivery** if still present.
5. Check **Settings → Locations**: your location must be in India and stock the products.
6. Save.

## 3. Verify after your changes
- Browser test: add to bag → checkout → Indian address → confirm Standard ₹100 and Diamond ₹500 both appear.
- Browser test: sign-in flow end to end, "My account" shows orders.
- Clean up leftover test customer accounts.
- Update the bag note to mention the two shipping options.

## Technical details
- Shipping zones/rates are not exposed by the Storefront API or my Shopify tools — admin-only.
- New customer accounts (passwordless) can't be logged into via the Storefront API's customerAccessTokenCreate; the supported path is Shopify's hosted account page.
- Code changes: auth.tsx, account.tsx, customerStore.ts, Navbar.tsx, CartDrawer note text.
