import { describe, expect, it } from "vitest";
import { publicName, reelLengthOk } from "@/lib/reels";
import { mergeReferral, referralTarget } from "@/lib/referral";

describe("reel rules", () => {
  it("accepts reels up to 59 seconds and rejects longer ones", () => {
    expect(reelLengthOk(59)).toBe(true);
    expect(reelLengthOk(75)).toBe(false);
  });
  it("never shows an email as the public name", () => {
    expect(publicName({ first_name: null, last_name: null, username: "a@b.com" })).toBe("ZANKYO member");
    expect(publicName({ first_name: "Biswajit", last_name: "Roy" })).toBe("Biswajit R.");
  });
});

describe("product-link referrals", () => {
  it("remembers the product the affiliate link pointed to", () => {
    const r = mergeReferral(null, "RIYA123", referralTarget("/product/chaos-skull-tee"), 1);
    expect(r.products).toEqual(["chaos-skull-tee"]);
  });
  it("a different affiliate's link replaces the old products", () => {
    const a = mergeReferral(null, "A111", referralTarget("/product/x"), 1);
    const b = mergeReferral(a, "B222", referralTarget("/product/y"), 1);
    expect(b.products).toEqual(["y"]);
  });
});

import { feedWeight, usernameOk } from "@/lib/reels";
describe("usernames", () => {
  it("allows lowercase letters, numbers, dot and underscore, 3-20 long", () => {
    expect(usernameOk("biswajit_roy")).toBe(true);
    expect(usernameOk("ab")).toBe(false);
    expect(usernameOk("has space")).toBe(false);
    expect(usernameOk("a@b.com")).toBe(false);
  });
});
describe("feed weights", () => {
  const base = { followed: false, reelPriority: 1, creatorPriority: 1, ageHours: 100 };
  it("followed creators show 3x more", () => expect(feedWeight({ ...base, followed: true })).toBe(3));
  it("Boost is 2x and Top is 4x", () => {
    expect(feedWeight({ ...base, reelPriority: 2 })).toBe(2);
    expect(feedWeight({ ...base, creatorPriority: 4 })).toBe(4);
  });
  it("hidden never shows", () => expect(feedWeight({ ...base, creatorPriority: 0, followed: true })).toBe(0));
});
