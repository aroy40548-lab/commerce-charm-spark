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

// ---------- Usernames & profiles ----------
export const USERNAME_RE = /^[a-z0-9._]{3,20}$/;
export function normalizeUsername(v: string) {
  return v.trim().toLowerCase().replace(/^@/, "");
}
export function usernameOk(v: string) {
  const u = normalizeUsername(v);
  return USERNAME_RE.test(u) && !u.startsWith(".") && !u.endsWith(".") && !u.includes("..");
}
export function profileComplete(p: { full_name?: string | null; username?: string | null } | null | undefined) {
  return !!p && !!p.full_name?.trim() && !!p.username && usernameOk(p.username);
}

// ---------- Feed mix ----------
/** Priority levels the admin can choose. 0 = hidden from feed. */
export const PRIORITIES = [
  { value: 0, label: "Hide from feed" },
  { value: 1, label: "Normal" },
  { value: 2, label: "Boost" },
  { value: 4, label: "Top" },
] as const;

/** How much more often a reel shows up in the shuffled feed. */
export function feedWeight(o: { followed: boolean; reelPriority: number; creatorPriority: number; ageHours: number }) {
  const push = Math.max(o.reelPriority, o.creatorPriority);
  if (o.reelPriority === 0 || o.creatorPriority === 0) return 0;
  let w = push;
  if (o.followed) w *= 3;
  if (o.ageHours < 48) w *= 1.5;
  return w;
}
