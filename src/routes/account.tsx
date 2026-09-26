import { createFileRoute, Link } from "@tanstack/react-router";
import { ZankyoStar } from "@/components/ZankyoStar";
import { openShopifyAccount } from "@/stores/customerStore";

export const Route = createFileRoute("/account")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My account — ZANKYO" },
      { name: "description", content: "Your ZANKYO orders, tracking and saved addresses." },
      { property: "og:title", content: "My account — ZANKYO" },
      { property: "og:description", content: "Your ZANKYO orders and addresses." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Account,
});

function Account() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 text-center">
      <ZankyoStar className="mx-auto h-8 w-8" />
      <h1 className="zk-display mt-4 text-4xl">My account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your current orders, order history with tracking links, and saved addresses live in your secure account. Sign in with the one-time code sent to your email.
      </p>
      <button
        onClick={openShopifyAccount}
        className="zk-label mt-8 w-full rounded-full bg-foreground py-3 text-xs text-background"
      >
        Sign in to view orders
      </button>
      <p className="mt-6 text-sm text-muted-foreground">
        Looking for your saved pieces? Open the <span className="underline">wishlist</span> in the menu, or{" "}
        <Link to="/shop" search={{ q: undefined, category: undefined }} className="underline">keep shopping</Link>.
      </p>
    </div>
  );
}
