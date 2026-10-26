import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ACCOUNT_STATUSES, type AccountStatus } from "@/lib/accountStatus";
import { adminGetAccountStatus, adminSetAccountStatus } from "@/lib/admin/accounts.functions";
import { Card, Field, btn, dateTime, inputCls, useAction, useCanEdit } from "@/components/admin/ui";

export function AccountStatusCard({ userId }: { userId: string }) {
  const q = useQuery({ queryKey: ["admin-account-status", userId], queryFn: () => adminGetAccountStatus({ data: { userId } }) });
  const canEdit = useCanEdit("customers");
  const { busy, run } = useAction();
  const [status, setStatus] = useState<AccountStatus>("active");
  const [reason, setReason] = useState("");
  useEffect(() => { if (q.data) setStatus(q.data.status as AccountStatus); }, [q.data]);
  if (!q.data) return <Card title="Account access"><Loader2 className="h-4 w-4 animate-spin" /></Card>;
  const current = ACCOUNT_STATUSES.find((s) => s.value === q.data.status);

  return (
    <Card title="Account access">
      <p className="text-sm">
        Now: <b className={q.data.status === "active" ? "" : "text-destructive"}>{current?.label ?? q.data.status}</b>
        {q.data.reason && <span className="text-muted-foreground"> — {q.data.reason}</span>}
      </p>
      <form className="mt-3 space-y-3" onSubmit={(e) => {
        e.preventDefault();
        void run("status", () => adminSetAccountStatus({ data: { userId, status, reason } }), "Account updated", ["admin-account-status", "admin-reels-dash"]).then(() => setReason(""));
      }}>
        <fieldset disabled={!canEdit} className="space-y-3">
          <Field label="Set access">
            <select value={status} onChange={(e) => setStatus(e.target.value as AccountStatus)} className={inputCls}>
              {ACCOUNT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <p className="text-xs text-muted-foreground">{ACCOUNT_STATUSES.find((s) => s.value === status)?.hint}</p>
          {status !== "active" && <Field label="Reason (required)"><input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} /></Field>}
          {canEdit && <button disabled={!!busy || status === q.data.status} className={btn}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>}
        </fieldset>
      </form>
      {q.data.history.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
          {q.data.history.map((h) => (
            <li key={h.id}>{dateTime(h.created_at)} · <b className="text-foreground">{ACCOUNT_STATUSES.find((s) => s.value === h.status)?.label ?? h.status}</b> by {h.actor}{h.reason ? ` — ${h.reason}` : ""}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
