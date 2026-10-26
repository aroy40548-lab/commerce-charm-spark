// Account restrictions set by staff in Admin → Customers / Reels.
export const ACCOUNT_STATUSES = [
  { value: "active", label: "Active", hint: "No restrictions" },
  { value: "hidden", label: "Hidden from reels", hint: "Reels and profile hidden from others; can still shop" },
  { value: "reel_suspended", label: "Suspended from reels", hint: "Can't post, like, comment or follow; reels hidden" },
  { value: "banned", label: "Banned from store", hint: "Can never place an order; also suspended from reels" },
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]["value"];

export const BANNED_MESSAGE = "Your account can't place orders. Contact help@zankyo.in.";
export const SUSPENDED_MESSAGE = "Your account is suspended from reels. Contact help@zankyo.in.";

export function canOrder(s: string | null | undefined) {
  return s !== "banned";
}
export function canUseReels(s: string | null | undefined) {
  return s !== "reel_suspended" && s !== "banned";
}
export function shownInReels(s: string | null | undefined) {
  return !s || s === "active";
}
/** Store owners can never be restricted. */
export function canRestrict(targetIsOwner: boolean, next: AccountStatus) {
  return next === "active" || !targetIsOwner;
}
