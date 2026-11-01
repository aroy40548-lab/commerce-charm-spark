import { useState } from "react";
import { Loader2 } from "lucide-react";
import { adminPersonalAnnouncement } from "@/lib/presence.functions";
import { Card, Field, btn, inputCls, useAction } from "@/components/admin/ui";

/** Sends a personal announcement: shows on their screen and in their notifications. */
export function PersonalAnnouncement({ userIds }: { userIds: string[] }) {
  const { busy, run } = useAction();
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  return (
    <Card title="Personal announcement">
      <form className="space-y-3" onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run("pa", () => adminPersonalAnnouncement({ data: { userIds, body, link } }), "Announcement sent", []);
        if (ok) { setBody(""); setLink(""); }
      }}>
        <Field label="Message"><textarea required maxLength={280} rows={3} value={body} onChange={(e) => setBody(e.target.value)} className={inputCls} /></Field>
        <Field label="Link (optional)" hint="A page on this site, like /drops"><input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/shop" className={inputCls} /></Field>
        <button disabled={!!busy || !body.trim()} className={btn}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Send</button>
      </form>
    </Card>
  );
}
