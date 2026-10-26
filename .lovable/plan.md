# Partner links for 365 days, one view per person, user search and follower lists

## 1. Affiliate links last 365 days
- When someone opens a partner's product or reel link, that partner gets credit for orders placed in the next **365 days**. After 365 days the link stops crediting.
- The store setting is already 365. Right now the site ignores it and uses 30 days. The site will now read the setting from Admin → Settings, so the owner can change it later.
- If the shopper opens a different partner's link, the newer link takes over and the 365 days start again.
- The partner page will say "Your link credits you for 365 days after each click".

## 2. One view per person on reels
- Each signed-in person counts as 1 view per reel, no matter how many times they watch it.
- Signed-out visitors count once per browser.
- Old view totals stay as they are.

## 3. Search accounts
- A new search box on the Reels page (and a search icon in the menu on phones) to find people by @username or name.
- Results show photo, name, @username and a Follow button. Tapping a result opens their profile.
- Hidden, suspended and banned accounts don't show up.

## 4. Followers and Following lists
- On every profile, the "Followers" and "Following" counts become tappable.
- They open a list of people (photo, name, @username, Follow button). Tapping anyone opens their profile, where you can keep going: their reels, their followers, who they follow.
- Anyone can see these lists, on their own profile or someone else's.
- "Posts" for now means their reels. A separate photo-posts feature can be added later if you want it.

## 5. "Affiliate" becomes "Affiliate Partner"
- Menu button, footer, account page, product page button ("Copy my partner link"), page heading and the admin wording all change to **Affiliate Partner** / **Partner**.

## Technical details
- `captureReferral` reads `affiliate_cookie_days` from the store settings (cached), defaulting to 365. The server also refuses a referral older than that window: the click time is sent with the order and checked in `placeOrder`.
- New `reel_views` table (reel_id, viewer key = user id or browser id, primary key on the pair; RLS on, service role only). `viewReel` inserts with on-conflict-do-nothing and only increments `reels.views` when a new row was added.
- New server functions `searchProfiles(q)` (ilike on username/full_name, active accounts only, limit 20) and `listFollows({ username, kind: followers|following })`, both returning public fields only (never email).
- New routes `/u/$username/followers`, `/u/$username/following` and `/search`, each with its own page title. The profile counts link to these pages.
- Test: the referral expires after the configured number of days.
