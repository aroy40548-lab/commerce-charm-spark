import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getMyAffiliate } from "@/lib/affiliate.functions";
import { productAffiliateLink } from "@/lib/reels";

/** Shown to affiliates on product pages: copies their unique link for this product. */
export function AffiliateLinkButton({ handle }: { handle: string }) {
  const { user } = useAuth();
  const me = useQuery({ queryKey: ["my-affiliate"], queryFn: () => getMyAffiliate(), enabled: !!user, staleTime: 60_000 });
  const [copied, setCopied] = useState(false);
  const code = me.data?.affiliate.status === "active" ? me.data.affiliate.code : null;
  if (!code) return null;

  const copy = async () => {
    const link = productAffiliateLink(window.location.origin, handle, code);
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: "ZANKYO", url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Your product link is copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* share cancelled */
    }
  };

  return (
    <button
      onClick={copy}
      className="zk-label mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-dashed border-border py-3 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />} {copied ? "Copied" : `Copy my partner link · ${code}`}
    </button>
  );
}
