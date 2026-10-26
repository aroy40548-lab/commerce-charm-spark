import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canRestrict } from "@/lib/accountStatus";

const STATUS = z.enum(["active", "hidden", "reel_suspended", "banned"]);

export const adminGetAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const g = await import("./guard.server");
    await g.requireStaff(context as never);
    const [{ data: p }, { data: history }] = await Promise.all([
      g.db.from("profiles").select("account_status, status_reason, status_changed_at, status_changed_by").eq("id", data.userId).maybeSingle(),
      g.db.from("account_actions").select("id, status, reason, actor, created_at").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(20),
    ]);
    return {
      status: p?.account_status ?? "active",
      reason: p?.status_reason ?? null,
      changedAt: p?.status_changed_at ?? null,
      changedBy: p?.status_changed_by ?? null,
      history: history ?? [],
    };
  });

export const adminSetAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), status: STATUS, reason: z.string().trim().max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    const g = await import("./guard.server");
    const me = await g.requireStaff(context as never, "customers");
    if (data.status !== "active" && data.reason.length < 3) throw new Error("Please give a reason");
    const { data: owner } = await g.db.from("user_roles").select("id").eq("user_id", data.userId).eq("role", "admin").maybeSingle();
    if (!canRestrict(!!owner, data.status)) throw new Error("Store owners can't be restricted.");
    const now = new Date().toISOString();
    const { error } = await g.db.from("profiles").update({
      account_status: data.status, status_reason: data.status === "active" ? null : data.reason, status_changed_at: now, status_changed_by: me.email,
    }).eq("id", data.userId);
    if (error) throw new Error("Couldn't update the account");
    await g.db.from("account_actions").insert({ user_id: data.userId, status: data.status, reason: data.reason, actor: me.email });
    return { ok: true };
  });
