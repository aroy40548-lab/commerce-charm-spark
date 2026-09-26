# Mobile-first storefront optimization

## Goal
Make the ZANKYO storefront fast, stable, and comfortable on mobile browsers first, while preserving a polished laptop and desktop experience.

## Plan
1. **Stabilize the shared page frame**
   - Rework the top navigation so the logo and account, wishlist, and bag controls never clip on narrow screens.
   - Keep navigation usable without awkward page-width overflow and account for mobile safe areas.
   - Make the footer stack cleanly with readable spacing and links.

2. **Improve touch usability**
   - Increase small icon, quantity, wishlist, size, and add-to-bag controls to reliable touch targets.
   - Add clear pressed, focus, disabled, loading, and sold-out states without changing the ZANKYO visual identity.
   - Prevent accidental product navigation when customers tap wishlist or add-to-bag controls.

3. **Optimize mobile shopping layouts**
   - Tune the home category grid, product lists, collection cards, and related products for small screens.
   - Prevent long product names, prices, category labels, and legal text from clipping or forcing horizontal scrolling.
   - Improve product-image sizing and spacing so the full item remains visible.
   - Keep category filters easy to swipe and clearly show the selected category.

4. **Fix bag, account, and product-page behavior**
   - Make the bag fit the visible mobile browser area, including its scrolling items and fixed checkout area.
   - Keep totals and shipping information readable on narrow devices.
   - Improve the product page’s size selector and primary actions for one-handed use.
   - Keep the AI try-on guidance desktop-specific without disrupting mobile purchasing.

5. **Performance and browser hardening**
   - Reduce layout shifts with stable image dimensions and appropriate loading priorities.
   - Respect reduced-motion settings and avoid hover-only behavior on touch devices.
   - Check browser-safe viewport height, sticky elements, overflow, and dynamic mobile address-bar behavior.

6. **Verification**
   - Test the complete public flow at phone widths: home → shop/filter → product/size → wishlist → bag → checkout handoff.
   - Test account links, About, Terms, and Returns pages for overflow and readable typography.
   - Re-check tablet and desktop layouts to ensure mobile changes introduce no regressions.
   - Confirm the app builds cleanly and produces no runtime or console errors.

## Technical details
- Use the existing responsive design tokens and components; no storefront redesign or commerce/backend changes.
- Prioritize common mobile widths around 360–430px, then verify tablet and 1280px desktop.
- Replace fragile multi-item header rows with shrink-safe grid/flex layouts and use mobile-safe viewport units where needed.
