import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";

type SuccessSearch = { order?: string | undefined };

export const Route = createFileRoute("/order-success")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): SuccessSearch => ({
    order: typeof s["order"] === "string" && /^ZK\d+$/.test(s["order"]) ? s["order"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Order confirmed — ZANKYO" },
      { name: "description", content: "Your ZANKYO order is confirmed." },
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
  const { order } = Route.useSearch();
  useEffect(() => { useCartStore.getState().clearCart(); }, []);
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10 text-center sm:py-16">
      <CheckCircle2 className="mx-auto h-12 w-12" strokeWidth={1.4} />
      <h1 className="zk-display mt-4 text-3xl sm:text-4xl">Order confirmed</h1>
      {order && <span className="zk-label mx-auto mt-3 inline-block rounded-full bg-muted px-4 py-1.5 text-[11px]">Order {order}</span>}
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Thanks! We're packing your order now. You'll get an email with your order details, and another one with tracking once it ships.
      </p>
      <Link to="/account" className="zk-label mt-7 flex min-h-12 w-full items-center justify-center rounded-full bg-foreground text-xs text-background active:opacity-80">
        Track my order
      </Link>
      <Link to="/shop" search={{ q: undefined, category: undefined }} className="mt-4 text-sm underline underline-offset-4">
        Continue shopping
      </Link>
    </div>
  );
}
