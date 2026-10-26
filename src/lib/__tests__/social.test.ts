import { describe, expect, it } from "vitest";
import { MAX_POST_PHOTOS, canMessage, fitPhotos, pairOf } from "@/lib/social";

describe("photo posts", () => {
  it("allow at most 10 photos per post", () => {
    expect(MAX_POST_PHOTOS).toBe(10);
    expect(fitPhotos(0, 12)).toEqual({ accept: 10, dropped: 2 });
    expect(fitPhotos(8, 5)).toEqual({ accept: 2, dropped: 3 });
    expect(fitPhotos(10, 1)).toEqual({ accept: 0, dropped: 1 });
  });
});

describe("messages", () => {
  const base = { senderStatus: "active", blocked: false, recipientFollowersOnly: false, recipientFollowsSender: false };
  it("anyone active can message by default", () => expect(canMessage(base)).toBe(true));
  it("suspended and banned accounts cannot message", () => {
    expect(canMessage({ ...base, senderStatus: "reel_suspended" })).toBe(false);
    expect(canMessage({ ...base, senderStatus: "banned" })).toBe(false);
  });
  it("blocked people cannot message", () => expect(canMessage({ ...base, blocked: true })).toBe(false));
  it("followers-only inbox needs the recipient to follow the sender", () => {
    expect(canMessage({ ...base, recipientFollowersOnly: true })).toBe(false);
    expect(canMessage({ ...base, recipientFollowersOnly: true, recipientFollowsSender: true })).toBe(true);
  });
  it("a chat pair is the same either way", () => expect(pairOf("b", "a")).toEqual(pairOf("a", "b")));
});
