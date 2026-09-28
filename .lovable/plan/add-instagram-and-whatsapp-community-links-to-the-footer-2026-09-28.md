# Add Instagram and WhatsApp community links to the footer

## What will change

- Add two clickable links at the end (bottom) of every storefront page, in the footer:
  - **Instagram** → `https://www.instagram.com/wearzankyo?stkn=Zmx2ZjA3YmtqbQ%3D%3D&utm_source=qr`
  - **WhatsApp community** → `https://chat.whatsapp.com/JGEqcXoZEsi5NYc9hVBRqI`
- Each link opens in a new tab at the exact destination (Instagram profile / WhatsApp community join page).

## Presentation

- Show them as an icon + label row in the footer (Instagram and WhatsApp icons, matching the black-and-white ZANKYO style), placed after the three existing footer columns and above the copyright line.
- Comfortable mobile tap size, consistent with the existing footer links.

## Technical details

- Edit `src/components/Footer.tsx`: add an external-links row using the existing Lucide icon set, with `target="_blank"` and `rel="noopener noreferrer"`.
- Add `aria-label` on each link for accessibility.
- No changes to navigation, commerce, accounts, or any other page.
- Verify the links render and are clickable on mobile and laptop widths, and the preview remains error-free.
