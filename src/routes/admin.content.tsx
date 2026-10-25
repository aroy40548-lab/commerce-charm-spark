import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { adminDeleteFile, adminListFiles } from "@/lib/admin/marketing.functions";
import { adminUpload } from "@/lib/admin/products.functions";
import { Empty, PageHeader, ReadOnlyNote, Spinner, Tabs, btn, dateOnly, fileToBase64, useAction, useCanEdit } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/content")({ component: Files });

function Files() {
  const q = useQuery({ queryKey: ["admin-files"], queryFn: () => adminListFiles() });
  const canEdit = useCanEdit("content");
  const { run } = useAction();
  const [folder, setFolder] = useState("all");
  const [uploading, setUploading] = useState(0);

  const upload = async (files: FileList | null) => {
    const list = Array.from(files ?? []);
    setUploading(list.length);
    for (const file of list) {
      try {
        await adminUpload({ data: { folder: "files", file: { type: file.type || "application/octet-stream", base64: await fileToBase64(file), name: file.name } } });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Couldn't upload ${file.name}`);
      }
      setUploading((n) => n - 1);
    }
    await q.refetch();
  };
  const shown = (q.data ?? []).filter((f) => folder === "all" || f.folder === folder);
  const copy = (url: string) => navigator.clipboard?.writeText(window.location.origin + url).then(() => toast.success("Link copied"));

  return (
    <div>
      <PageHeader title="Files" subtitle={<>Images and files used on the store. Blog posts are under <Link to="/admin/blog" className="underline">Blog posts</Link>.</>}
        action={canEdit && (
          <label className={`${btn} cursor-pointer`}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {uploading ? `Uploading ${uploading}…` : "Upload files"}
            <input type="file" multiple className="hidden" onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
          </label>
        )} />
      <ReadOnlyNote section="content" />
      <Tabs value={folder} onChange={setFolder} options={[["all", "All"], ["files", "Uploads"], ["products", "Product photos"], ["collections", "Collections"], ["blog", "Blog"]]} />
      {q.isLoading ? <Spinner /> : !shown.length ? <Empty>No files yet.</Empty> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {shown.map((f) => (
            <div key={f.path} className="overflow-hidden rounded-xl border border-border bg-background">
              <a href={f.url} target="_blank" rel="noreferrer" className="block bg-card">
                {f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|avif)$/i.test(f.name)
                  ? <img src={f.url} alt="" loading="lazy" className="aspect-square w-full object-contain" />
                  : <div className="grid aspect-square place-items-center text-muted-foreground"><FileText className="h-8 w-8" /></div>}
              </a>
              <div className="p-2">
                <p className="truncate text-xs font-medium" title={f.name}>{f.name}</p>
                <p className="text-[11px] text-muted-foreground">{(f.size / 1024).toFixed(0)} KB{f.created ? ` · ${dateOnly(f.created)}` : ""}</p>
                <div className="mt-1 flex gap-1">
                  <button onClick={() => copy(f.url)} className="grid h-8 flex-1 place-items-center rounded-md border border-border" aria-label="Copy link"><Copy className="h-3.5 w-3.5" /></button>
                  {canEdit && <button onClick={() => { if (confirm("Delete this file? Anything using it will show a broken image.")) void run("d", () => adminDeleteFile({ data: { path: f.path } }), "Deleted", ["admin-files"]); }} className="grid h-8 flex-1 place-items-center rounded-md border border-border text-muted-foreground" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
