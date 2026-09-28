import { Link } from "@tanstack/react-router";
import fullDarkLogo from "@/assets/zankyo-full-dark.png.asset.json";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-ink text-background">
      <div className="mx-auto grid max-w-[1600px] gap-9 px-4 py-12 sm:px-6 sm:py-14 md:grid-cols-3">
        <div>
          <Link to="/" className="block w-fit" aria-label="ZANKYO home">
            <img
              src={fullDarkLogo.url}
              alt="ZANKYO 残響 — More than just clothes"
              width={1835}
              height={1373}
              className="h-auto w-52 object-contain sm:w-60"
            />
          </Link>
        </div>
        <div>
          <h3 className="zk-label text-[11px] text-background/50">Shop</h3>
          <ul className="mt-2 text-sm text-background/80">
            <li><Link to="/shop" className="flex min-h-10 items-center">All products</Link></li>
            <li><Link to="/collections" className="flex min-h-10 items-center">Collections</Link></li>
            <li><Link to="/about" className="flex min-h-10 items-center">About</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="zk-label text-[11px] text-background/50">Support</h3>
          <ul className="mt-2 text-sm text-background/80">
            <li><Link to="/returns" className="flex min-h-10 items-center">Return &amp; Refund Policy</Link></li>
            <li><Link to="/terms" className="flex min-h-10 items-center">Terms &amp; Conditions</Link></li>
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
