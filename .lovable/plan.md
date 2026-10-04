# Homepage video framing on phones — verified fixed

## Current state (verified just now)
The mobile crop fix from the previous session is live in the preview and confirmed working:

- **Phone (393px):** the video crop is set to 72% horizontal, and a fresh screenshot shows both models visible in the hero — the main model near center, the second model fully in frame on the right.
- **Laptop (1280px):** framing is identical to before (top-anchored), matching your screenshot.
- No sideways scrolling, no console errors, video still loops muted and non-clickable.

## Remaining step
No further code change is needed. The only remaining action is to **publish** so the fix reaches zankyo.in.

## Optional fine-tune (only if you want it)
If on your real phone the models still look slightly off-center, the crop point can be nudged (e.g. 72% → 68% or 75%) — a one-line change.
