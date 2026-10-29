import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, Spinner, useCanEdit } from "@/components/admin/ui";
import { supabase } from "@/integrations/supabase/client";
import { adminAppUploadUrl, adminSaveAndroidApp, getAndroidApp } from "@/lib/app.functions";

const input = "w-full border border-border bg-background p-2 text-sm";

export function AndroidAppCard() {
  const can = useCanEdit("settings");
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["android-app"], queryFn: () => getAndroidApp() });
  const [path, setPath] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!q.data) return;
    const p = q.data.uploaded && q.data.url ? q.data.url.replace("/api/public/img/", "") : null;
    setPath(p); setUrl(p ? "" : q.data.url ?? ""); setVersion(q.data.version ?? ""); setNotes(q.data.notes ?? "");
  }, [q.data]);

  if (!q.data) return <Spinner />;

  const upload = async (f: File) => {
    if (!f.name.toLowerCase().endsWith(".apk")) { toast.error("Choose an .apk file"); return; }
    setBusy("Uploading…");
    try {
      const s = await adminAppUploadUrl();
      const { error } = await supabase.storage.from("product-images").uploadToSignedUrl(s.path, s.token, f, { contentType: "application/vnd.android.package-archive" });
      if (error) throw error;
      setPath(s.path); setUrl("");
      toast.success("Uploaded — press Save");
    } catch { toast.error("Upload failed (file may be too big — use a link instead)"); }
    finally { setBusy(null); }
  };

  const save = async () => {
    setBusy("Saving…");
    try {
      await adminSaveAndroidApp({ data: { path, url: path ? null : url.trim() || null, version: version.trim() || null, notes: notes.trim() || null } });
      qc.invalidateQueries({ queryKey: ["android-app"] });
      toast.success("Saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save"); }
    finally { setBusy(null); }
  };

  return (
    <Card title="Android app">
      <p className="text-sm text-muted-foreground">Shows a "Download Android app" button at the bottom of the website. Upload the .apk file, or paste a download link. Leave both empty to hide the button.</p>
      <fieldset disabled={!can || !!busy} className="mt-3 space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="cursor-pointer border border-border px-3 py-2">Upload .apk<input type="file" accept=".apk" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label>
          {path ? <span>File uploaded ✓ <button type="button" onClick={() => setPath(null)} className="ml-2 underline">Remove</button></span> : <span className="text-muted-foreground">No file</span>}
        </div>
        {!path && <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="or https:// download link" className={input} />}
        <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="Version, e.g. 1.0.2" maxLength={30} className={input} />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What's new (optional)" maxLength={500} rows={2} className={input} />
        <button type="button" onClick={save} className="bg-foreground px-4 py-2 text-sm text-background">{busy ?? "Save"}</button>
      </fieldset>
    </Card>
  );
}
