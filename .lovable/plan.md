# Remove Try-On badges from category tiles (keep them on product pages)

## What we found

- The "✦ Try-On" pills on the category tiles (WAFFLE KNITS, TEES, BAGGY JEANS, …) are injected by the Decart Anywear widget over every large photo — not our code. Class: `vton-btn`.
- Category photos with photos appear in exactly two places:
  - Homepage category grid — `src/routes/index.tsx` Categories section (~line 154).
  - Collections page grid — `src/routes/collections.tsx`.
- Shop page and product-page sidebars use categories as text links only — no photos, no badges.
- The existing pattern from the banner fix is already in place: a `zk-hide-vton` marker class plus a CSS rule `.zk-hide-vton .vton-btn { display: none !important; }` in `src/styles.css` (~line 218).

## Changes

1. **Homepage category grid** — `src/routes/index.tsx`
   - Add `zk-hide-vton` to the Categories `<section>` className (~line 154).

2. **Collections page grid** — `src/routes/collections.tsx`
   - Add `zk-hide-vton` to the outer `<div>` className (line 25).

Nothing else changes: the Virtual try-on button stays on product pages, and product photos keep their badges as they do today.

## Verification

- Build OK in /tmp/observability/build-errors.log.
- Playwright at 393×852 (mobile, matching the screenshots): homepage category tiles and Collections page show no Try-On pills; product photos elsewhere still do.
- No console errors, no horizontal scroll.
