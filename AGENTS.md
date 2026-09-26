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

- Commerce runs on Lovable Cloud (no Shopify): catalog read via browser client (public RLS), admin CRUD via browser client gated by has_role RLS, payments/shipping/refunds via server fns in src/lib/*.functions.ts with secrets in commerce.server.ts. Why: single source of truth, server-enforced security.
- Admin panel lives under /admin (hidden storefront chrome); admin.zankyo.in redirects to /admin and zankyo.in blocks /admin. Why: one deployment serves both domains.
- Admin-uploaded images are stored as "storage:<path>" in the private product-images bucket and served via /api/public/img/*. Why: workspace blocks public buckets.
- Customer auth = Google or username+password (usernames unique, case-insensitive; accounts created server-side with no email verification). Admin role only granted to listed emails via Google sign-in. Why: password accounts are unverified, so they must never become admin.
