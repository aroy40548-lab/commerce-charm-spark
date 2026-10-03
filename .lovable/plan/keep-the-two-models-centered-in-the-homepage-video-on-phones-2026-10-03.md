# Keep the two models centered in the homepage video on phones

## Problem
The homepage video is wide (landscape), but phone screens are tall and narrow. The video fills the screen by cropping the left and right sides, so the two models in the video get pushed out of view on mobile.

## Fix (one small change, mobile only)
In `src/routes/index.tsx`, change the hero video's framing so that:

- **On phones:** the video centers on the middle of the frame (where the two models stand), so both models stay visible. Change `object-top` to a centered crop on small screens.
- **On laptops/tablets:** nothing changes — the current framing stays exactly as it is.

This is a one-line class change on the `<video>` element: use `object-center` on mobile and keep `object-top` from the `sm:` breakpoint up. If the models still sit slightly off after testing, the crop point will be fine-tuned with a percentage position (e.g. `object-[50%_25%]`) until both models are centered.

## Checks
- Preview at phone size (393px): both models visible and centered in the hero.
- Preview at laptop size (1280px): hero looks identical to today.
- No sideways scrolling, no errors, video still loops muted and non-clickable.
