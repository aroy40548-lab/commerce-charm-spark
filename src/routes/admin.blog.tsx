import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { adminDeletePost, adminListPosts, adminSavePost } from "@/lib/admin/marketing.functions";
import { adminUpload } from "@/lib/admin/products.functions";
import { Card, Empty, Field, PageHeader, ReadOnlyNote, Spinner, StatusBadge, Toggle, btn, btnGhost, dateOnly, fileToBase64, inputCls, useAction, useCanEdit } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/blog")({ component: Blog });

type Post = { id?: string; title: string; slug: string; excerpt: string; body: string; cover_url: string | null; author: string; published: boolean };

function Blog() {
  const q = useQuery({ queryKey: ["admin-posts"], queryFn: () => adminListPosts() });
  const canEdit = useCanEdit("content");
  const { busy, run } = useAction();
  const [p, setP] = useState<Post | null>(null);
  const [uploading, setUploading] = useState(false);

  const cover = async (file?: File) => {
    if (!file || !p) return;
    setUploading(true);
    try {
      const r = await adminUpload({ data: { folder: "blog", file: { type: file.type, base64: await fileToBase64(file), name: file.name } } });
      setP((x) => (x ? { ...x, cover_url: r.url } : x));
    } finally {
      setUploading(false);
    }
  };

  if (p) {
    return (
      <form onSubmit={async (e) => { e.preventDefault(); if (await run("save", () => adminSavePost({ data: { ...p, slug: p.slug || undefined } }), p.published ? "Post published" : "Draft saved", ["admin-posts"])) setP(null); }}>
        <PageHeader title={p.id ? "Edit post" : "New post"} action={<>
          <button type="button" onClick={() => setP(null)} className={btnGhost}>Back</button>
          <button disabled={!!busy || uploading} className={btn}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>
        </>} />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Card>
            <div className="space-y-3">
              <Field label="Title"><input required value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} className={inputCls} /></Field>
              <Field label="Short summary"><textarea value={p.excerpt} onChange={(e) => setP({ ...p, excerpt: e.target.value })} rows={2} className={inputCls} /></Field>
              <Field label="Content" hint="Leave an empty line between paragraphs."><textarea value={p.body} onChange={(e) => setP({ ...p, body: e.target.value })} rows={16} className={inputCls} /></Field>
            </div>
          </Card>
          <div className="space-y-4">
            <Card title="Visibility"><Toggle checked={p.published} onChange={(v) => setP({ ...p, published: v })} label={p.published ? "Published" : "Draft"} /></Card>
            <Card title="Cover image">
              <label className="grid aspect-[16/10] cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed border-border text-muted-foreground">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : p.cover_url ? <img src={p.cover_url} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5" />}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => void cover(e.target.files?.[0])} />
              </label>
              {p.cover_url && <button type="button" onClick={() => setP({ ...p, cover_url: null })} className="mt-2 text-xs underline">Remove</button>}
            </Card>
            <Card title="Details">
              <div className="space-y-3">
                <Field label="URL" hint={`zankyo.in/blog/${p.slug || "(from title)"}`}><input value={p.slug} onChange={(e) => setP({ ...p, slug: e.target.value })} className={inputCls} /></Field>
                <Field label="Author"><input value={p.author} onChange={(e) => setP({ ...p, author: e.target.value })} className={inputCls} /></Field>
              </div>
            </Card>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div>
      <PageHeader title="Blog posts" subtitle="Published posts appear at zankyo.in/blog." action={canEdit && <button onClick={() => setP({ title: "", slug: "", excerpt: "", body: "", cover_url: null, author: "ZANKYO", published: false })} className={btn}><Plus className="h-4 w-4" /> Write post</button>} />
      <ReadOnlyNote section="content" />
      {q.isLoading ? <Spinner /> : !q.data?.length ? <Empty>No posts yet.</Empty> : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
          {q.data.map((x) => (
            <li key={x.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              {x.cover_url ? <img src={x.cover_url} alt="" className="h-11 w-16 rounded object-cover" /> : <div className="h-11 w-16 rounded bg-muted" />}
              <button disabled={!canEdit} onClick={() => setP({ id: x.id, title: x.title, slug: x.slug, excerpt: x.excerpt, body: x.body, cover_url: x.cover_url, author: x.author, published: x.published })} className="min-w-0 flex-1 text-left">
                <p className="truncate font-medium">{x.title}</p>
                <p className="text-xs text-muted-foreground">{x.published_at ? dateOnly(x.published_at) : "Not published"}</p>
              </button>
              <StatusBadge status={x.published ? "active" : "draft"} label={x.published ? "Published" : "Draft"} />
              {x.published && <a href={`/blog/${x.slug}`} target="_blank" rel="noreferrer" aria-label="View" className="grid h-9 w-9 place-items-center text-muted-foreground"><ExternalLink className="h-4 w-4" /></a>}
              {canEdit && <button onClick={() => { if (confirm("Delete this post?")) void run("d", () => adminDeletePost({ data: { id: x.id } }), "Deleted", ["admin-posts"]); }} aria-label="Delete" className="grid h-9 w-9 place-items-center text-muted-foreground"><Trash2 className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
