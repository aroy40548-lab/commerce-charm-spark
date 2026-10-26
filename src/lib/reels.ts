// Shared, browser-safe reel rules.
export const MAX_REEL_SECONDS = 59;
export const MAX_REEL_BYTES = 50 * 1024 * 1024;
export const REEL_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;

export function reelLengthOk(seconds: number) {
  return Number.isFinite(seconds) && seconds > 0 && seconds <= MAX_REEL_SECONDS + 0.5;
}

/** Public display name — never an email address. */
export function publicName(p: { first_name?: string | null; last_name?: string | null; username?: string | null }) {
  const first = p.first_name?.trim();
  if (first && !first.includes("@")) {
    const last = p.last_name?.trim();
    return last && !last.includes("@") ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
  }
  const u = p.username?.trim();
  if (u && !u.includes("@")) return u;
  return "ZANKYO member";
}

/** Product link that credits an affiliate. */
export function productAffiliateLink(origin: string, handle: string, code: string) {
  return `${origin}/product/${encodeURIComponent(handle)}?ref=${encodeURIComponent(code)}`;
}

export function reelLink(origin: string, id: string, code: string | null) {
  return `${origin}/reels/${id}${code ? `?ref=${encodeURIComponent(code)}` : ""}`;
}

/** Read a local video file's length in seconds (browser only). */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    const url = URL.createObjectURL(file);
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration); };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read this video")); };
    v.src = url;
  });
}
