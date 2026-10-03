# Replace the homepage hero image with a looping background video

## What will change

- The big hero image at the top of the homepage (the concrete-steps photo with "ZANKYO / More than just clothes") is replaced by your video, which plays as a background behind the same hero content.
- The video:
  - plays automatically as soon as the page opens,
  - loops forever (restarts by itself),
  - sound is muted,
  - is completely non-clickable — no play/pause controls, no download, no click feedback; clicking or tapping it does nothing.
- The text and buttons on top (STREETWEAR, ZANKYO, MORE THAN JUST CLOTHES, SHOP NOW, Wear your story, Gen Z vibes worldwide) stay exactly as they are.
- Works on phones and laptops; on phones it fills the screen with no sideways sliding.

## Page design

- The video covers the whole hero section, cropped to fit (object-cover), slightly darkened with the same gradient overlay as now so the white text stays readable.
- A dark first frame (poster) shows instantly while the video loads, so there is no white flash.

## Technical details

- The Drive link only opens when signed in, so the clip is fetched through the connected Google Drive. It is an iPhone HEVC .MOV (1512×1080, 7.5s, 120fps), which browsers cannot play as-is — convert once with ffmpeg to web-standard MP4 (H.264, 30fps, no audio track, +faststart, sized for a background) plus a poster frame.
- Upload both as CDN asset pointers in `src/assets/` via lovable-assets.
- In `src/routes/index.tsx` hero section: replace the `<img src={heroImg}>` with a `<video>` element — `autoPlay muted loop playsInline preload="metadata" poster={poster}` — absolutely positioned and covering the section (`object-cover`), plus `pointer-events-none select-none` and `tabIndex={-1}` so it is non-clickable, with `disablePictureInPicture` and `controlsList="nodownload"` for safety. The existing gradient overlay and all hero content stay unchanged.
- Remove the now-unused `heroImg` import.
- Add `og:video`-style metadata is NOT needed; hero image stays as og reference is not set on homepage, so no head changes.
- Verify with Playwright at mobile (393px) and laptop (1280px) widths: video present and playing, no controls, hero text readable, no horizontal scroll, no new console errors.
- No changes to checkout, catalog, Shopify data, cart, wishlist, accounts, or the /unboxing page.
