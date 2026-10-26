# Dark mode for the admin panel

## What changes
- The admin panel opens in **dark mode by default** for every staff member.
- A **sun/moon button** sits in the admin header (the sidebar on laptops, the top bar on phones). Any staff member can tap it to switch between dark and light.
- Each person's choice is remembered on their own device, so one staff member's choice doesn't change it for others.
- Everything in admin is checked in dark mode: sidebar, cards, tables, forms, charts, badges, pop-ups and the Social dashboard. Text stays easy to read and the ZANKYO logo switches to its light version.
- The storefront is not affected.

## Technical details
- `src/routes/admin.tsx`: wrap the admin layout in a `dark` class driven by a small `useAdminTheme` hook (`localStorage` key `zankyo-admin-theme`, default `"dark"`, read after hydration to avoid mismatch; an inline head script on admin routes applies it before paint to avoid a white flash).
- Toggle button (Sun/Moon icons) in `Sidebar` and the mobile header.
- Fix any hard-coded light colours in admin components (`SalesChart`, `ReelsDashboard`, `SocialAdmin`, `ui.tsx` badges) to use theme tokens so they work in both modes.
- Popups/sheets render in a portal outside the layout, so the `dark` class is also set on `<html>` while on admin routes and removed when leaving.
