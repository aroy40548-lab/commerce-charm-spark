import { createContext, useContext, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { canEdit, type Section, type StaffSession } from "@/lib/admin/permissions";

export const inputCls = "min-h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-foreground disabled:bg-muted/50 disabled:text-muted-foreground sm:text-sm";
export const btn = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background active:opacity-80 disabled:opacity-50";
export const btnGhost = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium active:bg-muted disabled:opacity-50";
export const btnDanger = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-destructive/40 px-4 text-sm font-medium text-destructive active:bg-destructive/10 disabled:opacity-50";

// ---------- Staff session ----------
const StaffCtx = createContext<StaffSession | null>(null);
export const StaffProvider = StaffCtx.Provider;
export function useStaff() {
  const me = useContext(StaffCtx);
  if (!me) throw new Error("useStaff outside admin");
  return me;
}
export function useCanEdit(section: Section) {
  return canEdit(useContext(StaffCtx), section);
}

// ---------- Layout ----------
export function PageHeader({ title, back, action, subtitle }: { title: string; back?: string; action?: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        {back && (
          <Link to={back} className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-background" aria-label="Back">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
          {subtitle && <div className="mt-0.5 text-sm text-muted-foreground">{subtitle}</div>}
        </div>
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function Card({ children, className = "", title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return (
    <section className={`rounded-xl border border-border bg-background p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {children}
      </label>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={`flex min-h-10 items-center gap-3 text-sm ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <button
        type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? "bg-foreground" : "bg-muted-foreground/30"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
      {label}
    </label>
  );
}

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<[T, string]> }) {
  return (
    <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)}
          className={`min-h-9 shrink-0 whitespace-nowrap rounded-lg px-3 text-sm ${value === v ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  paid: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
  confirmed: "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200",
  shipped: "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-200",
  delivered: "bg-foreground text-background",
  cancelled: "bg-muted text-muted-foreground line-through",
  refunded: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200",
  active: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
  draft: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
  approved: "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200",
  rejected: "bg-muted text-muted-foreground line-through",
  suspended: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200",
};
const STATUS_LABEL: Record<string, string> = { confirmed: "COD · to ship", paid: "Paid · to ship", pending: "Unpaid" };

export function StatusBadge({ status, label }: { status: string; label?: string | undefined }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[status] ?? "bg-muted"}`}>{label ?? STATUS_LABEL[status] ?? status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

export function ReadOnlyNote({ section }: { section: Section }) {
  if (useCanEdit(section)) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
      <Eye className="h-4 w-4 shrink-0" /> View only — your role can see this page but can't change it.
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">{children}</div>;
}

export function Spinner() {
  return <div className="grid min-h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

/** Runs an admin change with a busy flag, toast and cache refresh. */
export function useAction() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async <T,>(key: string, fn: () => Promise<T>, success?: string, invalidate: string[] = []): Promise<T | undefined> => {
    setBusy(key);
    try {
      const r = await fn();
      if (success) toast.success(success);
      await Promise.all(invalidate.map((k) => qc.invalidateQueries({ queryKey: [k] })));
      return r;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      return undefined;
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}

export function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export const inr = (n: number | string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n));
export const dateTime = (s: string) => new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const dateOnly = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
