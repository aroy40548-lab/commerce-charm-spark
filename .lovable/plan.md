# Reels sound on, profile popup fix, account suspension

## 1. Reels play with sound
- Reels start with sound on.
- Phone browsers block sound until the shopper has tapped the page once. Until then the reel plays muted with a small "Tap for sound" hint. After the first tap, every reel plays with sound.
- The shopper's mute choice is remembered while they keep scrolling.

## 2. "Set up your profile" popup closes after Continue
- First, reproduce it: sign in, fill in the popup, tap Continue, and see what the save returns. The cause isn't confirmed yet. It could be the save failing (for example the username "zankyo" being blocked) or the popup not refreshing.
- Fix it so that after a good save the popup closes straight away and doesn't come back. If something is wrong, show a clear message under the field that needs fixing.

## 3. Admin: block, hide and suspend accounts
New account controls in Admin → Customers (on each customer) and in Admin → Reels (on each creator):
- **Hide from reels**: their reels and profile stop showing to everyone else. They can still shop.
- **Suspend from reels**: they can't post reels, comment, like or follow, and their reels are hidden.
- **Ban from store**: they can't place any order, online or cash on delivery. Checkout shows "Your account can't place orders. Contact help@zankyo.in." This also covers reels (same as Suspend).
- Each action needs a reason, can be undone, and is saved in a history list. Only staff with permission to edit Customers can change it. Store owners can never be banned.
- The person sees a clear notice on their account page.

## Technical details
- Reels: start with `muted=false`, fall back to muted when `play()` is rejected, flip to unmuted on the first page tap.
- Popup: check what `saveMyProfile` returns for a real session. Set the `["my-profile"]` cache straight from the save response so the gate closes right away.
- New `profiles.account_status` column (`active | hidden | reel_suspended | banned`) plus `status_reason`, `status_changed_at` and `status_changed_by`, and an `account_actions` history table (RLS on, service role only).
- Checks on the server only: all reel actions (publish, vote, comment, follow) refuse suspended or banned users; listReels, profile pages and comments skip hidden, suspended or banned creators. Order creation and checkout refuse banned users; the check matches the signed-in account plus the email on the order, so guest checkout can't get around it.
- Tests for the rules: a banned user can't order, a suspended user can't post, a hidden creator doesn't show in the feed, a store owner can't be banned.
