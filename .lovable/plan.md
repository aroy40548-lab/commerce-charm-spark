# Fix confirmation emails

## Goal
Make account confirmation and password-reset emails reliably reach `help@zankyo.in`.

## Plan
1. Enable email-and-password authentication for the store.
2. Configure `zankyo.in` as the store’s email-sending domain through Lovable Emails.
3. Add ZANKYO-branded templates for account confirmation, password reset, invitations, magic links, email changes, and security verification.
4. Confirm the authentication email connection is active and check delivery records for `help@zankyo.in`.
5. Retry account creation from the admin sign-in page and verify the confirmation link opens the admin panel correctly.

## What you will need to do
Complete the sender-domain setup when prompted. If DNS verification is pending, confirmation emails will start after verification completes; this can take up to 72 hours.

## Current findings
- No sender domain is configured for this project.
- No confirmation-email delivery attempt for `help@zankyo.in` appears in the available email history.
- `help@zankyo.in` is not blocked from receiving email.
