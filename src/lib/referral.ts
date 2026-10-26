import { trackAffiliateClick } from "@/lib/affiliate.functions";

const KEY = "zankyo-ref";

export interface Referral { code: string; products: string[]; reelId: string | null; until: number; at?: number }

/** Reads where an affiliate link points: a product page or a reel. */
export function referralTarget(pathname: string): { product: string | null; reel: string | null } {
  const p = pathname.match(/^\/product\/([^/?#]+)/);
  const r = pathname.match(/^\/reels\/([0-9a-f-]{36})/i);
  return { product: p ? decodeURIComponent(p[1]!) : null, reel: r ? r[1]!.toLowerCase() : null };
}

/** Merge a newly opened affiliate link into what's already remembered. */
export function mergeReferral(prev: Referral | null, code: string, target: { product: string | null; reel: string | null }, until: number): Referral {
  const same = prev && prev.code === code;
  const products = same ? [...prev.products] : [];
  if (target.product && !products.includes(target.product)) products.push(target.product);
  return { code, products: products.slice(-20), reelId: target.reel ?? (same ? prev.reelId : null), until, at: Date.now() };
}

/** Remembers `?ref=CODE` from an affiliate product/reel link so the next order credits that affiliate. */
export function captureReferral(days = 365) {
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("ref")?.trim().toUpperCase();
    if (!code || !/^[A-Z0-9_-]{3,24}$/.test(code)) return;
    const prev = readReferralFull();
    const next = mergeReferral(prev, code, referralTarget(url.pathname), Date.now() + days * 86_400_000);
    localStorage.setItem(KEY, JSON.stringify(next));
    if (prev?.code !== code || next.products.length !== prev.products.length) void trackAffiliateClick({ data: { code } }).catch(() => {});
    url.searchParams.delete("ref");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch {
    // Storage blocked — the link still works, the sale just won't be credited.
  }
}

export function readReferralFull(): Referral | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Referral> | null;
    if (!v || !v.code || !v.until || v.until <= Date.now()) return null;
    return { code: v.code, products: Array.isArray(v.products) ? v.products : [], reelId: v.reelId ?? null, until: v.until, at: v.at ?? v.until - 30 * 86_400_000 };
  } catch {
    return null;
  }
}

export function readReferral(): string | null {
  return readReferralFull()?.code ?? null;
}
