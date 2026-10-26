import { describe, it, expect } from "vitest";
import { canEdit, canRestrictAccounts, type StaffSession } from "../admin/permissions";
const sm: StaffSession = { userId: "u", email: "s@z.in", name: "S", isOwner: false, roleName: "Social Manager", canEdit: ["community"] };
describe("Social Manager power", () => {
  it("can moderate reels and social", () => expect(canEdit(sm, "community")).toBe(true));
  it("can restrict accounts", () => expect(canRestrictAccounts(sm)).toBe(true));
  it("cannot approve affiliate commissions", () => expect(canEdit(sm, "marketing")).toBe(false));
  it("staff without either power cannot restrict accounts", () => expect(canRestrictAccounts({ ...sm, canEdit: ["orders"] })).toBe(false));
});
