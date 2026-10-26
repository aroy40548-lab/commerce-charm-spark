import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, Flag, ImagePlus, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/ReelsFeed";
import { useAuth } from "@/hooks/useAuth";
import { compressImage, timeAgo } from "@/lib/social";
import { createChatImageUpload, getConversation, markChatRead, reportConversation, sendMessage, setBlock } from "@/lib/social.functions";

export const Route = createFileRoute("/social/inbox/$id")({
  head: () => ({
    meta: [
      { title: "Chat — ZANKYO Social" },
      { name: "description", content: "A private chat on ZANKYO Social." },
      { property: "og:title", content: "Chat — ZANKYO Social" },
      { property: "og:description", content: "A private chat on ZANKYO Social." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Chat,
});

function Chat() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const channel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTyped = useRef(0);
  const q = useQuery({ queryKey: ["chat", id], enabled: !!user, queryFn: () => getConversation({ data: { id } }) });
  const msgs = q.data?.messages ?? [];
  const lastIncoming = [...msgs].reverse().find((m) => !m.mine);

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);
  useEffect(() => {
    if (lastIncoming && !lastIncoming.read) void markChatRead({ data: { id } }).then(() => qc.invalidateQueries({ queryKey: ["social-badges"] }));
  }, [lastIncoming?.id, lastIncoming?.read, id, qc]);

  // Typing indicator: a shared room per chat.
  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ch = supabase.channel(`typing:${id}`).on("broadcast", { event: "typing" }, (p) => {
      if ((p.payload as { from?: string }).from === user.id) return;
      setTyping(true); clearTimeout(timer); timer = setTimeout(() => setTyping(false), 3000);
    }).subscribe();
    channel.current = ch;
    return () => { clearTimeout(timer); channel.current = null; void supabase.removeChannel(ch); };
  }, [id, user?.id]);

  const onType = (v: string) => {
    setText(v);
    if (Date.now() - lastTyped.current > 1500) { lastTyped.current = Date.now(); void channel.current?.send({ type: "broadcast", event: "typing", payload: { from: user?.id } }); }
  };

  const send = async (imagePath?: string) => {
    if (!text.trim() && !imagePath) return;
    setBusy(true);
    try {
      await sendMessage({ data: { id, body: imagePath ? "" : text, imagePath: imagePath ?? null } });
      if (!imagePath) setText("");
      await qc.invalidateQueries({ queryKey: ["chat", id] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't send"); }
    finally { setBusy(false); }
  };
  const sendPhoto = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const img = await compressImage(f, 1280);
      const up = await createChatImageUpload({ data: { id } });
      const { error } = await supabase.storage.from("posts").uploadToSignedUrl(up.path, up.token, img.blob, { contentType: "image/webp" });
      if (error) throw new Error("Upload failed");
      await send(up.path);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't send photo"); setBusy(false); }
  };

  if (!user) return <p className="p-10 text-center text-sm"><Link to="/auth" className="underline">Sign in</Link> to read messages.</p>;
  if (q.isLoading) return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!q.data) return <p className="p-10 text-center text-sm text-muted-foreground">Chat not found.</p>;
  const o = q.data.other;

  return (
    <div className="mx-auto flex h-[calc(100dvh-6.5rem-env(safe-area-inset-bottom))] max-w-xl flex-col lg:h-[calc(100dvh-12rem)]">
      <div className="flex items-center gap-3 border-b border-border px-3 py-2">
        <Link to="/social/inbox" aria-label="Back" className="grid h-10 w-10 place-items-center"><ArrowLeft className="h-5 w-5" /></Link>
        <Avatar url={o.avatarUrl} label={o.username ?? o.name} />
        {o.username ? <Link to="/u/$username" params={{ username: o.username }} className="min-w-0 flex-1 truncate text-sm font-semibold">{o.username}</Link> : <span className="flex-1 text-sm font-semibold">{o.name}</span>}
        <button aria-label="Report chat" onClick={async () => { const r = prompt("What's wrong with this chat?"); if (!r || r.trim().length < 3) return; await reportConversation({ data: { id, reason: r } }); toast.success("Reported — the ZANKYO team will review it"); }} className="grid h-10 w-10 place-items-center text-muted-foreground"><Flag className="h-4 w-4" /></button>
        <button aria-label={q.data.iBlocked ? "Unblock" : "Block"} onClick={async () => { if (!q.data!.iBlocked && !confirm(`Block ${o.username ?? o.name}? They won't be able to message you.`)) return; await setBlock({ data: { userId: o.id, block: !q.data!.iBlocked } }); qc.invalidateQueries({ queryKey: ["chat", id] }); }} className={`grid h-10 w-10 place-items-center ${q.data.iBlocked ? "text-destructive" : "text-muted-foreground"}`}><Ban className="h-4 w-4" /></button>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        {msgs.map((m, i) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[78%] ${m.mine ? "bg-accent text-accent-foreground" : "bg-muted"} ${m.image ? "p-1" : "px-3 py-2"} rounded-2xl text-sm`}>
              {m.image && <img src={m.image} alt="" loading="lazy" className="max-h-72 rounded-xl" />}
              {m.shared && <a href={m.shared.href} className="block underline">{m.shared.title}</a>}
              {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
            </div>
            {m.mine && i === msgs.length - 1 && <span className="ml-1 self-end text-[10px] text-muted-foreground">{m.read ? "Seen" : timeAgo(m.createdAt)}</span>}
          </div>
        ))}
        {typing && <p className="text-xs text-muted-foreground">typing…</p>}
        <div ref={bottom} />
      </div>
      {q.data.iBlocked ? (
        <p className="border-t border-border p-3 text-center text-sm text-muted-foreground">You blocked this person. Tap the block icon to unblock.</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex gap-2 border-t border-border p-2">
          <label className="grid h-11 w-11 cursor-pointer place-items-center text-muted-foreground" aria-label="Send photo">
            <ImagePlus className="h-5 w-5" />
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { void sendPhoto(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <input value={text} onChange={(e) => onType(e.target.value)} maxLength={2000} placeholder="Message…" aria-label="Message" className="min-h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-base sm:text-sm" />
          <button disabled={busy || !text.trim()} aria-label="Send" className="grid h-11 w-11 place-items-center rounded-full bg-foreground text-background disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
        </form>
      )}
    </div>
  );
}
