// Sections of the admin panel a staff role can be allowed to change.
// Every staff member can *see* every section; editing needs the section here.
export const SECTIONS = [
  { key: "orders", label: "Orders", hint: "Fulfil, cancel, refund, drafts" },
  { key: "products", label: "Products", hint: "Products, collections, inventory, gift cards" },
  { key: "customers", label: "Customers", hint: "Customer notes and tags" },
  { key: "discounts", label: "Discounts", hint: "Discount codes" },
  { key: "marketing", label: "Marketing", hint: "Affiliates and commission approval" },
  { key: "reviews", label: "Reviews", hint: "Hide, reply to and delete reviews" },
  { key: "community", label: "Community", hint: "Social posts, chat reports and announcements" },
  { key: "content", label: "Content", hint: "Files and blog posts" },
  { key: "settings", label: "Settings", hint: "Shipping, payments, store details" },
  { key: "staff", label: "Staff", hint: "Invite staff and assign roles" },
] as const;

export type Section = (typeof SECTIONS)[number]["key"];
export const SECTION_KEYS = SECTIONS.map((s) => s.key) as Section[];

export interface StaffSession {
  userId: string;
  email: string;
  name: string;
  isOwner: boolean;
  roleName: string;
  canEdit: Section[];
}

export function canEdit(me: StaffSession | null | undefined, section: Section) {
  return !!me && (me.isOwner || me.canEdit.includes(section));
}
