# Fix checkout shipping + customer sign-up

Both problems come from settings inside your Shopify admin. None of my Shopify tools can change shipping rates or account settings, so you'll need to follow the steps below. After that, I'll test everything again.

## 1. Fix "Shipping not available" and add the two shipping options (Shopify admin)
Checkout says India isn't in any delivery zone for your products, so no shipping options appear.

1. Go to **Settings → Shipping and delivery → General shipping rates → Manage**.
2. Under **Shipping zones**, click **Create zone**, name it **India**, choose **India** (every state) and save.
3. In the India zone, click **Add rate** twice:
   - **Standard**: price ₹100, description "7–14 days". Use a custom rate and write "Standard (7–14 days)" as the name.
   - **Diamond**: price ₹500, name "Diamond (2–4 days)".
4. Delete the old ₹379 "मानक" rate and turn off **Local delivery**, if they're still there.
5. Check that your shipping location (under **Settings → Locations**) is in India and that it stocks the products.
6. Click **Save**.

After you enter an address at checkout, customers will see both options with the prices and delivery times.

## 2. Fix "Customer accounts aren't switched on" (Shopify admin)
1. Go to **Settings → Customer accounts** and choose **Legacy / Classic customer accounts**. The site's own sign-up form needs these. Save.
2. Go to **Settings → Apps and sales channels → Headless → Storefront API → Edit permissions**. Turn on `unauthenticated_read_customers` and `unauthenticated_write_customers`, then save.

## 3. What I'll do next
- Test in the browser: add a product to the bag, go to checkout, enter an Indian address, and confirm both Standard ₹100 and Diamond ₹500 show up.
- Test creating an account, signing in, and opening "My account".
- Delete the test customer accounts that are left over.
- Update the note in the bag to say "Standard ₹100 (7–14 days) or Diamond ₹500 (2–4 days), chosen at checkout".

## Technical details
- Shipping rates and zones can't be reached through the Storefront API or the Shopify tools I have. The checkout's shipping options come only from the zones set up in the admin.
- The sign-up error comes from `customerCreate` being denied. The token needs Classic accounts plus the unauthenticated customer permissions.
- The only code change is the text in CartDrawer.tsx.
