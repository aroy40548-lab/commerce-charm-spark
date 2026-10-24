# Replace the try-on queue screen with "Wait for few sec"

## Goal
When a shopper opens Virtual try-on, they should not see the "QUEUE / You're #1 in line / VIP $9.99/mo" box. They should see a simple ZANKYO message: **"Please wait a moment while AI processes your request"**.

## Important limitation
That queue box is drawn inside Decart's own fitting-room window, which comes from their website. We cannot edit or delete text inside it. What we can do is place our own cover on top of their window while it is waiting.

## Plan
1. Check whether the fitting-room window sends signals to our page (like "waiting in queue" or "ready"). If it does, use them to show our cover only while it is waiting and remove it the moment the try-on is ready.
2. If it sends no signals, show the cover for a short fixed time after tapping try-on (about 6 seconds), then reveal the fitting room.
3. The cover: matches the fitting-room size and position, ZANKYO styling, a small spinner and the text "Wait for few sec". It works in dark and white mode and does not block the close button.
4. If the widget changes or fails, the cover removes itself so the fitting room never gets stuck hidden.
5. Verify on laptop: tap try-on, see "Wait for few sec", then the try-on appears; repeat opens work; no errors.

## Technical details
- Overlay lives in `src/lib/decart.ts`, positioned over `#__decart-tryon-widget iframe` via its bounding rect, re-synced on resize; leaves the widget header (minimize/close) uncovered.
- Listen to `window` `message` events from the anywear origin to detect queue/ready states if available; fallback is a timer plus removal when the widget closes.
