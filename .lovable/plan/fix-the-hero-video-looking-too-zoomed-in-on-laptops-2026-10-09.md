# Fix the hero video looking too zoomed-in on laptops

## Problem
The hero video is square (1:1), but laptop screens are wide. To fill the wide hero area, the browser zooms the video in heavily and crops the top and bottom — so the footage looks too close and loses its framing.

## Fix
In `src/routes/index.tsx`, change how the video fills the hero on larger screens:

- **On laptops/desktops:** stop zooming the video to fill the full width. Instead, show the whole square video at its natural framing, centered, with a soft blurred copy of the same video filling the empty space on the left and right (a cinematic "ambient backdrop" — the same technique YouTube/Instagram use for vertical videos). Nothing looks cropped or too close, and the hero still fills the screen edge to edge.
- **On phones:** keep the current framing exactly as it is — the square video already fits tall phone screens well.

## Implementation
- Add a second, blurred, scaled-up copy of the video behind the main one (visible only on `sm:` and up), using the same video file so no extra download is needed.
- Main video on desktop: `object-contain` centered, full height of the hero; on mobile: unchanged `object-cover` crop.
- Keep all existing overlays, gradients, title, and Shop button unchanged; keep muted, looping, non-clickable behavior on both layers.

## Checks
- Laptop preview (1280px and wider): full square video visible, not zoomed, blurred backdrop fills the sides, text readable.
- Phone preview (393px): hero looks identical to today.
- No sideways scrolling, no errors, video still loops muted and non-clickable.
