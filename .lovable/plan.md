# Fix the sideways-sliding page glitch on phones

## What the video shows
- On the Shop page on a phone, products appear as one huge photo cut off on the right, not two neat columns. The category pills (All, Tees, Hoodies, Head...) run off the edge too.
- The whole page can be dragged left and right, so the home and product pages also shift sideways ("ome", "aos Skull Tee" get cut off) while scrolling.

## Cause
The Shop page layout makes its main area as wide as the full row of category pills. That pushes the page wider than the phone screen, so the product grid stretches and the browser lets the page slide sideways.

## Fix
1. Shop page: keep the main area locked to the screen width on phones so the category pills scroll inside their own row and products show in 2 columns again.
2. Site-wide safety: stop the page from ever sliding sideways on phones, including in Safari and Chrome on iPhone, without breaking the sticky header or the bag.
3. Check the home, shop, collections and product pages on phones for anything else wider than the screen.

## Verification
- Test at 360, 393 and 430 px phone widths: page width equals screen width, Shop shows 2 columns, pills swipe on their own.
- Re-check laptop layout for no changes.

## Technical details
- `src/routes/shop.tsx`: add `grid-cols-1` / `minmax(0,1fr)` and `min-w-0` to the outer grid and its children (the implicit auto column sizes to the pill row's max-content).
- `src/styles.css`: add `overflow-x: clip` on `html` and `body` (clip keeps `position: sticky` working, unlike `hidden`).
