import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FEATURES, type Features } from "@/lib/features";
import { adminAiKeyStatus, adminSaveAiKey, adminSaveFeatures, adminTestAiKey, getFeatures } from "@/lib/features.functions";
import { Card, Field, Toggle, btn, btnGhost, inputCls, useAction, useCanEdit } from "@/components/admin/ui";

export function FeaturesCard() {
  const canEdit = useCanEdit("settings");
  const q = useQuery({ queryKey: ["features"], queryFn: () => getFeatures() });
  const [f, setF] = useState<Features | null>(null);
  useEffect(() => { if (q.data && !f) setF(q.data); }, [q.data, f]);
  const { run, busy } = useAction();
  if (!f) return <Card title="Website features"><Loader2 className="h-5 w-5 animate-spin" /></Card>;
  return (
    <Card title="Website features">
      <p className="mb-3 text-xs text-muted-foreground">Turn parts of the website on or off. Changes reach every shopper within about 10 seconds.</p>
      <div className="divide-y divide-border">
        {FEATURES.map((x) => (
          <div key={x.key} className="py-1">
            <Toggle checked={f[x.key]} disabled={!canEdit} label={x.label} onChange={(v) => setF({ ...f, [x.key]: v })} />
            <p className="-mt-1 pb-2 pl-14 text-xs text-muted-foreground">{x.hint}</p>
          </div>
        ))}
      </div>
      {canEdit && <button className={`${btn} mt-3`} disabled={!!busy} onClick={() => run("features", () => adminSaveFeatures({ data: f }), "Features saved", ["features"])}>Save features</button>}
    </Card>
  );
}

export function AiKeyCard() {
  const canEdit = useCanEdit("settings");
  const q = useQuery({ queryKey: ["ai-key"], queryFn: () => adminAiKeyStatus() });
  const [key, setKey] = useState("");
  const { run, busy } = useAction();
  const s = q.data;
  return (
    <Card title="Gemini API key (AI photo fitting)">
      <p className="mb-3 text-xs text-muted-foreground">
        {s?.saved ? "A key is saved. Paste a new one to replace it." : s?.fromSecret ? "Using the key set up during setup. Paste one here to replace it." : "No key yet — fits use Lovable AI credits."} Get a key at aistudio.google.com. The key is never shown again after saving.
      </p>
      {canEdit && (
        <>
          <Field label="New key"><input type="password" autoComplete="off" className={inputCls} value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste Gemini API key" /></Field>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={btn} disabled={!key.trim() || !!busy} onClick={async () => { await run("key", () => adminSaveAiKey({ data: { key } }), "Key saved", ["ai-key"]); setKey(""); }}>Save key</button>
            <button className={btnGhost} disabled={!!busy} onClick={async () => { const r = await adminTestAiKey(); r.ok ? toast.success(r.message) : toast.error(r.message); }}>Test key</button>
            {s?.saved && <button className={btnGhost} disabled={!!busy} onClick={() => { if (confirm("Remove the saved key?")) void run("key", () => adminSaveAiKey({ data: { key: "" } }), "Key removed", ["ai-key"]); }}>Remove</button>}
          </div>
        </>
      )}
    </Card>
  );
}
