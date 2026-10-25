import { trackAffiliateClick } from "@/lib/affiliate.functions";

const KEY = "zankyo-ref";

/** Remembers `?ref=CODE` from an affiliate link so the next order credits that affiliate. */
export function captureReferral(days = 30) {
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("ref")?.trim().toUpperCase();
    if (!code || !/^[A-Z0-9_-]{3,24}$/.test(code)) return;
    const prev = readReferral();
    localStorage.setItem(KEY, JSON.stringify({ code, until: Date.now() + days * 86_400_000 }));
    if (prev !== code) void trackAffiliateClick({ data: { code } }).catch(() => {});
    url.searchParams.delete("ref");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch {
    // Storage blocked — the link still works, the sale just won't be credited.
  }
}

export function readReferral(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as { code: string; until: number } | null;
    return v && v.until > Date.now() ? v.code : null;
  } catch {
    return null;
  }
}
