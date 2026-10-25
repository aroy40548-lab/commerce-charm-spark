import { Instagram, MessageCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import fullDarkLogo from "@/assets/zankyo-full-dark.png.asset.json";

const INSTAGRAM_URL = "https://www.instagram.com/wearzankyo?stkn=Zmx2ZjA3YmtqbQ%3D%3D&utm_source=qr";
const WHATSAPP_URL = "https://chat.whatsapp.com/JGEqcXoZEsi5NYc9hVBRqI";

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
            <li><Link to="/blog" className="flex min-h-10 items-center">Journal</Link></li>
            <li><Link to="/affiliate" className="flex min-h-10 items-center">Earn with ZANKYO</Link></li>
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
      <div className="border-t border-background/10 px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-center gap-3">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ZANKYO on Instagram (opens in a new tab)"
            className="flex min-h-11 items-center gap-2 rounded-full border border-background/20 px-5 py-2 text-sm text-background/80 transition-colors hover:bg-background/10 active:bg-background/10"
          >
            <Instagram className="h-4 w-4" aria-hidden="true" />
            <span>Instagram</span>
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join the ZANKYO WhatsApp community (opens in a new tab)"
            className="flex min-h-11 items-center gap-2 rounded-full border border-background/20 px-5 py-2 text-sm text-background/80 transition-colors hover:bg-background/10 active:bg-background/10"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>WhatsApp Community</span>
          </a>
        </div>
      </div>
      <div className="border-t border-background/10 px-4 py-5 text-center text-xs text-background/40 sm:px-6">
        © {new Date().getFullYear()} ZANKYO. Wear your story.
      </div>
    </footer>
  );
}
