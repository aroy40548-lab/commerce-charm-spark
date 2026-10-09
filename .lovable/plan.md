# Replace the homepage hero with the new square video

## What will change
- Replace the current homepage hero film with the uploaded `IMG_3524.MOV`.
- Keep the existing ZANKYO title, campaign copy, Shop button, overlays, and hero interactions unchanged.
- The film remains a background: automatic playback, muted, looping, inline on phones, non-clickable, and without controls.

## Square-video framing
- Use a centered full-bleed crop because the action and garments stay near the middle throughout the 14.6-second clip.
- Tune phone and desktop crop positions separately so the main model remains visible when the square frame fills portrait and widescreen hero areas.
- Keep the dark readability overlays over the video and verify that no important action is hidden behind the title or Shop button.

## Playback optimization
- Convert the uploaded 1080×1080 HEVC MOV into a browser-compatible H.264 MP4 at 30fps, remove the audio track, enable fast-start streaming, and compress it for reliable mobile loading.
- Create an optimized poster frame from the new film so the hero appears immediately while playback starts.
- Upload the MP4 and poster through the existing CDN asset flow, then point the homepage hero to those new assets. Keep the previous assets intact so older published versions are not broken.

## Checks
- Verify at phone widths (360px and 393px) and laptop width (1280px): central subject stays in frame, text remains readable, and there is no sideways movement.
- Confirm autoplay, loop, mute, no controls, no click response, and poster fallback.
- Confirm the homepage has no new errors and the rest of the storefront is unchanged.

## Technical details
- Source confirmed: HEVC Main, 1080×1080, 30fps, 14.57 seconds, approximately 24.6MB.
- Update only the homepage hero media imports and responsive video crop classes in `src/routes/index.tsx`; no Shopify, catalog, checkout, account, or promotion behavior changes.
