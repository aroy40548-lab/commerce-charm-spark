# Update AI try-on widget domain + add usage hint

## What changes

1. **Widget script domain** — In `src/routes/__root.tsx` (line 99), replace the Decart Anywear script URL:
   - From: `https://anywear.decart.ai/widget/latest/anywear.js?domain=latency-rho.vercel.app`
   - To: `https://anywear.decart.ai/widget/latest/anywear.js?domain=zankyo.in`

2. **Usage hint** — In `src/routes/product.$handle.tsx`, under the "Virtual try-on (AI)" button, add a small muted helper line: "Use a laptop or computer for the best experience."

No other files reference the old domain or the try-on button (verified by search).

## Verification

- Typecheck passes (no build errors).
- Product page shows the hint under the try-on button.
