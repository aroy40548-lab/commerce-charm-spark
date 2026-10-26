# Admin Reels dashboard

Admin → Reels becomes a full dashboard with four tabs, built in the same style as the other admin pages.

## 1. Overview
- Stat cards: total reels, live, hidden, total views, likes, comments, new reels this week, active creators.
- Sales from reels: orders and partner commission that came from reels (pending / approved / paid).
- A simple 30-day chart of new reels and views per day.
- Top 5 reels (by views) and top 5 creators (by views and by sales from reels).

## 2. Reels
- Grid of video thumbnails with views, likes, dislikes, comments, tagged products, sales and status.
- Filters: All / Live / Hidden / Boosted, a search box (caption, creator @username) and sort (newest, most viewed, most liked, most sales).
- Tap a reel to open a side panel: video player, caption, creator, tagged products, stats, and actions: Hide/Show, Delete, Push (Normal / Boost / Top / Hide from feed). Its comments are listed there too, with hide/show/delete.
- Select several reels to hide, show, or set push in one go.

## 3. Creators
- Table: photo, name, @username, reels, followers, total views, sales from reels, earnings, push level, account status.
- Search and sort. Each row: change creator push, open "Account access" (hide / suspend / ban), view public profile.

## 4. Comments
- Latest comments across all reels, newest first, with a filter for hidden ones and search by text.
- Hide, show or delete each one, or select several at once.

## Permissions
- All staff can see the dashboard. Changing anything still needs the Marketing permission (and Customers for account access), checked on the server.

## Technical details
- New server functions in `src/lib/admin/reels.functions.ts`: `adminReelsOverview` (aggregates + 30-day series), `adminReelsList` (filter/search/sort/paginate), `adminReelDetail`, `adminCreators`, `adminComments`, `adminBulkReels`; all behind `requireStaff`.
- Sales attribution reads `orders.reel_id` and `affiliate_commissions.reel_id`, counting sold statuses only.
- The page is split into `src/routes/admin.reels.tsx` (tabs, using `?tab=` search params) and components under `src/components/admin/reels/`. The existing moderation and priority functions are reused.
- Charts use the recharts package if it is already installed; otherwise lightweight CSS bars.
