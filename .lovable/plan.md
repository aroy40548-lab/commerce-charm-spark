# Replace Shopify with ZANKYO's own store system + admin panel

## What you get
- **Storefront (zankyo.in)** looks the same, but products, stock, carts, orders, customers and addresses are stored in your own database (Lovable Cloud) instead of Shopify.
- **Admin panel (admin.zankyo.in)**, a separate Shopify-style backend. Only people with admin access can sign in.
- **Payments:** Razorpay checkout runs on your own site (UPI, cards, netbanking). Orders are marked paid automatically when Razorpay confirms the payment.
- **Shipping:** once an order is paid, it can be sent to Shiprocket in one click (which can use Delhivery as the courier). The tracking number (AWB) and delivery status appear in the admin panel and on the customer's "My orders" page.
- **Customer accounts:** email + password and Google sign-in, "My account" page with orders and saved addresses.
- **Shopify removed:** the Shopify connection and all Shopify code are taken out.

## Admin panel sections
1. **Dashboard:** today's sales, number of orders, low-stock alerts, recent orders.
2. **Products:** add, edit or delete products; upload photos; set price, MRP, category and description; set sizes with stock for each size; show or hide a product.
3. **Categories:** add, rename, reorder or delete categories, each with its own image.
4. **Orders:** a list you can filter by status (pending, paid, shipped, delivered, cancelled, refunded); order detail view; "Create Shiprocket shipment", "Mark delivered", "Cancel" and "Refund (Razorpay)" buttons.
5. **Customers:** a list of customers with their orders and addresses.
6. **Discounts:** create promo codes (percent off or flat ₹ off, minimum order value, expiry date, usage limit). ZANKYO10 and GENZ500 are moved over.
7. **Settings:** store name and support email, shipping charge and free-shipping threshold, Razorpay on/off, Shiprocket pickup address, and team admins (invite other admins by email).

## Admin login and security
- aroy40548@gmail.com becomes the first admin. For safety, you'll set the password yourself on first sign-in with a "set password" email. I won't save the password you typed in chat, so please treat it as exposed and don't reuse it.
- Admin rights are checked on the server for every action. Customers can't get into the admin panel.

## Domain
- The same project serves both addresses. Visiting admin.zankyo.in opens only the admin panel, and zankyo.in never shows it.
- You connect admin.zankyo.in in Project Settings > Domains (a guided step, just like zankyo.in). I'll walk you through it after the build.

## Things only you can provide (I'll ask for these securely when it's time)
- Razorpay **Key ID** and **Key Secret**, plus a **webhook secret** (from the Razorpay Dashboard > Settings > API Keys / Webhooks).
- Shiprocket **login email and password** for an API user (Shiprocket > Settings > API), and your pickup location name.

## Build order
1. Database: products, sizes/stock, categories, customers, addresses, carts, orders, order items, discounts, settings and admin roles, with strict access rules. The 16 current products and 8 categories are moved over, each size starting with 10 in stock.
2. Swap the storefront over to the new data (home, shop, collections, product page, wishlist, cart drawer). Live stock stays in place.
3. Customer sign-up/sign-in (email + Google), "My account", addresses.
4. Checkout page: address, shipping, promo code, Razorpay payment, confirmation page. Stock is reduced only after payment succeeds.
5. Admin panel on admin.zankyo.in with all the sections above.
6. Shiprocket integration (create shipment, get AWB, track status).
7. Remove the Shopify connection and code, test everything end to end, then publish.

## Technical details
- Tables: categories, products, product_images, product_variants (size, stock, sku), profiles, addresses, orders, order_items, discounts, store_settings, user_roles (app_role enum + has_role security-definer function). RLS on every table, GRANTs in each migration. Public read access only for active products and categories.
- Product images go in a public storage bucket, and the current src/assets images are uploaded during migration.
- Server functions (createServerFn + requireSupabaseAuth) handle cart pricing, order creation, Razorpay order creation and signature verification, admin CRUD (after an admin check through has_role), and Shiprocket calls. Razorpay and Shiprocket secrets stay on the server only.
- Webhooks: /api/public/razorpay-webhook (HMAC-verified, marks orders paid, decrements stock atomically in a SQL function) and /api/public/shiprocket-webhook (tracking updates, shared-token check).
- Admin routes live under /admin/*. Host-based redirects: admin.zankyo.in "/" goes to /admin, and /admin on zankyo.in goes to the home page.
- Removed: src/lib/shopify.ts, src/lib/shopifyCustomer.ts, Shopify cart sync, customerStore. The cart becomes a local zustand store that is priced on the server at checkout.
