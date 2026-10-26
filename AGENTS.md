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

- Commerce runs on ZANKYO's own backend in Lovable Cloud (Shopify removed Oct 2026): catalog, stock, orders, discounts, gift cards, reviews, affiliates and staff all live in Postgres; schema changes go in `drizzle/migrations`. Why: Shopify was too costly; the owner manages everything from `/admin`.
- All database reads/writes go through server functions using the service-role client after an auth check; new tables have RLS on with no client policies. Why: one place enforces permissions.
- Admin lives at `/admin` (and `admin.zankyo.in`, which only serves the admin). Every staff member can view every admin page; editing a section needs that section in their role (`src/lib/admin/permissions.ts`), checked on the server by `requireStaff`. Store owners = `user_roles.role = admin`. Why: owner asked for view-all, change-only-assigned roles.
- Checkout is on-site: prices, discounts, gift cards and stock are re-checked on the server; Razorpay (online) or COD; `commit_order`/`release_order` SQL functions take/return stock, gift card balance and affiliate commissions. Why: one atomic place for money and stock.
- Customers sign in with Lovable Cloud auth (Google or a 6-digit email code). Reviews require a real paid/COD order for that product. Affiliates share per-product links (`/product/<handle>?ref=CODE`) or reels (`/reels/<id>?ref=CODE`); commission is computed in SQL only on the linked/tagged products of the order (`affiliate_commission_base`), and waits for owner approval. Why: owner wants product-specific credit, not whole-site links.
- Product photos and uploaded files live in the private `product-images` bucket and are served via `/api/public/img/*` (non-images download, never render). Why: bucket stays private.
- Virtual try-on uses Decart Anywear; the custom button opens the widget and isolates its internal image handoff in `src/lib/decart.ts`. Why: preload the current product photo while failing safely if the third-party widget changes.
- Brand surfaces use the supplied ZANKYO kanji artwork through CDN asset pointers, with separate light/dark variants and a local optimized favicon. Why: preserve exact brand artwork while keeping theme contrast and tab clarity.
- Categories = the `categories` table (admin → Collections); product pages show all product photos in order.
- Customer Reels (≤59s) live in the private `reels` bucket; uploads go browser → signed upload URL, playback via signed URLs; public names come from `profiles` via `publicName`, never email. Why: big videos shouldn't pass through server functions, and privacy.
- Phones get a bottom tab bar (Home/Reels/Bag) from `__root.tsx`; the bag opens via a window event so one CartDrawer stays the source of truth.
