# Add Google site verification meta tag

## Goal
Verify ownership of zankyo.in in Google Search Console using the meta-tag method:
`<meta name="google-site-verification" content="vpNNwJQwqkJxgu2OF7QcfxJSgWxamHaHcCMN2Cw0AMo" />`

## Change
In `src/routes/__root.tsx`, inside the existing `head()` → `meta` array, add one entry:

```ts
{ name: "google-site-verification", content: "vpNNwJQwqkJxgu2OF7QcfxJSgWxamHaHcCMN2Cw0AMo" },
```

This tag must appear on every page's HTML, so the root head (which already holds sitewide defaults like charset, viewport, and og:type) is the correct place. No other routes change.

## Verification
- Typecheck (`bunx tsgo --noEmit`) and build pass.
- Playwright: load the preview, confirm the `<meta name="google-site-verification">` tag is present in the rendered `<head>` of the homepage.

## After approval (your step)
Publish the site — Google reads the tag from the live URL at https://zankyo.in, then click Verify in Search Console. The tag only reaches the live domain on the next publish.
