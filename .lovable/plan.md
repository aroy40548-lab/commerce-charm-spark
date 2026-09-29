# Add UNBOXING // 001 page and nav button

## What will change

- Add a new top navigation button **UNBOXING // 001** between **Collections** and **About** (desktop menu and the swipeable mobile menu — both use the same nav list, so both update).
- Clicking it opens a new **/unboxing** page presenting the 4 archive items in a grid, using the packaging photos the user uploaded.
- The unboxing video the user shared (Google Drive clip of the archive box reveal, "ZANKYO — More than just clothes") plays **directly on the website**, as a full-width section on the /unboxing page — no link out, no external player page.

## Page design

- Hero: dark ZANKYO-style section with "UNBOXING // 001", tagline "More than just clothes", and the archive-document styling (monospace labels, numbered items) matching the black-and-white streetwear look.
- The 4 items as a grid (2x2 on laptop, stacked on mobile), each card with its photo, index number, title and the supplied description:
  - **01 // THE OUTER ARMOR** — matte black archive box photo
  - **02 // FROSTED GRAPHITE GARMENT POUCH** — pouch photo
  - **03 // 400 GSM BLACK COLLECTOR'S DOCUMENT** — document card photo
  - **04 // 3-SLASH STEALTH METAL KEYCHAIN (HOLDER'S PRIVILEGE)** — keychain photo
- Full-width **unboxing video section**: the 17-second clip plays on the page itself — muted autoplay, looping, with a play/pause control and a preview frame (poster) shown until it loads, matching the dark theme. On phones it fills the screen width; on laptops it sits centered at a comfortable width.
- Full-width **unboxing sequence** strip below (the 4-stage photo: Stage 1 The Arrival → Stage 4 The Full Archive), with a short caption.
- A "Shop the drop" button linking to /shop, and keep the wording of the 4 descriptions exactly as supplied.
- Dark theme by default on the page (photos and video are dark), comfortable mobile spacing, no horizontal scroll.

## Technical details

- Create `src/routes/unboxing.tsx` with its own `head()`: unique title, description, og:title, og:description, og:type, twitter:card, canonical `https://zankyo.in/unboxing`.
- Store the 5 uploaded photos as CDN asset pointers (Lovable Assets) in `src/assets/` and import them in the page.
- Video handling: the Drive clip is an iPhone recording (HEVC in a .MOV container), which most browsers cannot play as-is. Convert it once to a web-standard MP4 (H.264, sound kept if present, ~7 MB) plus a preview frame, upload both as CDN asset pointers, and embed the MP4 in a native HTML5 `<video>` element (works on every phone and laptop browser; no YouTube/Drive embed, no external player).
- Update the shared `NAV` array in `src/components/Navbar.tsx` to insert `{ to: "/unboxing", label: "UNBOXING // 001" }`.
- Add `/unboxing` to the static pages in the sitemap route so Google indexes it.
- No changes to checkout, catalog, Shopify data, cart, wishlist, or accounts.
- Verify the nav order and page on mobile and laptop widths with zero new console errors.
