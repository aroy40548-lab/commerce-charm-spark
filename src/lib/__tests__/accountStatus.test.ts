import { describe, expect, it } from "vitest";
import { canOrder, canRestrict, canUseReels, shownInReels } from "../accountStatus";

describe("account restrictions", () => {
  it("banned users can't order", () => {
    expect(canOrder("banned")).toBe(false);
    expect(canOrder("reel_suspended")).toBe(true);
  });
  it("suspended and banned users can't use reels", () => {
    expect(canUseReels("reel_suspended")).toBe(false);
    expect(canUseReels("banned")).toBe(false);
    expect(canUseReels("hidden")).toBe(true);
  });
  it("hidden creators don't show in the feed", () => {
    expect(shownInReels("hidden")).toBe(false);
    expect(shownInReels("active")).toBe(true);
  });
  it("store owners can't be banned", () => {
    expect(canRestrict(true, "banned")).toBe(false);
    expect(canRestrict(true, "active")).toBe(true);
    expect(canRestrict(false, "banned")).toBe(true);
  });
});
