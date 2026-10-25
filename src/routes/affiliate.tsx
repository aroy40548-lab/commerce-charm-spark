import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2, Loader2, Share2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { SignInPanel } from "@/components/SignInPanel";
import { useAuth } from "@/hooks/useAuth";
import { getAffiliateProgram, getMyAffiliate, joinAffiliate, updateMyPayout } from "@/lib/affiliate.functions";
import { formatMoney } from "@/lib/catalog";

export const Route = createFileRoute("/affiliate")({
  head: () => ({
    meta: [
      { title: "Affiliate program — ZANKYO" },
      { name: "description", content: "Share your ZANKYO link and earn commission on every order your friends place." },
      { property: "og:title", content: "Earn with ZANKYO" },
      { property: "og:description", content: "Share your link, earn commission on every order." },
    ],
  }),
  component: AffiliatePage,
});

const STATUS: Record<string, string> = { pending: "Waiting for approval", approved: "Approved", paid: "Paid out", rejected: "Not eligible" };

function AffiliatePage() {
  const { user, loading } = useAuth();
  const program = useQuery({ queryKey: ["affiliate-program"], queryFn: () => getAffiliateProgram() });
  const rate = program.data?.rate ?? 5;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 sm:py-12">
      <p className="zk-label text-[11px] text-muted-foreground">ZANKYO affiliates</p>
      <h1 className="zk-display mt-2 text-4xl sm:text-5xl">Share the drop. Earn {rate}%.</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        Get your own link. When someone buys through it, you earn {rate}% of their order value (after discounts, before shipping).
        Commissions are approved by the ZANKYO team once the order is confirmed, then paid to your UPI.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          [Link2, "Get your link", "One tap, it's yours."],
          [Share2, "Share it", "Stories, groups, DMs — anywhere."],
          [Wallet, "Get paid", `${rate}% of every order, straight to UPI.`],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof Link2;
          return (
            <div key={t as string} className="rounded-2xl bg-muted/60 p-4">
              <I className="h-5 w-5" />
              <p className="mt-2 text-sm font-semibold">{t as string}</p>
              <p className="text-xs text-muted-foreground">{d as string}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : !user ? (
          <div className="mx-auto max-w-md rounded-2xl border border-border p-5">
            <p className="mb-4 text-sm font-semibold">Sign in to get your link</p>
            <SignInPanel />
          </div>
        ) : program.data && !program.data.enabled ? (
          <p className="text-sm text-muted-foreground">The affiliate program is paused right now. Check back soon.</p>
        ) : (
          <Dashboard />
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["my-affiliate"], queryFn: () => getMyAffiliate() });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [upi, setUpi] = useState<string | null>(null);

  if (me.isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  if (!me.data) {
    const join = async () => {
      setBusy(true);
      try {
        await joinAffiliate({ data: {} });
        await qc.invalidateQueries({ queryKey: ["my-affiliate"] });
        toast.success("Your link is ready!");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't create your link");
      } finally {
        setBusy(false);
      }
    };
    return (
      <button onClick={join} disabled={busy} className="zk-label flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-xs text-background disabled:opacity-60 sm:w-auto sm:px-10">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Get my affiliate link
      </button>
    );
  }

  const { affiliate: a, totals, commissions } = me.data;
  const link = `${typeof window !== "undefined" ? window.location.origin : "https://zankyo.in"}/?ref=${a.code}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — long-press the link to copy it.");
    }
  };
  const share = () => navigator.share?.({ title: "ZANKYO", text: "Check out ZANKYO streetwear", url: link }).catch(() => {});
  const savePayout = async () => {
    await updateMyPayout({ data: { upi: upi ?? "" } });
    toast.success("Payout details saved");
    qc.invalidateQueries({ queryKey: ["my-affiliate"] });
  };

  return (
    <div className="space-y-5">
      {a.status !== "active" && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">Your affiliate account is paused. Contact help@zankyo.in.</p>}
      <div className="rounded-2xl border border-border p-4 sm:p-5">
        <p className="zk-label text-[11px] text-muted-foreground">Your link</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <code className="min-w-0 flex-1 break-all rounded-lg bg-muted px-3 py-3 text-sm">{link}</code>
          <button onClick={copy} className="zk-label flex min-h-11 items-center gap-2 rounded-lg bg-foreground px-4 text-[11px] text-background">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
          </button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button onClick={share} className="zk-label flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-[11px]"><Share2 className="h-4 w-4" /> Share</button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Code {a.code} · {a.clicks} link visits · Orders within 30 days of a visit count.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Orders" value={String(totals.orders)} />
        <Stat label="Waiting approval" value={formatMoney(totals.pending)} />
        <Stat label="Approved" value={formatMoney(totals.approved)} />
        <Stat label="Paid out" value={formatMoney(totals.paid)} />
      </div>

      <div className="rounded-2xl border border-border p-4 sm:p-5">
        <p className="zk-label text-[11px] text-muted-foreground">Payout UPI ID</p>
        <div className="mt-2 flex gap-2">
          <input value={upi ?? a.payout_upi ?? ""} onChange={(e) => setUpi(e.target.value)} placeholder="name@upi" className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-base sm:text-sm" />
          <button onClick={savePayout} disabled={upi === null} className="zk-label min-h-11 rounded-lg border border-foreground px-4 text-[11px] disabled:opacity-40">Save</button>
        </div>
      </div>

      <div>
        <p className="zk-label text-[11px] text-muted-foreground">Commission history</p>
        {commissions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No orders yet. Share your link to get started.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-2xl border border-border">
            {commissions.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block font-semibold">{c.order} · {formatMoney(c.amount)}</span>
                  <span className="text-xs text-muted-foreground">{c.rate}% of {formatMoney(c.orderAmount)} · {new Date(c.createdAt).toLocaleDateString("en-IN")}</span>
                </span>
                <span className={`zk-label shrink-0 rounded-full px-2 py-1 text-[9px] ${c.status === "paid" || c.status === "approved" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>{STATUS[c.status] ?? c.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/60 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
