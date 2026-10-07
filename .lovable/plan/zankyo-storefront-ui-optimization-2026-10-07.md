# ZANKYO storefront UI optimization

## Direction
Build the selected **Brutalist editorial spread** across the customer storefront using the locked choices:

- **Palette:** Ink, paper white, signal red, concrete grey
- **Typography:** Bebas Neue for display text, Barlow for product and interface copy
- **Layout:** Japanese streetwear magazine meets numbered archive catalog
- **Theme:** Fully designed ink-dark and paper-white modes, selectable by the customer
- Preserve the supplied ZANKYO/残響 artwork, Shopify-controlled products and collections, hero video, wishlist, cart, checkout, accounts, reviews, and product try-on.

## What will change

1. **Create one cohesive storefront system**
   - Replace the current fonts and soft rounded styling with semantic ink/paper/signal-red tokens, hard editorial rules, compact archive labels, and restrained square geometry.
   - Build both modes deliberately: a deep ink, high-contrast night mood and a clean paper-white editorial mood, with accessible contrast and no unreadable images, borders, overlays, or controls in either mode.
   - Add the selected fonts through the document head and make every customer-facing page, popup, drawer, form, empty state, and feedback message use the same theme tokens.
   - Use measured reveal, image crossfade, and tactile press effects while respecting reduced-motion settings.

2. **Add the customer theme button**
   - Add a clear sun/moon icon button to the shared header, with a tooltip and accessible label, so customers can switch between dark mood and white mode from any page.
   - Use the device preference on a first visit, remember the customer's choice on that browser, and apply it before the page appears to prevent a bright flash or theme jump.
   - Swap the supplied light/dark ZANKYO logo artwork automatically and keep the browser, popup, bag, wishlist, search, and notifications visually consistent with the chosen mode.

3. **Recompose the shared header and promotion**
   - Make the offer strip, ZANKYO logo, navigation, search, account, wishlist, and bag read as one crisp magazine masthead.
   - Keep phone navigation swipeable and all primary controls comfortably tappable.
   - Restyle the FIRST20 popup to match the chosen sharp black frame and signal-red offset shadow without changing its countdown, copy, targeting, or expiry logic.

4. **Turn the homepage into an editorial spread**
   - Keep the existing full-bleed video and verified mobile/desktop model framing.
   - Add the selected vertical archive rail on larger screens, oversized ZANKYO title treatment, campaign statement, and strong rectangular Shop action.
   - Rework Shopify-driven categories into an asymmetric magazine grid using their real collection images.
   - Present New Arrivals and campaign banners as clear issue-style sections rather than interchangeable ecommerce cards.

5. **Upgrade product discovery**
   - Redesign product cards with portrait editorial framing, readable price hierarchy, sale treatment, wishlist state, and a stable quick-add control.
   - Use a second Shopify product image as a desktop crossfade when available; keep the first image and tap behavior predictable on phones.
   - Apply the same visual language to Shop and Collections while preserving filters, search, Shopify categories, and two-column phone browsing.

6. **Improve the product and purchase flow**
   - Recompose the product page as a fashion editorial: larger gallery, numbered thumbnails, clearer title/price/size hierarchy, stock state, Add to Bag, wishlist, and desktop try-on.
   - Restyle the bag and wishlist panels to match the archive system and keep totals, quantity controls, checkout, and account sync unchanged.
   - Keep reviews and related products integrated in the same visual rhythm.

7. **Glitch and quality pass**
   - The current preview has no reported build/runtime errors and no horizontal overflow at 393px or 1280px; treat glitch work as a full regression pass rather than an assumed root-cause fix.
   - Check dynamic long names, missing/one/multiple images, sold-out variants, empty states, popup timing, sticky navigation, category scrolling, gallery swiping, drawers, and Decart-injected badges.
   - Verify home → shop/filter → product/size → wishlist → bag in both themes on 360px, 393px, 430px, tablet, and 1280px widths with no overlap, sideways page movement, theme flash, hydration errors, or broken actions.

## Technical details
- Update the shared design tokens and font mapping in `src/styles.css` and the font links in the root document head.
- Add an early theme initializer plus a reusable header theme control; use a class-based dark mode and browser storage without changing customer-account behavior.
- Apply the selected composition to shared storefront pieces and the Home, Shop, Collections, and Product pages; preserve all existing Shopify data hooks and commerce actions.
- Audit the remaining customer routes—including sign-in, account, order success, unboxing, information pages, error pages, footer, reviews, bag, wishlist, popup, and search—so dark and white modes are complete rather than page-specific.
- Keep Decart try-on hidden on editorial/category media and available only for products.
- Use existing design-system controls for interactive actions and keep route-specific metadata intact.
