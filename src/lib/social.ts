// Shared, browser-safe rules for ZANKYO Social.
export const MAX_POST_PHOTOS = 10;
export const MAX_POST_PRODUCTS = 5;
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const PAGE_SIZE = 8;

/** How many of the picked photos fit, and whether some were dropped. */
export function fitPhotos(alreadyPicked: number, adding: number) {
  const room = Math.max(0, MAX_POST_PHOTOS - alreadyPicked);
  return { accept: Math.min(room, adding), dropped: Math.max(0, adding - room) };
}

/** Whether `sender` may message `recipient`. */
export function canMessage(opts: { senderStatus: string | null | undefined; blocked: boolean; recipientFollowersOnly: boolean; recipientFollowsSender: boolean }) {
  if (opts.senderStatus === "reel_suspended" || opts.senderStatus === "banned") return false;
  if (opts.blocked) return false;
  if (opts.recipientFollowersOnly && !opts.recipientFollowsSender) return false;
  return true;
}

/** Conversations store the two people in a fixed order. */
export function pairOf(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function notificationText(kind: string, onReel: boolean, body: string) {
  const what = onReel ? "reel" : "post";
  if (kind === "like") return `liked your ${what}.`;
  if (kind === "comment") return `commented: ${body}`;
  if (kind === "follow") return "started following you.";
  return body;
}

export function timeGroup(iso: string, now = Date.now()) {
  const d = now - Date.parse(iso);
  if (d < 864e5) return "Today";
  if (d < 7 * 864e5) return "This week";
  return "Earlier";
}

export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / (7 * 86400))}w`;
}

/** Shrink a photo in the browser so uploads and the feed stay fast. */
export async function compressImage(file: File, maxSide: number, quality = 0.82): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * scale);
  const height = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't read this photo"))), "image/webp", quality));
  return { blob, width, height };
}
