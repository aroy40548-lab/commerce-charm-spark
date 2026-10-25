export type AddressInput = {
  full_name: string; phone: string; address1: string; address2: string;
  city: string; state: string; pincode: string; country: string;
};

export const EMPTY_ADDRESS: AddressInput = {
  full_name: "", phone: "", address1: "", address2: "", city: "", state: "", pincode: "", country: "India",
};

const inputCls = "min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-foreground sm:text-sm";

const FIELDS = [
  ["full_name", "Full name"], ["phone", "Phone (10 digits)"], ["address1", "House no., street, area"],
  ["address2", "Landmark (optional)"], ["city", "City"], ["state", "State"], ["pincode", "PIN code"],
] as const;

export function AddressFields({ value, onChange }: { value: AddressInput; onChange: (v: AddressInput) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {FIELDS.map(([k, label]) => (
        <input
          key={k}
          required={k !== "address2"}
          placeholder={label}
          aria-label={label}
          inputMode={k === "phone" || k === "pincode" ? "numeric" : undefined}
          pattern={k === "pincode" ? "\\d{6}" : k === "phone" ? "\\d{10,13}" : undefined}
          value={value[k] ?? ""}
          onChange={(e) => onChange({ ...value, [k]: e.target.value })}
          className={`${inputCls} ${k === "address1" ? "sm:col-span-2" : ""}`}
        />
      ))}
    </div>
  );
}

export function formatAddress(a: Partial<AddressInput>) {
  return [a.address1, a.address2, a.city, a.state, a.pincode].filter(Boolean).join(", ");
}
