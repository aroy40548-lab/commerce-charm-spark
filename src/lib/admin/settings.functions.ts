import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SECTION_KEYS, type Section } from "./permissions";

async function guard(context: unknown, section?: Section) {
  const g = await import("./guard.server");
  const me = await g.requireStaff(context as never, section);
  return { me, db: g.db };
}
const uuid = z.string().uuid();

export const adminGetSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await guard(context);
    const { getSettings } = await import("@/lib/store.server");
    const s = await getSettings();
    return {
      settings: s,
      integrations: {
        razorpay: !!process.env["RAZORPAY_KEY_ID"] && !!process.env["RAZORPAY_KEY_SECRET"],
        razorpayWebhook: !!process.env["RAZORPAY_WEBHOOK_SECRET"],
        shiprocket: !!process.env["SHIPROCKET_EMAIL"] && !!process.env["SHIPROCKET_PASSWORD"],
        email: !!process.env["LOVABLE_API_KEY"],
      },
    };
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    store_name: z.string().trim().min(1).max(80),
    support_email: z.string().email(),
    shipping_fee: z.number().min(0).max(100000),
    standard_label: z.string().trim().min(1).max(80),
    free_shipping_over: z.number().min(0).max(1_000_000),
    express_enabled: z.boolean(),
    express_label: z.string().trim().min(1).max(80),
    express_shipping_fee: z.number().min(0).max(100000),
    razorpay_enabled: z.boolean(),
    cod_enabled: z.boolean(),
    cod_fee: z.number().min(0).max(10000),
    pickup_location: z.string().trim().min(1).max(80),
    package_weight_kg: z.number().min(0.01).max(100),
    affiliates_enabled: z.boolean(),
    affiliate_rate: z.number().min(0).max(50),
    affiliate_cookie_days: z.number().int().min(1).max(365),
    low_stock_threshold: z.number().int().min(0).max(1000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, "settings");
    const { error } = await db.from("store_settings").update({ ...data, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Staff & roles ----------
export const adminListStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db } = await guard(context);
    const [{ data: roles }, { data: members }, { data: owners }] = await Promise.all([
      db.from("staff_roles").select("*").order("created_at"),
      db.from("staff_members").select("*, staff_roles(name)").order("created_at"),
      db.from("user_roles").select("user_id").eq("role", "admin"),
    ]);
    const ownerIds = (owners ?? []).map((o) => o.user_id);
    const { data: ownerProfiles } = ownerIds.length ? await db.from("profiles").select("id, email, first_name, last_name").in("id", ownerIds) : { data: [] };
    return {
      roles: roles ?? [],
      members: members ?? [],
      owners: (ownerProfiles ?? []).map((p) => ({ id: p.id, email: p.email ?? "", name: [p.first_name, p.last_name].filter(Boolean).join(" ") })),
    };
  });

export const adminInviteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: z.string().trim().email(), name: z.string().trim().max(80).default(""), role_id: uuid.nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const { me, db } = await guard(context, "staff");
    const email = data.email.toLowerCase();
    const { error } = await db.from("staff_members").insert({ email, name: data.name, role_id: data.role_id, invited_by: me.email, user_id: null });
    if (error) throw new Error(error.message.includes("unique") || error.message.includes("duplicate") ? "That person is already on the team" : error.message);
    try {
      const apiKey = process.env["LOVABLE_API_KEY"];
      if (apiKey) {
        const { sendLovableEmail } = await import("@lovable.dev/email-js");
        const html = `<div style="font-family:Arial,sans-serif"><h2>You've been added to the ZANKYO team</h2><p>${me.name} gave you access to the ZANKYO admin panel.</p><p><a href="https://admin.zankyo.in/admin" style="background:#000;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Open the admin panel</a></p><p style="color:#777;font-size:12px">Sign in with Google or an email code using ${email}.</p></div>`;
        await sendLovableEmail({ to: email, from: "ZANKYO <team@notify.zankyo.in>", sender_domain: "notify.zankyo.in", subject: "You've been added to the ZANKYO admin", html, text: `You've been added to the ZANKYO admin. Sign in at https://admin.zankyo.in/admin with ${email}.`, purpose: "transactional" }, { apiKey, sendUrl: process.env["LOVABLE_SEND_URL"] });
      }
    } catch (e) {
      console.error("staff invite email failed", e);
    }
    return { ok: true };
  });

export const adminUpdateStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid, role_id: uuid.nullable().optional(), active: z.boolean().optional(), name: z.string().max(80).optional(), remove: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { me, db } = await guard(context, "staff");
    const { data: m } = await db.from("staff_members").select("user_id").eq("id", data.id).single();
    if (m?.user_id === me.userId && !me.isOwner) throw new Error("You can't change your own access. Ask the store owner.");
    if (data.remove) {
      await db.from("staff_members").delete().eq("id", data.id);
      return { ok: true };
    }
    await db.from("staff_members").update({
      ...(data.role_id !== undefined ? { role_id: data.role_id } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.name !== undefined ? { name: data.name } : {}),
    }).eq("id", data.id);
    return { ok: true };
  });

export const adminSaveRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: uuid.optional(), name: z.string().trim().min(1).max(60), description: z.string().max(200).default(""),
    permissions: z.array(z.string()).max(20),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, "staff");
    const permissions = data.permissions.filter((p): p is Section => SECTION_KEYS.includes(p as Section));
    const row = { name: data.name, description: data.description, permissions };
    const res = data.id ? await db.from("staff_roles").update(row).eq("id", data.id) : await db.from("staff_roles").insert(row);
    if (res.error) throw new Error(res.error.message.includes("unique") ? "A role with that name exists" : res.error.message);
    return { ok: true };
  });

export const adminDeleteRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, "staff");
    await db.from("staff_roles").delete().eq("id", data.id);
    return { ok: true };
  });
