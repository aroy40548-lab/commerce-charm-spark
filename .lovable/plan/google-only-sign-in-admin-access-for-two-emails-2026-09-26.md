# Google-only sign-in + admin access for two emails

## What changes
1. **Customer sign-in page:** remove the email, password, sign-up and forgot-password parts. Only a "Continue with Google" button remains.
2. **Admin sign-in page:** replace the email/password form with a single "Continue with Google" button. The account and email-confirmation steps go away completely.
3. **Admin access:** only **aroy40548@gmail.com** and **help@zankyo.in** get into the admin panel. They sign in with Google and go straight to the dashboard.
   - Anyone else who signs in with Google on the admin page sees "This account doesn't have admin access" and a sign-out button.
   - help@zankyo.in must be a Google account (Gmail or Google Workspace) for Google sign-in to work.
4. **Email/password sign-in is switched off** so nobody can use it anymore.
5. **Admin panel stays connected to the store,** with every feature from before:
   - Products and stock
   - Categories
   - Orders, including Razorpay refunds and Shiprocket/Delhivery shipping and tracking
   - Customers
   - Discount codes
   - Store settings and team
6. **Check:** load the sign-in and admin pages to confirm only the Google button shows and there are no errors.

## Technical details
- In the customer and admin sign-in pages, remove the sign-up, password sign-in, reset-password and resend-confirmation code. Keep the existing Google sign-in (`lovable.auth.signInWithOAuth("google")`), which returns to the same page it started from.
- The existing trigger already gives the admin role on first sign-in for both emails, whatever sign-in method is used. The admin layout keeps checking the role with `has_role`, so no database change is needed.
- Use the auth configuration tool to switch off the email provider and keep Google on.
- Keep the email-sending setup for store notifications. Sign-in emails will simply no longer be sent.
