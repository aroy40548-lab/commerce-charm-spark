import { describe, expect, it } from "vitest";
import { convert } from "../sizeChart";

describe("size chart unit conversion", () => {
  it("converts inches to cm", () => expect(convert(40, "in", "cm")).toBe(101.6));
  it("converts cm to inches", () => expect(convert(101.6, "cm", "in")).toBe(40));
  it("keeps same unit", () => expect(convert(22, "in", "in")).toBe(22));
});
