<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Commerce runs on the connected Shopify store: Shopify supplies catalog, stock, cart, checkout, and hosted customer accounts. Why: Shopify is the live system of record and management backend.
- Customer sign-in and account links open Shopify's hosted one-time email-code account page. Why: the store uses Shopify's new customer accounts rather than storefront passwords.
- Saved items stay account-linked through the existing wishlist sync layer, while the cart uses real Shopify product and variant IDs. Why: preserve cross-device wishlist behavior alongside Shopify commerce.
- Virtual try-on uses Decart Anywear; the custom button opens the widget and isolates its internal image handoff in `src/lib/decart.ts`. Why: preload the current product photo while failing safely if the third-party widget changes.
- Brand surfaces use the supplied ZANKYO kanji artwork through CDN asset pointers, with separate light/dark variants and a local optimized favicon. Why: preserve exact brand artwork while keeping theme contrast and tab clarity.
- Categories = Shopify collections (collection image) plus uncovered product types; product pages show all Shopify images. Why: store is fully managed from Shopify admin.
