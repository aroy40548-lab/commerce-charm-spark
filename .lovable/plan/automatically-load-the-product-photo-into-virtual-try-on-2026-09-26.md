# Automatically load the product photo into Virtual Try-on

## Goal
When a shopper taps **Virtual try-on (AI)** on a product page, open the existing fitting room and automatically load that product’s main photo, so the shopper does not need to drag it manually.

## Plan
1. Update the existing try-on helper to accept the current product image URL.
2. Open the current Decart fitting-room widget, wait until its embedded window is ready, then send the same product-image message that the widget’s own image controls use.
3. Pass the displayed product’s main image from the product page into that helper.
4. Keep the current loading error message, and add a safe fallback: if automatic image loading is unavailable, the fitting room still opens normally rather than breaking the product page.
5. Verify on phone and desktop that:
   - the correct product photo is loaded after one tap;
   - navigating between products sends the new product’s photo;
   - repeated opens work;
   - the page remains usable when the widget is slow or unavailable;
   - there are no page errors or blank screens.

## Technical details
- Continue using the current `anywear.js` widget selected by the user.
- Use its existing embedded-window image handoff (`DECART_AUTO_START`) rather than introducing a new service or changing the storefront design.
- This handoff is not a documented public Decart API, so the implementation will be isolated in the try-on helper and fail safely if Decart changes its widget later.
