import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { PeopleList } from "@/components/PeopleList";
import { searchProfiles } from "@/lib/profile.functions";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Find people — ZANKYO Reels" },
      { name: "description", content: "Search ZANKYO creators by name or @username, follow them and watch their reels." },
      { property: "og:title", content: "Find people on ZANKYO" },
      { property: "og:description", content: "Search ZANKYO creators and follow their reels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const res = useQuery({ queryKey: ["people-search", term], enabled: term.length > 0, queryFn: () => searchProfiles({ data: { q: term } }) });

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 sm:py-10">
      <h1 className="zk-display text-4xl">Find people</h1>
      <label className="mt-4 flex min-h-12 items-center gap-2 border border-border bg-background px-3 focus-within:border-foreground">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or @username" aria-label="Search people" className="min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm" />
        {res.isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </label>
      <div className="mt-2">
        {term ? <PeopleList people={res.data ?? []} empty={res.isFetching ? "Searching…" : "No one found."} /> : <p className="py-8 text-center text-sm text-muted-foreground">Type a name or username.</p>}
      </div>
    </div>
  );
}
