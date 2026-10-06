import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { CUSTOMER_ORDERS_QUERY, customerQuery } from "@/lib/customerAccount";
import { useCustomerStore } from "@/stores/customerStore";

const OFFER_CODE = "FIRST20";
const OFFER_SEEN_KEY = "zankyo-first20-seen";
const OFFER_END = new Date("2026-12-27T18:29:59.999Z");

type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getCountdown(now: number): Countdown | null {
  const remaining = OFFER_END.getTime() - now;
  if (remaining <= 0) return null;
  return {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining / 3_600_000) % 24),
    minutes: Math.floor((remaining / 60_000) % 60),
    seconds: Math.floor((remaining / 1_000) % 60),
  };
}

export function FirstPurchaseOffer() {
  const token = useCustomerStore((state) => state.tokens?.accessToken ?? null);
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const countdown = useMemo(() => getCountdown(now), [now]);
  const offerActive = countdown !== null;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!offerActive || window.localStorage.getItem(OFFER_SEEN_KEY)) return;
    let cancelled = false;
    let timer: number | undefined;

    const decide = async () => {
      let hasPreviousOrder = false;
      if (token) {
        try {
          const data = await customerQuery<{
            customer?: { orders?: { nodes?: Array<{ id: string }> } };
          }>(token, CUSTOMER_ORDERS_QUERY);
          hasPreviousOrder = (data.customer?.orders?.nodes?.length ?? 0) > 0;
        } catch {
          return;
        }
      }

      if (!cancelled && !hasPreviousOrder) {
        timer = window.setTimeout(() => setOpen(true), 900);
      }
    };

    void decide();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [offerActive, token]);

  if (!countdown) return null;

  const rememberOffer = () => window.localStorage.setItem(OFFER_SEEN_KEY, "1");

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) rememberOffer();
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(OFFER_CODE);
      setCopied(true);
      rememberOffer();
      toast.success("FIRST20 copied");
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error("Could not copy the code", { description: `Enter ${OFFER_CODE} at checkout.` });
    }
  };

  const countdownItems = [
    [countdown.days, "Days"],
    [countdown.hours, "Hrs"],
    [countdown.minutes, "Min"],
    [countdown.seconds, "Sec"],
  ] as const;

  return (
    <>
      <div className="overflow-hidden border-b border-border bg-foreground py-2 text-background" role="region" aria-label="First-time buyer offer">
        <div className="zk-offer-marquee flex w-max items-center whitespace-nowrap">
          {Array.from({ length: 4 }).map((_, index) => (
            <p key={index} className="zk-label flex items-center gap-5 px-5 text-[10px] sm:text-[11px]">
              <span>First drop</span>
              <span aria-hidden="true">//</span>
              <span>20% off for first-time buyers</span>
              <span aria-hidden="true">//</span>
              <span>Use {OFFER_CODE}</span>
              <span aria-hidden="true">//</span>
              <span>Ends 27 Dec 2026</span>
              <span aria-hidden="true">✦</span>
            </p>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg border-border bg-background p-0 shadow-2xl">
          <div className="border-b border-border bg-foreground px-6 py-3 text-background">
            <p className="zk-label text-[10px]">新規 // First drop</p>
          </div>
          <div className="px-5 pb-6 pt-3 text-center sm:px-8 sm:pb-8">
            <p className="zk-label text-[10px] text-muted-foreground">New customer privilege</p>
            <DialogTitle className="zk-display mt-3 text-5xl leading-none sm:text-6xl">20% Off</DialogTitle>
            <DialogDescription className="mx-auto mt-3 max-w-xs leading-6">
              Your first ZANKYO order. Use the code before the archive closes on 27 December.
            </DialogDescription>

            <div className="mt-5 grid grid-cols-4 gap-1.5" aria-label="Offer countdown">
              {countdownItems.map(([value, label]) => (
                <div key={label} className="border border-border bg-muted px-1 py-2.5">
                  <span className="block text-xl font-bold tabular-nums sm:text-2xl">{String(value).padStart(2, "0")}</span>
                  <span className="zk-label mt-1 block text-[8px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={copyCode}
              className="mt-5 h-14 w-full justify-between rounded-none border-dashed px-4"
              aria-label={`Copy discount code ${OFFER_CODE}`}
            >
              <span className="zk-label text-base">{OFFER_CODE}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied" : "Tap to copy"}
              </span>
            </Button>

            <Button asChild size="lg" className="mt-3 h-12 w-full rounded-full">
              <Link
                to="/shop"
                search={{ q: undefined, category: undefined }}
                onClick={() => {
                  rememberOffer();
                  setOpen(false);
                }}
              >
                Shop now <ArrowRight />
              </Link>
            </Button>
            <p className="mt-3 text-[11px] text-muted-foreground">First order only. Terms apply.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}