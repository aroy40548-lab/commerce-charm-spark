import { describe, it, expect } from "vitest";
import { toThreads } from "../commentThreads";

const c = (id: string, parentId: string | null, t: string) => ({ id, parentId, createdAt: `2026-10-26T${t}:00Z` });

describe("comment replies", () => {
  it("puts replies under their comment, oldest first", () => {
    const t = toThreads([c("a", null, "10:00"), c("r2", "a", "10:20"), c("r1", "a", "10:10")]);
    expect(t).toHaveLength(1);
    expect(t[0]!.replies.map((r) => r.id)).toEqual(["r1", "r2"]);
  });
  it("shows a reply whose comment was removed as a normal comment", () => {
    expect(toThreads([c("r", "gone", "10:00")]).map((x) => x.id)).toEqual(["r"]);
  });
});
