import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useCustomerToken, signIn } from "@/stores/customerStore";

export const Route = createFileRoute("/order-success")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Order confirmed — ZANKYO" },
      { name: "description", content: "Your ZANKYO payment was successful and your order is confirmed." },
      { property: "og:title", content: "Order confirmed — ZANKYO" },
      { property: "og:description", content: "Thanks for shopping with ZANKYO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderSuccess,
});

function OrderSuccess() {
  const token = useCustomerToken();
  useEffect(() => { useCartStore.getState().clearCart(); }, []);
  const order = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("order") : null;
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12" strokeWidth={1.4} />
      <h1 className="zk-display mt-4 text-4xl">Payment successful</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {order ? `Order ${order} is confirmed.` : "Your order is confirmed."} A confirmation email is on its way with your order details.
      </p>
      {token ? (
        <Link to="/account" className="zk-label mt-8 w-full rounded-full bg-foreground py-3 text-xs text-background">View my orders</Link>
      ) : (
        <button onClick={() => signIn("/account")} className="zk-label mt-8 w-full rounded-full bg-foreground py-3 text-xs text-background">Sign in to view my orders</button>
      )}
      <Link to="/shop" search={{ q: undefined, category: undefined }} className="mt-4 text-sm underline">Continue shopping</Link>
    </div>
  );
}
