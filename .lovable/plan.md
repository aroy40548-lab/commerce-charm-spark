# Optimize Affiliate + Reels (speed, flow, look)

## 1. Reels feed — faster and smoother
- Load the next reels early, before the shopper gets to them, so swipes don't wait.
- Only the reel on screen and the next one load video; the others stay paused so phones save data and battery.
- Show the cover image right away, with a thin loading line until the video plays.
- Snap scrolling: one swipe = one reel, on phone and laptop.
- Double-tap to like, with a quick heart animation.
- Product popup: a cleaner ZANKYO card (photo, name, price, "View"), plus a "+2 more" chip when more than one product is tagged.

## 2. Reels studio (creator dashboard)
- Step-by-step upload: 1 Video, 2 Products, 3 Caption, then Publish, with a progress bar while uploading.
- Video preview with the length shown, and a clear message if it's over 59 seconds or too big.
- "My reels" as a grid with views, likes and earnings on each one, and quick Share / Edit / Delete buttons.
- Summary at the top: total views, total sales from reels, pending earnings.

## 3. Affiliate page
- Summary cards at the top: clicks, orders, pending earnings, paid earnings.
- Product links grid: photo, name, price, commission per sale, and "Copy link" / "Share on WhatsApp" buttons.
- Earnings list with labels for each sale (Pending, Approved, Paid) and which product or reel it came from.
- A short "How it works" bit in 3 steps for new affiliates; UPI payout details in a clean form.
- Product page: a clearer "Earn ₹X by sharing" button for affiliates.

## 4. Profile pages
- Tidy header (photo, name, @username, bio, follow counts, Follow button) and a 3-column reel grid with view counts.
- Follow button updates instantly when tapped.

## 5. Glitch pass
- Check Reels, Studio, Affiliate and Profile at phone sizes (360, 393) and on a laptop: no sideways scrolling, nothing hidden behind the bottom tab bar, the profile popup doesn't cover reels, works in light and dark mode.

## Technical details
- Reels: lower the infinite-query threshold, preload="none" on videos that aren't near the screen, set the poster from the first frame (stored when the reel is uploaded), CSS scroll-snap, optimistic vote/follow mutations.
- Affiliate: one server function returns summary totals (clicks, commissions by status), so the page doesn't add them up in the browser.
- No changes to how commission is worked out, or to prices or permissions.
