# ZANKYO Social — Instagram-style Reels tab

Tapping **Reels** opens a complete "ZANKYO Social" app inside the site, styled like Instagram but in ZANKYO's own look.

## 1. New social layout (phones first, also laptops)
- Inside Social, its own bottom bar: **Feed · Reels · Post (+) · Inbox · Profile**. A small "Back to Shop" button stays at the top, so the store is one tap away.
- Top bar: ZANKYO Social logo, a heart icon (notifications) and a message icon (chats), with red unread dots.

## 2. Photo posts
- Customers can post **1–10 photos** with a caption and up to 5 tagged products (same "Shop" chip as reels; partner credit works the same way).
- **Feed tab**: Instagram-style scrolling posts (photos + reels mixed), swipe between photos, double-tap to like, like / comment / share / save, "Shop this look" chip.
- Same weighted shuffle as reels (people you follow show more often; admin Boost/Top still applies).

## 3. Profile tab (Instagram-style)
- Photo, name, @username, bio, posts / followers / following counts, Edit profile, Share profile.
- Grid tabs: **Posts**, **Reels**, **Tagged products**, and **Saved** (only you see Saved).
- Tap any tile to open it full screen. Other people's profiles look the same, with Follow and Message buttons.

## 4. Notifications (heart icon)
- Live list: "@x liked your post", "@x commented: …", "@x started following you", "@x mentioned you", plus "Your partner sale was approved".
- Grouped as Today / This week / Earlier; tap to open the post or profile. Red badge count updates instantly.

## 5. Messages (Inbox) — real time
- One-to-one chats between users, delivered instantly while both are on the site.
- Message list with last message, time and unread count; chat screen with text, photos, sharing a post/reel/product into chat, "Seen" and typing indicator.
- Privacy: block a user, report a chat, and banned or suspended accounts cannot send messages. Emails are never shown.

## 6. Admin panel upgrade
- Admin "Reels" becomes **Social**, with tabs: Overview, Posts & Reels, Creators, Comments, Messages reports, Notifications broadcast.
- Overview: new posts, active users, messages per day, top creators, sales from social.
- Moderate posts and reels together (hide / delete / push), see reported chats and act on them (admin reads only reported conversations, not private chats in general).
- Send a store announcement as a notification to everyone.
- General admin polish: cleaner sidebar with grouped sections, quick-search at the top, consistent cards and tables, better phone layout for the admin.

## Questions I'll assume unless you say otherwise
- Photo posts are open to every signed-in customer with a username (same as reels).
- Messages are open to anyone, but people can turn on "only people I follow can message me".
- Your message ended with "AND…" — tell me if there was one more thing to add.

## Build order
1. Social layout + photo posts + Feed
2. Instagram-style profile + Saved
3. Notifications
4. Real-time messages
5. Admin Social dashboard + admin UI polish
6. Phone and laptop check, tests

## Technical details
- New tables: `posts`, `post_media`, `post_products`, `post_votes`, `post_comments`, `saves`, `notifications`, `conversations`, `conversation_members`, `messages`, `blocks`, `message_reports`; RLS on, server functions with service role for writes (project rule).
- Real-time: Realtime enabled on `messages` and `notifications` with RLS SELECT policies scoped to `auth.uid()` membership/recipient so subscribers only receive their own rows; subscriptions in `useEffect` with cleanup.
- Notifications created by SQL triggers on votes, comments, follows and messages.
- Photos in a new private `posts` bucket, signed upload URLs, served via signed URLs; images resized in the browser before upload.
- Account status rules extended: `canMessage` in `src/lib/accountStatus.ts`, checked server-side.
- Routes: `/social` (feed), `/reels` (existing), `/social/new`, `/social/inbox`, `/social/inbox/$id`, `/social/notifications`, `/u/$username` upgraded, `/p/$id` post page. Social bottom bar replaces the store tab bar inside these routes.
- Admin: `admin.reels.tsx` extended to the Social dashboard; new permission section "Community" for moderation.
