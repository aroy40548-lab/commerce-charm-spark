# Enable on-site customer sign-in with the Headless Client ID

The Headless channel is now set up and you sent the Client ID: `32b0fc4e-0ce1-4a9e-b680-3af2cc77ad17` (a public client ID, safe to keep in the code).

## Changes
1. **Add the Client ID** — set `SHOPIFY_CUSTOMER_CLIENT_ID` in `src/lib/customerAccount.ts` so `customerLoginConfigured()` is true and the "Customer sign-in is being set up" message disappears.
2. **Update the Storefront token** — replace the token in `src/lib/shopify.ts` with the new public access token `59b969eacdcd2ba980e671a74f59a0a1` (the Headless storefront token you generated). Keep the private access token private — it is not needed in the website code; do not paste it anywhere public.
3. **Verify callback URLs match** — the login redirect goes to `https://zankyo.in/account/callback`. In Shopify admin → Headless → Customer Account API, confirm these are set (from your earlier setup):
   - Callback URI: `https://zankyo.in/account/callback` and `https://www.zankyo.in/account/callback`
   - JavaScript origin: `https://zankyo.in` and `https://www.zankyo.in`
   - Logout URI: `https://zankyo.in`
4. **Test** — on the preview: click "Continue with email code" → Shopify email-code sign-in → returns to zankyo.in signed in; header shows the customer name; My account lists orders; sign out works. Also confirm products still load with the new Storefront token.

## Technical details
- `src/lib/customerAccount.ts`: `SHOPIFY_CUSTOMER_CLIENT_ID = "32b0fc4e-0ce1-4a9e-b680-3af2cc77ad17"`.
- `src/lib/shopify.ts`: `SHOPIFY_STOREFRONT_TOKEN = "59b969eacdcd2ba980e671a74f59a0a1"`.
- No changes to the PKCE flow, session storage, or account pages — they activate automatically once the Client ID is set.
- Note: full end-to-end sign-in can only be verified on zankyo.in (the callback URL), so I'll verify the redirect starts correctly on the preview and ask you to confirm one sign-in on the live site after publishing.
