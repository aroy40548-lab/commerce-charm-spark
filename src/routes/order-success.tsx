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
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10 text-center sm:py-16">
      <CheckCircle2 className="mx-auto h-12 w-12" strokeWidth={1.4} />
      <h1 className="zk-display mt-4 text-3xl sm:text-4xl">Payment successful</h1>
      {order && (
        <span className="zk-label mx-auto mt-3 inline-block rounded-full bg-muted px-4 py-1.5 text-[11px]">Order {order}</span>
      )}
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Your order is confirmed. A confirmation email is on its way with your order details.
      </p>
      {token ? (
        <Link to="/account" className="zk-label mt-7 flex min-h-12 w-full items-center justify-center rounded-full bg-foreground text-xs text-background active:opacity-80">
          Track my order
        </Link>
      ) : (
        <button onClick={() => signIn("/account")} className="zk-label mt-7 flex min-h-12 w-full items-center justify-center rounded-full bg-foreground text-xs text-background active:opacity-80">
          Sign in to track my order
        </button>
      )}
      <Link to="/shop" search={{ q: undefined, category: undefined }} className="mt-4 text-sm underline underline-offset-4">
        Continue shopping
      </Link>
    </div>
  );
}
