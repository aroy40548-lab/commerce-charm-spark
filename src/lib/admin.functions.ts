import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: { rpc: (...a: never[]) => unknown }; userId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (context.supabase as any).rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const refundOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { razorpay } = await import("./commerce.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: o } = await supabaseAdmin.from("orders").select("*").eq("id", data.orderId).single();
    if (!o?.razorpay_payment_id) throw new Error("This order has no payment to refund");
    const r = await razorpay(`/payments/${o.razorpay_payment_id}/refund`, { amount: Math.round(Number(o.total) * 100) });
    await supabaseAdmin.from("orders").update({ status: "refunded", refund_id: r.id }).eq("id", o.id);
    return { ok: true };
  });

export const createShipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { shiprocket } = await import("./commerce.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: o } = await supabaseAdmin.from("orders").select("*, order_items(*)").eq("id", data.orderId).single();
    if (!o) throw new Error("Order not found");
    if (o.status !== "paid") throw new Error("Only paid orders can be shipped");
    const { data: s } = await supabaseAdmin.from("store_settings").select("*").eq("id", 1).single();
    const a = o.shipping_address as Record<string, string>;
    const [first, ...rest] = (a["full_name"] ?? "").split(" ");
    const created = await shiprocket("/orders/create/adhoc", "POST", {
      order_id: `ZK${o.order_number}`,
      order_date: new Date(o.created_at).toISOString().slice(0, 16).replace("T", " "),
      pickup_location: s?.pickup_location ?? "Primary",
      billing_customer_name: first, billing_last_name: rest.join(" ") || ".",
      billing_address: a["address1"], billing_address_2: a["address2"] ?? "",
      billing_city: a["city"], billing_pincode: a["pincode"], billing_state: a["state"], billing_country: "India",
      billing_email: o.email, billing_phone: a["phone"], shipping_is_billing: true,
      order_items: o.order_items.map((i) => ({ name: `${i.title} ${i.variant_title ?? ""}`.trim(), sku: i.variant_id ?? i.title, units: i.quantity, selling_price: Number(i.price) })),
      payment_method: "Prepaid", sub_total: Number(o.total),
      length: 30, breadth: 25, height: 5, weight: Number(s?.package_weight_kg ?? 0.5),
    });
    let awb: string | null = null, courier: string | null = null;
    try {
      const assign = await shiprocket("/courier/assign/awb", "POST", { shipment_id: created.shipment_id });
      awb = assign?.response?.data?.awb_code ?? null;
      courier = assign?.response?.data?.courier_name ?? null;
    } catch { /* AWB can be assigned later from Shiprocket */ }
    await supabaseAdmin.from("orders").update({
      status: "shipped", shiprocket_order_id: String(created.order_id), shiprocket_shipment_id: String(created.shipment_id),
      awb_code: awb, courier_name: courier, tracking_status: awb ? "AWB assigned" : "Shipment created",
    }).eq("id", o.id);
    return { awb, courier };
  });

export const refreshTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { shiprocket } = await import("./commerce.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: o } = await supabaseAdmin.from("orders").select("id, awb_code").eq("id", data.orderId).single();
    if (!o?.awb_code) throw new Error("No tracking number yet");
    const t = await shiprocket(`/courier/track/awb/${o.awb_code}`, "GET");
    const status: string = t?.tracking_data?.shipment_track?.[0]?.current_status ?? "Unknown";
    await supabaseAdmin.from("orders").update({ tracking_status: status, ...(status.toLowerCase() === "delivered" ? { status: "delivered" } : {}) }).eq("id", o.id);
    return { status };
  });

export const addAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const { data: p } = await supabaseAdmin.from("profiles").select("id").ilike("email", email).maybeSingle();
    let uid = p?.id;
    if (!uid) {
      const { data: inv, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
      if (error) throw new Error(error.message);
      uid = inv.user.id;
    }
    await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: "admin" }, { onConflict: "user_id,role" });
    return { ok: true };
  });

export const listAdmins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
    const ids = (roles ?? []).map((r) => r.user_id);
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, email").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    return ids.map((id) => ({ id, email: profiles?.find((p) => p.id === id)?.email ?? id }));
  });
