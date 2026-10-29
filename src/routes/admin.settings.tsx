import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Crown, Loader2, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { adminDeleteRole, adminGetSettings, adminInviteStaff, adminListStaff, adminSaveRole, adminSaveSettings, adminUpdateStaff } from "@/lib/admin/settings.functions";
import { AndroidAppCard } from "@/components/admin/AndroidAppCard";
import { SECTIONS, type Section } from "@/lib/admin/permissions";
import { Card, Field, PageHeader, ReadOnlyNote, Spinner, StatusBadge, Tabs, Toggle, btn, btnGhost, dateTime, inputCls, useAction, useCanEdit, useStaff } from "@/components/admin/ui";

type Tab = "store" | "shipping" | "affiliates" | "staff" | "integrations";
export const Route = createFileRoute("/admin/settings")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab | undefined } => ({
    tab: ["store", "shipping", "affiliates", "staff", "integrations"].includes(String(s["tab"])) ? (s["tab"] as Tab) : undefined,
  }),
  component: Settings,
});

function Settings() {
  const { tab = "store" } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/settings" });
  return (
    <div>
      <PageHeader title="Settings" />
      <Tabs value={tab} onChange={(t) => navigate({ search: { tab: t === "store" ? undefined : t } })}
        options={[["store", "Store details"], ["shipping", "Shipping & payments"], ["affiliates", "Affiliate program"], ["staff", "Staff & roles"], ["integrations", "Connections"]]} />
      {tab === "staff" ? <Staff /> : <StoreSettings tab={tab} />}
      {tab === "store" && <div className="mt-6"><AndroidAppCard /></div>}
    </div>
  );
}

type S = Awaited<ReturnType<typeof adminGetSettings>>["settings"];

function StoreSettings({ tab }: { tab: Exclude<Tab, "staff"> }) {
  const q = useQuery({ queryKey: ["admin-settings"], queryFn: () => adminGetSettings() });
  const canEdit = useCanEdit("settings");
  const { busy, run } = useAction();
  const [s, setS] = useState<S | null>(null);
  useEffect(() => { if (q.data) setS(q.data.settings); }, [q.data]);
  if (!s || !q.data) return <Spinner />;
  const set = <K extends keyof S>(k: K, v: S[K]) => setS({ ...s, [k]: v });
  const n = (k: keyof S) => ({ type: "number" as const, value: String(s[k] ?? ""), onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value) as never), className: inputCls });

  if (tab === "integrations") {
    const i = q.data.integrations;
    const rows: Array<[boolean, string, string]> = [
      [i.razorpay, "Razorpay payments", "Lovable → Cloud → Secrets: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (Razorpay Dashboard → Account & Settings → API keys)."],
      [i.razorpayWebhook, "Razorpay webhook", "Razorpay → Webhooks → add https://zankyo.in/api/public/razorpay-webhook (payment.captured, order.paid), then save its secret as RAZORPAY_WEBHOOK_SECRET."],
      [i.shiprocket, "Shiprocket shipping", "Shiprocket → Settings → API → create an API user; save SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD. Without it, enter tracking by hand."],
      [i.email, "Order emails", "Lovable Cloud → Emails with the notify.zankyo.in domain."],
    ];
    return (
      <Card>
        <ul className="divide-y divide-border">
          {rows.map(([ok, name, how]) => (
            <li key={name} className="flex gap-3 py-3 text-sm">
              {ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <XCircle className="h-5 w-5 shrink-0 text-muted-foreground" />}
              <div><p className="font-medium">{name} — {ok ? "connected" : "not connected"}</p>{!ok && <p className="text-xs text-muted-foreground">{how}</p>}</div>
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const { id: _i, updated_at: _u, ...rest } = s;
      void run("save", () => adminSaveSettings({ data: { ...rest, shipping_fee: Number(rest.shipping_fee), free_shipping_over: Number(rest.free_shipping_over), express_shipping_fee: Number(rest.express_shipping_fee), cod_fee: Number(rest.cod_fee), package_weight_kg: Number(rest.package_weight_kg), affiliate_rate: Number(rest.affiliate_rate) } }), "Settings saved", ["admin-settings", "checkout-config", "affiliate-program"]);
    }}>
      <ReadOnlyNote section="settings" />
      <fieldset disabled={!canEdit} className="space-y-4">
        {tab === "store" && (
          <Card title="Store details">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Store name"><input value={s.store_name} onChange={(e) => set("store_name", e.target.value)} className={inputCls} /></Field>
              <Field label="Support email"><input type="email" value={s.support_email} onChange={(e) => set("support_email", e.target.value)} className={inputCls} /></Field>
              <Field label="Low-stock warning at" hint="Sizes at or below this count show as low stock"><input min={0} {...n("low_stock_threshold")} /></Field>
            </div>
          </Card>
        )}
        {tab === "shipping" && (
          <>
            <Card title="Standard shipping">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Name shown at checkout"><input value={s.standard_label} onChange={(e) => set("standard_label", e.target.value)} className={inputCls} /></Field>
                <Field label="Price (₹)"><input min={0} {...n("shipping_fee")} /></Field>
                <Field label="Free over (₹)" hint="0 = never free"><input min={0} {...n("free_shipping_over")} /></Field>
              </div>
            </Card>
            <Card title="Express shipping">
              <Toggle checked={s.express_enabled} onChange={(v) => set("express_enabled", v)} label="Offer express shipping" />
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Field label="Name shown at checkout"><input value={s.express_label} onChange={(e) => set("express_label", e.target.value)} className={inputCls} /></Field>
                <Field label="Price (₹)"><input min={0} {...n("express_shipping_fee")} /></Field>
              </div>
            </Card>
            <Card title="Payments">
              <Toggle checked={s.cod_enabled} onChange={(v) => set("cod_enabled", v)} label="Accept cash on delivery" />
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Field label="COD fee (₹)"><input min={0} {...n("cod_fee")} /></Field>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Online payments (UPI, cards) turn on automatically once Razorpay keys are added — see Connections.</p>
            </Card>
            <Card title="Shiprocket">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Pickup location name" hint="Exactly as named in Shiprocket"><input value={s.pickup_location} onChange={(e) => set("pickup_location", e.target.value)} className={inputCls} /></Field>
                <Field label="Package weight (kg)"><input step="0.01" min={0.01} {...n("package_weight_kg")} /></Field>
              </div>
            </Card>
          </>
        )}
        {tab === "affiliates" && (
          <Card title="Affiliate program">
            <Toggle checked={s.affiliates_enabled} onChange={(v) => set("affiliates_enabled", v)} label="Let people join and earn" />
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Field label="Commission (%)" hint="Of the order value after discounts, before shipping"><input step="0.5" min={0} max={50} {...n("affiliate_rate")} /></Field>
              <Field label="Link stays valid for (days)"><input min={1} max={365} {...n("affiliate_cookie_days")} /></Field>
            </div>
          </Card>
        )}
        {canEdit && <button disabled={!!busy} className={btn}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>}
      </fieldset>
    </form>
  );
}

function Staff() {
  const me = useStaff();
  const q = useQuery({ queryKey: ["admin-staff"], queryFn: () => adminListStaff() });
  const canEdit = useCanEdit("staff");
  const { busy, run } = useAction();
  const [invite, setInvite] = useState<{ email: string; name: string; role_id: string } | null>(null);
  const [role, setRole] = useState<{ id?: string; name: string; description: string; permissions: Section[] } | null>(null);
  if (!q.data) return <Spinner />;
  const { roles, members, owners } = q.data;

  return (
    <div className="space-y-4">
      <ReadOnlyNote section="staff" />
      <Card title="Team" action={canEdit && !invite && <button onClick={() => setInvite({ email: "", name: "", role_id: roles[0]?.id ?? "" })} className={btn}><Plus className="h-4 w-4" /> Add staff</button>}>
        <p className="mb-3 text-xs text-muted-foreground">Everyone on the team can <b>see</b> every page. They can only <b>change</b> the sections their role allows.</p>
        {invite && (
          <form className="mb-4 grid gap-3 rounded-lg bg-muted/50 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={async (e) => { e.preventDefault(); if (await run("inv", () => adminInviteStaff({ data: { ...invite, role_id: invite.role_id || null } }), "Added — they can sign in with that email now", ["admin-staff"])) setInvite(null); }}>
            <Field label="Email"><input required type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} className={inputCls} /></Field>
            <Field label="Name"><input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} className={inputCls} /></Field>
            <Field label="Role">
              <select value={invite.role_id} onChange={(e) => setInvite({ ...invite, role_id: e.target.value })} className={inputCls}>
                <option value="">View only</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <div className="flex items-end gap-2">
              <button disabled={!!busy} className={btn}>Add</button>
              <button type="button" onClick={() => setInvite(null)} className={btnGhost}>Cancel</button>
            </div>
          </form>
        )}
        <ul className="divide-y divide-border">
          {owners.map((o) => (
            <li key={o.id} className="flex items-center gap-3 py-3 text-sm">
              <Crown className="h-4 w-4 text-amber-600" />
              <span className="min-w-0 flex-1"><b>{o.name || o.email}</b><br /><span className="text-xs text-muted-foreground">{o.email}</span></span>
              <span className="text-xs text-muted-foreground">Store owner · full access</span>
            </li>
          ))}
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <span className="min-w-0 flex-1">
                <b>{m.name || m.email}</b> {m.user_id === me.userId && <span className="text-xs text-muted-foreground">(you)</span>}
                <br /><span className="text-xs text-muted-foreground">{m.email} · {m.user_id ? (m.last_seen_at ? `last active ${dateTime(m.last_seen_at)}` : "joined") : "hasn't signed in yet"}</span>
              </span>
              <select disabled={!canEdit || !!busy} value={m.role_id ?? ""} aria-label="Role" onChange={(e) => void run("role", () => adminUpdateStaff({ data: { id: m.id, role_id: e.target.value || null } }), "Role updated", ["admin-staff", "admin-me"])} className={`${inputCls} w-44`}>
                <option value="">View only</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {!m.active && <StatusBadge status="suspended" label="Disabled" />}
              {canEdit && (
                <>
                  <button disabled={!!busy} onClick={() => void run("act", () => adminUpdateStaff({ data: { id: m.id, active: !m.active } }), m.active ? "Access paused" : "Access restored", ["admin-staff"])} className="text-xs underline">{m.active ? "Disable" : "Enable"}</button>
                  <button disabled={!!busy} aria-label="Remove" onClick={() => { if (confirm(`Remove ${m.email} from the team?`)) void run("rm", () => adminUpdateStaff({ data: { id: m.id, remove: true } }), "Removed", ["admin-staff"]); }} className="grid h-9 w-9 place-items-center text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
                </>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Roles" action={canEdit && !role && <button onClick={() => setRole({ name: "", description: "", permissions: [] })} className={btnGhost}><Plus className="h-4 w-4" /> New role</button>}>
        {role && (
          <form className="mb-4 space-y-3 rounded-lg bg-muted/50 p-3" onSubmit={async (e) => { e.preventDefault(); if (await run("role-save", () => adminSaveRole({ data: role }), "Role saved", ["admin-staff", "admin-me"])) setRole(null); }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Role name"><input required value={role.name} onChange={(e) => setRole({ ...role, name: e.target.value })} placeholder="Packing team" className={inputCls} /></Field>
              <Field label="Description"><input value={role.description} onChange={(e) => setRole({ ...role, description: e.target.value })} className={inputCls} /></Field>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Can change:</p>
            <div className="grid gap-1 sm:grid-cols-2">
              {SECTIONS.map((sec) => (
                <label key={sec.key} className="flex min-h-10 cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-background">
                  <input type="checkbox" className="mt-1" checked={role.permissions.includes(sec.key)} onChange={(e) => setRole({ ...role, permissions: e.target.checked ? [...role.permissions, sec.key] : role.permissions.filter((p) => p !== sec.key) })} />
                  <span><span className="font-medium">{sec.label}</span><br /><span className="text-xs text-muted-foreground">{sec.hint}</span></span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button disabled={!!busy} className={btn}>Save role</button>
              <button type="button" onClick={() => setRole(null)} className={btnGhost}>Cancel</button>
            </div>
          </form>
        )}
        <ul className="divide-y divide-border">
          {roles.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-3 text-sm">
              <span className="min-w-0 flex-1">
                <b>{r.name}</b> <span className="text-xs text-muted-foreground">· {members.filter((m) => m.role_id === r.id).length} people</span>
                <br /><span className="text-xs text-muted-foreground">Can change: {r.permissions.length ? r.permissions.map((p) => SECTIONS.find((s) => s.key === p)?.label ?? p).join(", ") : "nothing (view only)"}</span>
              </span>
              {canEdit && (
                <>
                  <button aria-label="Edit role" onClick={() => setRole({ id: r.id, name: r.name, description: r.description, permissions: r.permissions as Section[] })} className="grid h-9 w-9 place-items-center text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                  <button aria-label="Delete role" onClick={() => { if (confirm(`Delete the "${r.name}" role? People with it become view-only.`)) void run("rd", () => adminDeleteRole({ data: { id: r.id } }), "Role deleted", ["admin-staff"]); }} className="grid h-9 w-9 place-items-center text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
                </>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
