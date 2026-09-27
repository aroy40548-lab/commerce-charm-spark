# Remove Try-On badges from SHADOWS / GEN Z banners, hide Virtual try-on button on mobile

## What we found

- The "✦ Try-On" pills on the SHADOWS and GEN Z banners are **not in our code** — they are injected on top of every large image by the Decart Anywear widget (class `vton-btn`).
- The "Virtual try-on (AI)" button on the product page is our own button in `src/routes/product.$handle.tsx` (~line 176–181).

## Changes

1. **Hide the widget badges on the two banners** — `src/routes/index.tsx`
   - Add a marker class (`zk-hide-vton`) to the editorial-banners `<section>` that holds the SHADOWS and GEN Z cards.

2. **CSS rule for it** — `src/styles.css` (next to the existing launcher-hiding rules at ~line 203)
   ```css
   /* Decart injects Try-On pills over photos; hide them on the homepage banners. */
   .zk-hide-vton .vton-btn {
     display: none !important;
   }
   ```

3. **Hide our Virtual try-on (AI) button on mobile** — `src/routes/product.$handle.tsx`
   - On the try-on button, change `flex` to `hidden sm:flex` so it disappears below 640px (phones) and stays visible on tablets/laptops.

## Verification

- `bunx tsgo --noEmit` clean; check `/tmp/observability/build-errors.log` shows build OK.
- Playwright at 393×852: no "Virtual try-on (AI)" button on a product page, no Try-On pill on the SHADOWS / GEN Z banners.
- Playwright at 1280×1800: button visible on the product page, banners still badge-free.
- No console errors.
