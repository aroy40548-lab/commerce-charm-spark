import { Link } from "@tanstack/react-router";
import { ZankyoStar } from "@/components/ZankyoStar";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-ink text-background">
      <div className="mx-auto grid max-w-[1600px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <ZankyoStar className="h-6 w-6" />
            <span className="zk-display text-2xl leading-none">ZANKYO</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-background/60">
            More than just clothes. Built for a different generation.
          </p>
        </div>
        <div>
          <h3 className="zk-label text-[11px] text-background/50">Shop</h3>
          <ul className="mt-3 space-y-2 text-sm text-background/80">
            <li><Link to="/shop">All products</Link></li>
            <li><Link to="/collections">Collections</Link></li>
            <li><Link to="/about">About</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="zk-label text-[11px] text-background/50">Support</h3>
          <ul className="mt-3 space-y-2 text-sm text-background/80">
            <li><Link to="/returns">Return &amp; Refund Policy</Link></li>
            <li><Link to="/terms">Terms &amp; Conditions</Link></li>
          </ul>
          <p className="mt-4 text-sm text-background/70">Customer Support &amp; Questions? Reach us at <a href="mailto:help@zankyo.in" className="underline underline-offset-4">help@zankyo.in</a></p>
        </div>
      </div>
      <div className="border-t border-background/10 px-4 py-5 text-center text-xs text-background/40 sm:px-6">
        © {new Date().getFullYear()} ZANKYO. Wear your story.
      </div>
    </footer>
  );
}
