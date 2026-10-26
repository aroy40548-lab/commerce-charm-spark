# Save reels and posts, ZANKYO logo, faster and better-looking Social

## 1. Save reels and posts
- Posts already have a save (bookmark) button. Reels get one too: in the full-screen reel viewer, under the Share button, and on reels in the feed.
- The Saved tab on your profile shows saved photos and reels together, newest first. Only you can see it.
- Saving works right away on screen, even before the server confirms. If saving fails, it switches back and shows a message.

## 2. ZANKYO logo
- **Admin panel:** the ZANKYO icon + wordmark at the top of the sidebar and the phone header. Works in both light and dark themes.
- **ZANKYO Social:** only the ZANKYO icon (no text) in the Social top bar on phones and in the laptop strip. The text "ZANKYO Social" is removed.

## 3. Make Social smoother (less lag)
- Reels: only the reel on screen plays. The ones just above and below get ready in the background, and all others are fully unloaded. Today many videos stay loaded, which is what makes it lag.
- Feed reels show a still cover first and play only once mostly on screen. The profile grid shows still covers instead of loading every video.
- Photos: the feed shows a small blurred preview instantly, then the sharp photo. Photos lower down load only when you get close.
- Fewer server calls: like/comment/follow counts come back in one request per page, and loaded screens are reused when you go back.
- One live connection for notifications and chat instead of several. Smooth scrolling with no layout jumps (photo boxes keep their size while loading).
- Find and speed up the slowest database lookups behind the feed, profile and inbox.

## 4. New Social look (more attractive)
- Darker, premium "night mode" look across Social with the ZANKYO red as the highlight colour. Bold headings in the brand font.
- **Stories-style row** at the top of the feed: round photos of people you follow who posted recently (tap opens their latest post/reel), plus a "Your post" + button.
- **Post cards:** edge-to-edge photos, rounded profile pictures with a red ring, a bouncy like animation, tidy action row, captions that expand with "more", and a cleaner "Shop this look" card with the product photo and price.
- **Bottom bar:** icon-only with a red dot for the active tab, a raised red + button in the middle, and your profile photo as the Profile icon.
- **Profile:** large header with photo, counts in a row, bio, rounded Edit/Share/Follow/Message buttons, and icon tabs for Posts / Reels / Products / Saved.
- **Inbox & notifications:** chat bubbles with rounded corners and times, unread chats in bold with a red dot, and notification rows with a small preview of the post.
- Empty screens get friendly messages and a button to post or find people.
- Checked on phone (393px), tablet (834px) and laptop.

## Technical details
- Reel save: `toggleSave({kind:"reel"})` already exists server-side; add `saved` to the reel cards (`listReels`/`toCards`, feed `ReelTile`) and a Bookmark button in `ReelsFeed` and `ReelTileView`. `profileGrid` saved tab merges post and reel saves by `saves.created_at`.
- Logo: reuse `zankyo-compact-light/dark` asset pointers (same as the Navbar) in `admin.tsx` and `SocialChrome.tsx`, switching by theme.
- Perf: `ReelsFeed` limits `src` to the current ±1 reel (others `src` removed + `load()`); `preload="metadata"` + poster for tiles; `content-visibility:auto` on feed cards; image `width/height` + blurred thumb placeholder; batch count queries; `memo` on cards; check `supabase--slow_queries` and add indexes (e.g. `post_likes(post_id)`, `reel_votes(reel_id)`, `saves(user_id, created_at)`, `messages(conversation_id, read_at)`).
- Social theme: scoped `.zk-social` class wrapping Social routes with dark tokens in `src/styles.css`; no hard-coded colours.
