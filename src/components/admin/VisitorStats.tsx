import { useQuery } from "@tanstack/react-query";
import { adminVisitorStats } from "@/lib/presence.functions";
import { Card, Spinner } from "@/components/admin/ui";

const LABEL: Record<string, string> = { "24h": "24 hours", "7d": "7 days", "30d": "30 days", "90d": "3 months", "365d": "1 year" };

/** Visitors with an account vs without, over several time windows. */
export function VisitorStats() {
  const q = useQuery({ queryKey: ["admin-visitor-stats"], queryFn: () => adminVisitorStats() });
  return (
    <Card className="mb-4" title="Website visitors">
      {!q.data ? <Spinner /> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {q.data.map((r) => (
            <div key={r.period} className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{LABEL[r.period] ?? r.period}</p>
              <p className="mt-1 text-2xl font-semibold">{r.accounts + r.guests}</p>
              <p className="text-xs text-muted-foreground">{r.accounts} with account · {r.guests} no account</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
