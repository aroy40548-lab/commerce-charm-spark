import { sendLovableEmail } from "@lovable.dev/email-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FROM = "ZANKYO <orders@notify.zankyo.in>";
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// Best effort: an email failure must never break checkout or fulfilment.
export async function sendOrderEmail(orderId: string, kind: "confirmed" | "shipped" | "delivered" | "cancelled") {
  try {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return;
    const { data: o } = await supabaseAdmin.from("orders").select("*, order_items(*)").eq("id", orderId).single();
    if (!o?.email) return;
    const no = `ZK${o.order_number}`;
    const heading = {
      confirmed: `Thanks for your order ${no}`,
      shipped: `Your order ${no} is on the way`,
      delivered: `Your order ${no} was delivered`,
      cancelled: `Your order ${no} was cancelled`,
    }[kind];
    const intro = {
      confirmed: o.payment_method === "cod" ? "We've got your cash-on-delivery order and we're packing it now." : "Payment received. We're packing your order now.",
      shipped: `Courier: ${o.courier_name ?? "our delivery partner"}${o.awb_code ? ` · Tracking no. ${o.awb_code}` : ""}.`,
      delivered: "Enjoy your fit! You can now leave a photo review on the product page.",
      cancelled: o.cancel_reason ? `Reason: ${o.cancel_reason}. Any payment will be refunded to the original method.` : "Any payment will be refunded to the original method.",
    }[kind];
    const rows = o.order_items
      .map((i) => `<tr><td style="padding:6px 0">${esc(i.title)}${i.variant_title ? ` (${esc(i.variant_title)})` : ""} × ${i.quantity}</td><td align="right">${inr(Number(i.price) * i.quantity)}</td></tr>`)
      .join("");
    const track = o.tracking_url ? `<p><a href="${esc(o.tracking_url)}" style="background:#000;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Track shipment</a></p>` : "";
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
      <h2>${heading}</h2><p style="color:#555">${intro}</p>${track}
      <table width="100%" style="border-top:1px solid #eee;margin-top:16px;font-size:14px">${rows}
      <tr><td style="padding-top:10px;border-top:1px solid #eee"><b>Total</b></td><td align="right" style="padding-top:10px;border-top:1px solid #eee"><b>${inr(Number(o.total))}</b></td></tr></table>
      <p style="color:#999;font-size:12px;margin-top:24px">See all your orders at https://zankyo.in/account · Questions? Reply to help@zankyo.in</p></div>`;
    await sendLovableEmail(
      { to: o.email, from: FROM, sender_domain: "notify.zankyo.in", subject: heading, html, text: `${heading}\n${intro}\nTotal ${inr(Number(o.total))}`, purpose: "transactional", reply_to: "help@zankyo.in", idempotency_key: `${o.id}-${kind}` },
      { apiKey, sendUrl: process.env["LOVABLE_SEND_URL"] },
    );
  } catch (e) {
    console.error("order email failed", kind, orderId, e);
  }
}
