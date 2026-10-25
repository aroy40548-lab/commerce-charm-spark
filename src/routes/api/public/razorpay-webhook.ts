import { createFileRoute } from "@tanstack/react-router";

// Razorpay → Settings → Webhooks: https://zankyo.in/api/public/razorpay-webhook
// (events: payment.captured, order.paid). Catches payments whose browser tab closed early.
export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const sig = request.headers.get("x-razorpay-signature") ?? "";
        const { verifyWebhookSignature } = await import("@/lib/store.server");
        if (!verifyWebhookSignature(body, sig)) return new Response("Invalid signature", { status: 401 });
        const evt = JSON.parse(body);
        const payment = evt?.payload?.payment?.entity;
        if ((evt.event === "payment.captured" || evt.event === "order.paid") && payment?.order_id) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: o } = await supabaseAdmin.from("orders").select("id, status").eq("razorpay_order_id", payment.order_id).maybeSingle();
          if (o) {
            await supabaseAdmin.rpc("commit_order", { _order_id: o.id, _payment_id: payment.id, _status: "paid" });
            if (o.status === "pending") {
              const { sendOrderEmail } = await import("@/lib/email.server");
              await sendOrderEmail(o.id, "confirmed");
            }
          }
        }
        return new Response("ok");
      },
    },
  },
});
