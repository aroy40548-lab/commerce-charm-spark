import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { PageHeader, Spinner, Tabs } from "@/components/admin/ui";
import { Comments, Creators, Overview, ReelPanel, ReelsGrid } from "@/components/admin/reels/ReelsDashboard";
import { adminReelsDashboard } from "@/lib/reels.functions";

const TABS = ["overview", "reels", "creators", "comments"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/admin/reels")({
  validateSearch: zodValidator(z.object({ tab: fallback(z.string(), "overview").default("overview") })),
  head: () => ({ meta: [{ title: "Reels dashboard — ZANKYO Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminReels,
});

function AdminReels() {
  const { tab: raw } = Route.useSearch();
  const tab: Tab = (TABS as readonly string[]).includes(raw) ? (raw as Tab) : "overview";
  const navigate = useNavigate({ from: "/admin/reels" });
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["admin-reels-dash"], queryFn: () => adminReelsDashboard() });

  return (
    <div>
      <PageHeader title="Reels" subtitle="Customer reels, creators, comments and sales from reels. Push makes reels show more often in the feed (Boost = 2×, Top = 4×)." />
      <div className="mb-4">
        <Tabs<Tab> value={tab} onChange={(t) => navigate({ search: { tab: t } })} options={[["overview", "Overview"], ["reels", `Reels${q.data ? ` (${q.data.reels.length})` : ""}`], ["creators", "Creators"], ["comments", "Comments"]]} />
      </div>
      {!q.data ? (q.isError ? <p className="text-sm text-destructive">{q.error instanceof Error ? q.error.message : "Couldn't load"}</p> : <Spinner />) : (
        <>
          {tab === "overview" && <Overview d={q.data} onOpen={setOpen} />}
          {tab === "reels" && <ReelsGrid d={q.data} onOpen={setOpen} />}
          {tab === "creators" && <Creators d={q.data} />}
          {tab === "comments" && <Comments d={q.data} onOpen={setOpen} />}
          <ReelPanel d={q.data} id={open} onClose={() => setOpen(null)} />
        </>
      )}
    </div>
  );
}
