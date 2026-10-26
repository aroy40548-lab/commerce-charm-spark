# Social themes (Navy / Black / White) + smarter back arrow

## What changes
1. **Three looks for ZANKYO Social**, chosen with a new theme button in the Social top bar (phone) and the Social side menu (laptop):
   - **Navy** (default) — the earlier deep navy-blue night look.
   - **Black** — the new pure black look.
   - **White** — clean light look.
   - Tapping the button cycles Navy → Black → White; each visitor's choice is remembered on their device. The store and admin keep their own themes.
2. **Back arrow fix in Social's top bar:**
   - On the Social home feed, the arrow goes back to the store (as now).
   - On every other Social screen (Search, Notifications, Inbox, a profile, a post, Reels), the arrow goes to the Social home feed instead of the store.

## Technical details
- `src/styles.css`: add `.zk-social.social-navy` block restoring the previous navy token values (background `oklch(0.129 0.042 264.695)`, card `oklch(0.208 0.042 265.755)`, etc., with ZANKYO red accent); `.dark` keeps pure black.
- New `useSocialTheme()` hook (localStorage key `zk-social-theme`, read after hydration, default `navy`).
- `src/routes/__root.tsx`: social wrapper class becomes `zk-social` + `dark social-navy` | `dark` | (none) for white.
- `SocialChrome.tsx`: theme button (Moon/Sparkle/Sun icon) next to search; arrow `to` = `/` when path is `/social`, otherwise `/social`.
