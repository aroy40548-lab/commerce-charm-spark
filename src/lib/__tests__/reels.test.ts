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
