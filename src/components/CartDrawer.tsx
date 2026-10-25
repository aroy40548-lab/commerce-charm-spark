import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { formatMoney } from "@/lib/catalog";

export function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const { items, updateQuantity, removeItem } = useCartStore();
  const navigate = useNavigate();

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + parseFloat(i.price.amount) * i.quantity, 0);
  const currency = items[0]?.price.currencyCode ?? "INR";

  const handleCheckout = () => {
    setIsOpen(false);
    navigate({ to: "/checkout" });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Open bag"
          className="relative grid h-11 w-11 place-items-center rounded-full text-foreground transition-colors hover:bg-muted active:bg-muted"
        >
          <ShoppingBag className="h-5 w-5" strokeWidth={1.6} />
          {totalItems > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background">
              {totalItems}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="flex h-dvh w-full flex-col p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:p-6">
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
                    <div key={item.variantId} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] gap-3 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:gap-4">
                      <div className="h-18 w-18 shrink-0 overflow-hidden rounded-lg bg-card sm:h-20 sm:w-20">
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
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <button
                          onClick={() => removeItem(item.variantId)}
                          aria-label="Remove"
                          className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:bg-muted"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="flex items-center rounded-full border border-border">
                          <button
                            className="grid h-10 w-10 place-items-center rounded-l-full active:bg-muted"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-7 text-center text-sm">{item.quantity}</span>
                          <button
                            className="grid h-10 w-10 place-items-center rounded-r-full active:bg-muted"
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

              <div className="shrink-0 space-y-3 border-t border-border bg-background pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="zk-label text-xs">Subtotal</span>
                  <span className="text-xl font-bold">{formatMoney(subtotal, currency)}</span>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">Shipping, discount codes and gift cards are added at checkout.</p>
                <button
                  onClick={handleCheckout}
                  disabled={items.length === 0}
                  className="zk-label flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-xs text-background active:opacity-80 disabled:opacity-60"
                >
                  Checkout <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
