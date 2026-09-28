# ZANKYO logo and tab icon update

## Goal
Use the supplied ZANKYO artwork as the official website identity, with the correct version for light and dark backgrounds and a clear symbol-only browser-tab icon.

## Changes
- Prepare optimized transparent logo assets from both supplied files, preserving the exact symbol, **残響**, ZANKYO lettering, red accent, and “MORE THAN JUST CLOTHES” tagline.
- Replace the current star-and-text header branding with the selected compact lockup: symbol, **残響**, and ZANKYO arranged for a narrow header; keep the tagline for larger placements rather than forcing it into the mobile header.
- Replace the footer’s old star logo with the full supplied stacked logo and tagline.
- Use the black artwork on light surfaces and the white artwork on dark surfaces, including automatic support for the site’s light and dark themes.
- Replace the old star favicon with a centered, padded version of the new ZANKYO symbol, optimized for 16–32 px browser tabs.
- Keep navigation, page content, and all store behavior unchanged.

## Technical details
- Store the website logo images through the project’s optimized asset delivery flow.
- Keep the favicon as a real small file in the public site files and update the existing favicon reference.
- Add descriptive image text and stable responsive dimensions so the logo never clips, stretches, or crowds the mobile controls.

## Verification
- Check the header and footer on phone and laptop widths in both light and dark themes.
- Confirm the kanji and ZANKYO lettering remain sharp and readable without overlap.
- Open a fresh browser page and verify the new symbol appears correctly in the tab.
- Confirm the site builds successfully and introduces no new browser errors.
