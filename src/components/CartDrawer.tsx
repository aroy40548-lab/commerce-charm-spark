import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { formatMoney } from "@/lib/catalog";

export function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const { items, updateQuantity, removeItem, isLoading, isSyncing, syncCart, getCheckoutUrl } = useCartStore();
  useEffect(() => { if (isOpen) syncCart(); }, [isOpen, syncCart]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + parseFloat(i.price.amount) * i.quantity, 0);
  const currency = items[0]?.price.currencyCode ?? "INR";

  const handleCheckout = () => {
    const url = getCheckoutUrl();
    if (url) { window.open(url, "_blank"); setIsOpen(false); }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Open bag"
          className="relative grid h-9 w-9 place-items-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <ShoppingBag className="h-5 w-5" strokeWidth={1.6} />
          {totalItems > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background">
              {totalItems}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="flex h-full w-full flex-col sm:max-w-lg">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="zk-label text-sm">Your Bag</SheetTitle>
          <SheetDescription>
            {totalItems === 0 ? "Your bag is empty" : `${totalItems} item${totalItems !== 1 ? "s" : ""} in your bag`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col pt-4">
          {items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-muted-foreground" strokeWidth={1.2} />
                <p className="text-sm text-muted-foreground">Nothing here yet.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.variantId} className="flex gap-4">
                      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-card">
                        {item.product.node.images?.edges?.[0]?.node && (
                          <img
                            src={item.product.node.images.edges[0].node.url}
                            alt={item.product.node.title}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-medium">{item.product.node.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {item.selectedOptions.map((o) => o.value).join(" • ")}
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {formatMoney(item.price.amount, item.price.currencyCode)}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-2">
                        <button
                          onClick={() => removeItem(item.variantId)}
                          aria-label="Remove"
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="flex items-center gap-1 rounded-full border border-border px-1">
                          <button
                            className="grid h-6 w-6 place-items-center"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <button
                            className="grid h-6 w-6 place-items-center"
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-shrink-0 space-y-4 border-t border-border bg-background pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="zk-label text-xs">Subtotal</span>
                  <span className="text-xl font-bold">{formatMoney(subtotal, currency)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Shipping at checkout: Standard ₹100 (7–14 days) or Diamond ₹500 (2–4 days). Discount codes apply at checkout.</p>
                <button
                  onClick={handleCheckout}
                  disabled={items.length === 0 || isLoading || isSyncing}
                  className="zk-label flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-xs text-background disabled:opacity-60"
                >
                  {isLoading || isSyncing ? "Updating…" : "Checkout"} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
