import { describe, expect, it } from "vitest";
import { buildTryOnPrompt, detectZone } from "../tryon";

describe("try-on zone", () => {
  it("pants swap only the lower garment", () => {
    expect(detectZone({ title: "Kanji Cargo Pants" })).toBe("bottom");
    expect(buildTryOnPrompt("bottom", "x", "M")).toContain("LOWER GARMENT ONLY");
  });
  it("tees swap only the upper garment", () => {
    expect(detectZone({ title: "Oversized Tee", productType: "T-Shirts" })).toBe("top");
  });
});
