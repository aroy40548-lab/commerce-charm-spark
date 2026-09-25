import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const sig = request.headers.get("x-razorpay-signature") ?? "";
        const { verifyWebhookSignature } = await import("@/lib/commerce.server");
        if (!verifyWebhookSignature(body, sig)) return new Response("Invalid signature", { status: 401 });
        const evt = JSON.parse(body);
        const payment = evt?.payload?.payment?.entity;
        if ((evt.event === "payment.captured" || evt.event === "order.paid") && payment?.order_id) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: o } = await supabaseAdmin.from("orders").select("id").eq("razorpay_order_id", payment.order_id).maybeSingle();
          if (o) await supabaseAdmin.rpc("mark_order_paid", { _order_id: o.id, _payment_id: payment.id });
        }
        return new Response("ok");
      },
    },
  },
});
