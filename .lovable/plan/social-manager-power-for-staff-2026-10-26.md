# Social Manager power for staff

## What changes
- The current "Community" power in Staff roles becomes **Social Manager** — "Manage ZANKYO Social: reels, posts, comments, chat reports, account restrictions".
- A staff member with Social Manager can moderate all of Social from the admin panel:
  - Reels dashboard: hide/delete reels, delete comments, Boost/Top push (today these need "Marketing").
  - Social posts, comments, chat reports, announcements (already covered).
  - Hide / suspend from Reels / ban accounts (today this needs "Customers"; staff with Customers keep it too).
- Store owners keep full power. Roles that already have Community keep it automatically, now named Social Manager.
- Affiliate commissions stay under Marketing only.
- A ready-made "Social Manager" role appears in Staff → Roles, with this one power ticked, so the owner can assign it in one click.

## Technical details
- `src/lib/admin/permissions.ts`: keep key `community`, relabel and update the hint.
- `src/lib/reels.functions.ts`: reel moderation calls `requireStaff(context, "community")` instead of `"marketing"`.
- `src/lib/admin/accounts.functions.ts`: allow the change when the staff member has `customers` or `community`.
- Staff page: add a "Social Manager" preset role (insert one role row with `["community"]` if missing).
- Add a test that a Social Manager can moderate reels and accounts but not commissions.
