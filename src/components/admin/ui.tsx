import type { ReactNode } from "react";

export const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
export const btn = "zk-label inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-[11px] text-background disabled:opacity-50";
export const btnGhost = "zk-label inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-[11px] disabled:opacity-50";

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="zk-display text-3xl">{title}</h1>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-border bg-background p-5 ${className}`}>{children}</div>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  paid: "bg-accent/15 text-accent",
  shipped: "bg-foreground/10 text-foreground",
  delivered: "bg-foreground text-background",
  cancelled: "bg-destructive/15 text-destructive",
  refunded: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`zk-label rounded-full px-2 py-0.5 text-[10px] ${STATUS_COLORS[status] ?? "bg-muted"}`}>{status}</span>;
}
