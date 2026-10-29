// Size chart stored on a product. Values are kept in the unit the admin typed;
// the storefront converts on the fly (1 in = 2.54 cm).
export type SizeUnit = "in" | "cm";
export type SizeChart = {
  unit: SizeUnit;
  columns: string[]; // e.g. ["Chest", "Length", "Shoulder"]
  rows: Array<{ size: string; values: Array<number | null> }>;
  note?: string;
};

export const CM_PER_INCH = 2.54;

export function convert(value: number, from: SizeUnit, to: SizeUnit): number {
  if (from === to) return value;
  const v = from === "in" ? value * CM_PER_INCH : value / CM_PER_INCH;
  return Math.round(v * 10) / 10;
}

export function parseSizeChart(raw: unknown): SizeChart | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<SizeChart>;
  if (!Array.isArray(c.columns) || !Array.isArray(c.rows) || !c.rows.length) return null;
  return {
    unit: c.unit === "cm" ? "cm" : "in",
    columns: c.columns.map(String).slice(0, 8),
    rows: c.rows.slice(0, 20).map((r) => ({
      size: String(r?.size ?? ""),
      values: (Array.isArray(r?.values) ? r.values : []).map((v) => (typeof v === "number" && isFinite(v) ? v : null)),
    })),
    note: c.note ? String(c.note).slice(0, 500) : undefined,
  };
}
