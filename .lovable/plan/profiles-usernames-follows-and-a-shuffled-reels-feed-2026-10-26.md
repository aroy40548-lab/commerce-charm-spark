# Profiles, usernames, follows and a shuffled Reels feed

## What customers will see
1. **Mandatory name + username after sign-in** (email code or Google). A popup that can't be skipped asks for Name and Username. Customers who are already signed in without them see the same popup on their next visit.
   - Username: unique, 3–20 characters, lowercase letters, numbers, `.` and `_`. Live "available / taken" check while typing.
2. **Where names show**
   - Reels: creator shows as `@username` (tappable).
   - Comments: the person's Name.
   - Email is never shown anywhere.
3. **Public creator profile** at `/u/<username>`: profile photo, name, @username, bio, follower / following / reel counts, Follow button, and a grid of all their live reels (tap opens that reel in the feed).
4. **Edit my profile** (inside Reels studio and Account): change profile photo, name, username, bio (up to 150 characters).
5. **Follow**: anyone signed in can follow/unfollow a creator from the reel or their profile page.
6. **Shuffled feed**: every visit the order is mixed, not newest-first. Reels from people you follow appear more often, but everyone's reels still show. Reels already seen in the session don't repeat until the pool runs out.
7. **Admin "Push" control** (Admin → Reels): each creator and each reel gets a priority — Normal, Boost, Top, or Hide from feed. Boosted ones appear more often in everyone's shuffled feed.

## How the feed mix works
Each reel gets a random score per visit, multiplied by:
- Followed creator: x3
- Admin Boost: x2, Top: x4 (creator or reel level, highest wins)
- Very new reels (under 48h): small extra lift
Then sorted, paged 8 at a time, skipping reels already shown.

## Technical details
- Database (new migration): `profiles` gains `bio`, `avatar_path`, `feed_priority`; unique lowercase index on `username`; new `follows (follower_id, following_id, created_at)` with primary key on the pair; `reels` gains `priority`. RLS on, no client policies (server functions only, per project rule).
- Avatars stored in the private `reels` bucket under `avatars/<user_id>/…`, served with signed URLs.
- New server functions: `getMyProfile`, `saveMyProfile` (validates + uniqueness, friendly "username taken" error), `checkUsername`, `getPublicProfile(username)`, `follow/unfollow`, `createAvatarUpload`; admin `setCreatorPriority`, `setReelPriority` (needs marketing permission).
- `listReels` switches to weighted shuffle using a per-session seed + list of seen IDs sent from the browser; `ReelCard` gains `username`, `avatarUrl`, `following`.
- `publicName` keeps using first/last name for comments; reels use `@username`.
- Global `ProfileSetupGate` mounted in `__root.tsx`: shows the required popup whenever a signed-in user lacks name or username (not on `/admin`).
- Tests: username format rules, feed weights (followed x3, Boost x2, Top x4).
