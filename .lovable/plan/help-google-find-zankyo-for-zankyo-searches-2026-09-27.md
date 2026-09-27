# Help Google find ZANKYO for "Zankyo" searches

Currently: no sitemap, no page addresses declared as official (canonical), and no brand information for Google. Page titles exist but don't strongly signal the brand name.

## What changes
1. **Homepage title and description** lead with the brand: "ZANKYO | Official Streetwear Store India — Jorts, Wide Leg Sweatpants, Boxy Shirts", with a description mentioning "Zankyo" and zankyo.in.
2. **Brand identity for Google** on the homepage: Organization + WebSite details (name ZANKYO, alternate name Zankyo, logo, zankyo.in, contact help@zankyo.in). Helps Google show the brand panel and site name.
3. **Official address on every public page** (canonical + share link) pointing to https://zankyo.in/..., so www and preview copies don't compete.
4. **Unique titles/descriptions** on Shop, Collections, About, Terms, Returns, and each product page ("<Product> — ZANKYO"), plus product details (price in INR, stock) on product pages.
5. **Sitemap** at zankyo.in/sitemap.xml, generated live so it lists all Shopify products automatically; linked from robots.txt. Account, sign-in and order pages stay hidden from Google.

## After publishing (your side)
- Publish, then in Google Search Console: Sitemaps -> submit `sitemap.xml`, and URL Inspection -> "Request indexing" for https://zankyo.in.
- New brand sites usually appear for their name within a few days to a few weeks; Instagram/social links pointing to zankyo.in speed this up.

## Technical details
- Edit `head()` in `src/routes/index.tsx`, `shop.tsx`, `collections.tsx`, `about.tsx`, `terms.tsx`, `returns.tsx`, `product.$handle.tsx` (canonical in `links`, og:url, JSON-LD in `scripts`; Product JSON-LD from loader data).
- Keep root defaults in `__root.tsx` (no canonical there); add `og:site_name`.
- New server route `src/routes/sitemap[.]xml.ts` fetching product handles via Storefront API.
- Add `Sitemap: https://zankyo.in/sitemap.xml` to `public/robots.txt`.
