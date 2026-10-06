# FIRST20 launch offer

## What will be added

- Add a slim, site-wide announcement strip above the main menu with an on-brand moving message: **“FIRST DROP // 20% OFF FOR FIRST-TIME BUYERS // USE FIRST20 // ENDS 27 DEC 2026”**.
- Add a one-time entry popup with bold ZANKYO typography, kanji details, the **20% OFF** offer, and a live countdown to **27 December 2026, 11:59 PM India time**.
- Put **FIRST20** in a prominent tap-to-copy control with immediate “Copied” feedback, plus a clear **Shop now** action.
- Keep the strip compact and the popup comfortable on phones, with safe spacing, readable text, accessible close controls, keyboard support, and reduced-motion behavior.

## Visitor targeting

- Show the popup only once per browser by saving a local “offer seen” flag after it is dismissed or used.
- For a signed-in customer, check their Shopify order history first; suppress the popup when they already have an order.
- For a signed-out visitor, show it once because purchase history is not available until they sign in.
- Keep the announcement strip visible site-wide until the deadline, then hide both the strip and popup automatically.

## Technical details

- Build one focused promotion component and mount it in the shared site shell above the navigation.
- Reuse the existing dialog and design tokens; no new backend or customer data storage is needed.
- This change advertises and copies the code; it does not auto-apply it at checkout.
- The Shopify connection currently needs re-authentication, so this work will not change or verify the discount rule itself. **FIRST20 must already be configured in Shopify as 20% off, first order only, ending 27 December 2026.**

## Verification

- Verify first visit, repeat visit, dismissal, copy feedback, deadline hiding, and signed-in prior-buyer suppression.
- Check phone and laptop layouts for clipping, sideways movement, popup overflow, and console errors.
