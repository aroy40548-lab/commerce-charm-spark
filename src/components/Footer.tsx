import { Instagram, MessageCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import fullDarkLogo from "@/assets/zankyo-full-dark.png.asset.json";

const INSTAGRAM_URL = "https://www.instagram.com/wearzankyo?stkn=Zmx2ZjA3YmtqbQ%3D%3D&utm_source=qr";
const WHATSAPP_URL = "https://chat.whatsapp.com/JGEqcXoZEsi5NYc9hVBRqI";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-background/10 bg-ink text-background">
      <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-x-6 gap-y-10 px-4 py-10 sm:px-6 sm:py-12 md:grid-cols-[1.15fr_0.7fr_1fr_0.8fr] md:gap-8 lg:px-10">
        <div className="col-span-2 md:col-span-1">
          <Link to="/" className="block w-fit" aria-label="ZANKYO home">
            <img
              src={fullDarkLogo.url}
              alt="ZANKYO 残響 — More than just clothes"
              width={1835}
              height={1373}
              className="h-auto w-40 object-contain sm:w-44"
            />
          </Link>
          <p className="zk-label mt-4 text-[9px] text-background/40">Streetwear / India</p>
        </div>
        <div>
          <h3 className="zk-label border-b border-background/15 pb-3 text-[9px] text-background/45">Shop</h3>
          <ul className="mt-2 text-[13px] text-background/75">
            <li><Link to="/shop" className="flex min-h-10 items-center transition-colors hover:text-background">All products</Link></li>
            <li><Link to="/collections" className="flex min-h-10 items-center transition-colors hover:text-background">Collections</Link></li>
            <li><Link to="/about" className="flex min-h-10 items-center transition-colors hover:text-background">About</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="zk-label border-b border-background/15 pb-3 text-[9px] text-background/45">Help</h3>
          <ul className="mt-2 text-[13px] text-background/75">
            <li><Link to="/returns" className="flex min-h-10 items-center transition-colors hover:text-background">Return &amp; Refund Policy</Link></li>
            <li><Link to="/terms" className="flex min-h-10 items-center transition-colors hover:text-background">Terms &amp; Conditions</Link></li>
          </ul>
          <a href="mailto:help@zankyo.in" className="mt-3 inline-flex min-h-10 items-center text-[13px] text-background/55 underline underline-offset-4 transition-colors hover:text-background">help@zankyo.in</a>
        </div>
        <div>
          <h3 className="zk-label border-b border-background/15 pb-3 text-[9px] text-background/45">Follow us</h3>
          <div className="mt-2 flex flex-col text-[13px] text-background/75">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ZANKYO on Instagram (opens in a new tab)"
              className="flex min-h-10 items-center gap-2 transition-colors hover:text-background"
          >
            <Instagram className="h-4 w-4" aria-hidden="true" />
            <span>Instagram</span>
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join the ZANKYO WhatsApp community (opens in a new tab)"
              className="flex min-h-10 items-center gap-2 transition-colors hover:text-background"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span>WhatsApp</span>
          </a>
          </div>
        </div>
      </div>
      <div className="border-t border-background/15 px-4 py-5 sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 text-[10px] text-background/35 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} ZANKYO. Wear your story.</span>
          <span className="zk-label text-[8px]">More than just clothes</span>
        </div>
      </div>
    </footer>
  );
}
