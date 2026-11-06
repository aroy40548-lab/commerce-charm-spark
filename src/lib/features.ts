/** Site-wide on/off switches, edited in Admin → Settings → Features. Missing keys default to ON. */
export const FEATURES = [
  { key: "ai_photo_tryon", label: "AI photo fitting", hint: "\"Try instant photo fitting\" on product pages (uses Gemini)." },
  { key: "decart_tryon", label: "Live try-on (Decart)", hint: "The Try-On button on shop and product pages." },
  { key: "social", label: "ZANKYO Social", hint: "Feed, posts, profiles, chats and notifications." },
  { key: "reels", label: "Reels", hint: "Reels feed and posting new reels." },
  { key: "affiliates", label: "Affiliate Partner program", hint: "Partner page, links and commissions." },
  { key: "drops", label: "Drops & Vault", hint: "Upcoming drops page with countdown." },
  { key: "reviews", label: "Product reviews", hint: "Reviews on product pages." },
  { key: "android_app", label: "Android app download", hint: "Download button in the footer." },
] as const;
export type FeatureKey = (typeof FEATURES)[number]["key"];
export type Features = Record<FeatureKey, boolean>;

export function mergeFeatures(raw: unknown): Features {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return Object.fromEntries(FEATURES.map((f) => [f.key, r[f.key] !== false])) as Features;
}

/** Which switch controls a page path, if any. */
export function featureForPath(p: string): FeatureKey | null {
  if (p === "/reels" || p.startsWith("/reels/")) return "reels";
  if (p === "/social" || p.startsWith("/social/") || p.startsWith("/u/") || p.startsWith("/p/") || p === "/search") return "social";
  if (p === "/affiliate" || p.startsWith("/affiliate/")) return "affiliates";
  if (p === "/drops") return "drops";
  return null;
}
