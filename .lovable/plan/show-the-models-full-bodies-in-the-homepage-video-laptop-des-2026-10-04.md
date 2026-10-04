# Show the models' full bodies in the homepage video (laptop/desktop)

## Problem
On laptop and desktop screens the hero video is anchored to the top of the frame. The video is much taller than the hero area, so the bottom of the frame — the models' legs — gets cut off, and only their upper bodies show.

## Fix
In `src/routes/index.tsx`, change the desktop/tablet crop anchor of the hero video from top to a lower-centered position (e.g. `object-[50%_60%]` instead of `object-top`), so the frame keeps the sky above and the models' full bodies below. If needed, the hero's minimum height on large screens will be raised slightly (720px → ~800px) to give the video more room.

Mobile stays exactly as it is — the phone crop (both models visible, verified) is not touched.

## Checks
- Laptop-size preview (1280px and 1920px): both models visible head to toe (or near full body) in the hero.
- Phone-size preview (393px): unchanged — both models still in frame.
- No sideways scrolling, no errors, video still loops muted and non-clickable.
