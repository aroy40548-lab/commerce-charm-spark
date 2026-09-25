# Add 4 new categories and demo products (connected to Shopify)

## New categories
- Jorts
- Sweatpants Wide Leg
- Japanese Trousers
- Boxy Shirts

They will appear everywhere the current categories do: the home page category cards, the Shop sidebar, the Collections page, and the product page sidebar.

## Demo products (8 total, 2 per category)
New photos made in the same style as the existing ones. The styles take ideas from your store photos: skull and cross graphics, faded/washed denim, checked shirts, streetwear on hangers.

- **Jorts:** Cross Stitch Jorts (Rs 2,799), Acid Wash Jorts (Rs 2,599)
- **Sweatpants Wide Leg:** Void Wide Leg Sweatpants (Rs 2,999), Striped Track Wide Leg (Rs 3,199)
- **Japanese Trousers:** Kyoto Pleated Trousers (Rs 3,799), Ronin Balloon Trousers (Rs 3,999)
- **Boxy Shirts:** Grid Check Boxy Shirt (Rs 2,499), Flame Print Boxy Shirt (Rs 2,699)

Every product will be created in your Shopify store with sizes (S, M, L, XL), prices in rupees, and stock tracking. They show up on the site automatically.

## Note on stock
Like the current products, these will start at zero stock and show "Sold out" until you add stock in Shopify admin. I can't set stock numbers from here.

## Technical details
- Generate 8 product images and 4 category images into `src/assets/`.
- `shopify--batch_create_products` with `product_type` equal to the category name (the shop filter matches on productType), options Size S/M/L/XL, `inventory_management: shopify`, requires_shipping true, images attached.
- Update the CATEGORIES lists in `index.tsx`, `shop.tsx`, `collections.tsx` and `product.$handle.tsx`. The home grid becomes 5 columns x 2 rows on large screens to fit 10 cards.
