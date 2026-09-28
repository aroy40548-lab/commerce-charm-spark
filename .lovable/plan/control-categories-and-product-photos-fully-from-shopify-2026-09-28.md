# Control categories and product photos fully from Shopify

## The problem
- Categories on the Home and Collections pages are a fixed list with fixed photos built into the website, so new ones you make in Shopify never show up.
- Product pages only show the first photo, even when you upload several in Shopify.
- Your screenshot shows ₹0: that product's price in Shopify is probably set to 0 or it has no stock yet. The site shows whatever Shopify sends, so the fix is in Shopify.

## What changes
1. **Categories come from Shopify Collections.** Each collection you create in Shopify (Products > Collections) shows up on the Home page, the Collections page, the Shop sidebar and the product page sidebar, using the **collection image** you upload there. The order follows how you sort them in Shopify. If a collection has no image, its first product photo is used.
2. **Shop filter by collection.** Clicking a category shows the products in that Shopify collection, so you control which products go where.
3. **Product photo gallery.** Product pages show every photo you upload in Shopify, in the same order: a big main photo, thumbnails to tap on laptops, and swipe on phones. Virtual try-on uses the photo being viewed.
4. **New products and price changes** already come straight from Shopify. Updates show on the site within about 30 seconds.

## What you do in Shopify
- Create a collection for each category, add a collection image, and add products to it.
- Make sure the collections are available to the "Headless" and "Online Store" sales channels so the site can see them.
- Check the Blood Echo price and stock.

## Technical details
- `src/lib/shopify.ts`: add a `COLLECTIONS_QUERY` (`collections(first: 50) { handle title image { url } products(first: 1) {...} }`) and `COLLECTION_PRODUCTS_QUERY`. Raise `images(first: 5)` to `images(first: 20)`.
- `src/lib/catalog.ts`: `fetchCategories` reads collections (id = handle, name = title, image = collection image or first product image) and drops the fixed `CATEGORY_ORDER`. Add `fetchCollectionProducts(handle)`.
- `useCategories` used in `index.tsx` and `collections.tsx` in place of the fixed lists and local images. The loading state uses skeleton cards, and there's a "No categories yet" message if Shopify has none.
- The `/shop?category=` value becomes the collection handle. Filtering uses the collection's product list. Old productType links still work as a fallback.
- `product.$handle.tsx`: add a gallery component (main image, thumbnail strip, horizontal snap-scroll on mobile). `openDecartTryOn` gets the active image.
- Check with Playwright on phone and laptop sizes. Update AGENTS.md.
