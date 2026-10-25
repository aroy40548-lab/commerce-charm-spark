import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { inr } from "@/components/admin/ui";

type Point = { date: string; sales: number; orders: number };

const short = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const trim = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));
const compact = (n: number) => (n >= 100000 ? `₹${trim(n / 100000)}L` : n >= 1000 ? `₹${trim(n / 1000)}k` : `₹${n}`);

/** Single series (sales per day): the card title names it, so no legend. */
export function SalesChart({ data, height = 220 }: { data: Point[]; height?: number }) {
  return (
    <div style={{ height }} className="w-full text-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="zk-sales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.18} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="date" tickFormatter={short} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const p = active && payload?.[0]?.payload as Point | undefined;
              if (!p) return null;
              return (
                <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-md">
                  <p className="font-semibold">{short(p.date)}</p>
                  <p className="text-muted-foreground">Sales <span className="font-semibold text-foreground">{inr(p.sales)}</span></p>
                  <p className="text-muted-foreground">Orders <span className="font-semibold text-foreground">{p.orders}</span></p>
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey="sales" stroke="currentColor" strokeWidth={2} fill="url(#zk-sales)" isAnimationActive={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
