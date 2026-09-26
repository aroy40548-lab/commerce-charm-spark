# Admin panel on admin.zankyo.in + admin access for help@zankyo.in

## What you get
- The admin panel (Dashboard, Orders, Products, Categories, Customers, Discounts, Settings) will be reachable at **admin.zankyo.in**. The main store zankyo.in will never show the admin panel.
- **help@zankyo.in** gets admin access alongside aroy40548@gmail.com.

## Steps

1. **Add help@zankyo.in as an admin (database change)**
   - Update the `handle_new_user` trigger so that when help@zankyo.in signs up, the admin role is granted automatically (same as aroy40548@gmail.com).
   - Also insert the admin role now for help@zankyo.in if that account already exists in the database.

2. **First sign-in for help@zankyo.in**
   - Open /admin (or admin.zankyo.in once connected), choose "First time? Create login", enter help@zankyo.in and a password, confirm the email received, then sign in. Admin access applies automatically.

3. **Connect the admin.zankyo.in subdomain (your action, guided)**
   - Go to Project Settings → Domains → Connect Domain and enter `admin.zankyo.in`.
   - Add the DNS records Lovable shows you at your domain provider (an A record for `admin` pointing to 185.158.133.1, plus the TXT verification record).
   - DNS can take up to 72 hours to propagate; SSL is provisioned automatically after that.
   - The code already handles the split: visiting admin.zankyo.in opens only the admin panel, and /admin on zankyo.in redirects to the store home page.

4. **Verify**
   - Build check, then confirm /admin loads and the host-based redirects work.

## Technical details
- One SQL migration: extend `handle_new_user()` to grant the admin role for `help@zankyo.in` (lowercased match), plus a one-time insert into `user_roles` if the auth user already exists.
- No storefront changes; no changes to products, orders, or payments.
