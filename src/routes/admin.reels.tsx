import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { PageHeader, Spinner, Tabs } from "@/components/admin/ui";
import { Comments, Creators, Overview, ReelPanel, ReelsGrid } from "@/components/admin/reels/ReelsDashboard";
import { BroadcastAdmin, PostsAdmin, ReportsAdmin, SocialOverview } from "@/components/admin/reels/SocialAdmin";
import { adminReelsDashboard } from "@/lib/reels.functions";

const TABS = ["overview", "posts", "reels", "creators", "comments", "reports", "broadcast"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/admin/reels")({
  validateSearch: zodValidator(z.object({ tab: fallback(z.string(), "overview").default("overview") })),
  head: () => ({ meta: [{ title: "Social dashboard — ZANKYO Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminSocial,
});

function AdminSocial() {
  const { tab: raw } = Route.useSearch();
  const tab: Tab = (TABS as readonly string[]).includes(raw) ? (raw as Tab) : "overview";
  const navigate = useNavigate({ from: "/admin/reels" });
  const [open, setOpen] = useState<string | null>(null);
  const reelsTab = tab === "overview" || tab === "reels" || tab === "creators" || tab === "comments";
  const q = useQuery({ queryKey: ["admin-reels-dash"], enabled: reelsTab, queryFn: () => adminReelsDashboard() });

  return (
    <div>
      <PageHeader title="Social" subtitle="Photo posts, reels, creators, comments, chat reports and announcements. Push makes posts show more often in the feed (Boost = 2×, Top = 4×)." />
      <div className="mb-4 overflow-x-auto">
        <Tabs<Tab> value={tab} onChange={(t) => navigate({ search: { tab: t } })} options={[["overview", "Overview"], ["posts", "Photo posts"], ["reels", `Reels${q.data ? ` (${q.data.reels.length})` : ""}`], ["creators", "Creators"], ["comments", "Comments"], ["reports", "Chat reports"], ["broadcast", "Announce"]]} />
      </div>
      {tab === "overview" && <SocialOverview />}
      {tab === "posts" && <PostsAdmin />}
      {tab === "reports" && <ReportsAdmin />}
      {tab === "broadcast" && <BroadcastAdmin />}
      {reelsTab && (!q.data ? (q.isError ? <p className="text-sm text-destructive">{q.error instanceof Error ? q.error.message : "Couldn't load"}</p> : <Spinner />) : (
        <>
          {tab === "overview" && <Overview d={q.data} onOpen={setOpen} />}
          {tab === "reels" && <ReelsGrid d={q.data} onOpen={setOpen} />}
          {tab === "creators" && <Creators d={q.data} />}
          {tab === "comments" && <Comments d={q.data} onOpen={setOpen} />}
          <ReelPanel d={q.data} id={open} onClose={() => setOpen(null)} />
        </>
      ))}
    </div>
  );
}
