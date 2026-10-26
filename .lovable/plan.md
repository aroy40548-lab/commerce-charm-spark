# True black night mode (Admin, Social, and store)

## What changes
- Night mode right now has a navy-blue tint. It will become pure black, like Instagram's dark mode:
  - Page background: pure black `#000000`
  - Cards, menus, popups: very dark grey `#0E0E0E`, slightly lighter `#161616` for hover/inputs
  - Lines/borders: subtle grey `#262626`
  - Text: off-white `#F4F4F0`, secondary text neutral grey `#A3A3A3` (still easy to read)
  - ZANKYO red stays as the highlight color for buttons, likes and badges
- Applies to the admin panel, ZANKYO Social, and the store when night mode is turned on (one shared night palette).
- Admin page background (currently a grey tint over the page) turns fully black in night mode.
- Quick visual check of admin dashboard, reels dashboard, social feed, profile and chat on phone and laptop, fixing any panels that still look blue or grey.

## Technical details
- `src/styles.css`: replace every `.dark` token with neutral (chroma 0) values; set chart/sidebar tokens to neutral, primary to off-white, accent to signal red.
- `src/routes/admin.tsx`: wrapper uses `bg-background` in dark instead of `bg-muted/40`.
- Social chrome: confirm its bars/sheets use `bg-background`/`bg-card` tokens; swap any hardcoded `bg-ink`-style greys.
- Playwright screenshots at 393x852 and 1280x1800 for verification.
