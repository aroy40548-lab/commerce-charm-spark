const LAUNCHER_TEXT = "ai fitting room";
const WIDGET_IFRAME = "#__decart-tryon-widget iframe";
let imageHandoffId = 0;

function collectRoots(root: Document | ShadowRoot, acc: Array<Document | ShadowRoot>) {
  acc.push(root);
  root.querySelectorAll("*").forEach((el) => {
    const sr = (el as HTMLElement).shadowRoot;
    if (sr) collectRoots(sr, acc);
  });
}

function findLauncher(): HTMLElement | null {
  const roots: Array<Document | ShadowRoot> = [];
  collectRoots(document, roots);
  for (const root of roots) {
    const candidates = root.querySelectorAll<HTMLElement>("button, a, div[role='button'], [class*='anywear']");
    for (const el of Array.from(candidates)) {
      const text = (el.textContent ?? "").trim().toLowerCase();
      if (text.includes(LAUNCHER_TEXT)) return el;
    }
  }
  return null;
}

/** Hide the injected floating launcher while keeping the modal usable. */
export function observeDecartLauncher() {
  if (typeof window === "undefined") return () => {};
  const hide = () => {
    const el = findLauncher();
    if (el) {
      el.style.setProperty("opacity", "0", "important");
      el.style.setProperty("pointer-events", "none", "important");
      el.style.setProperty("position", "fixed", "important");
      el.style.setProperty("z-index", "-9999", "important");
    }
  };
  hide();
  const observer = new MutationObserver(hide);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

function handOffProductImage(productImageUrl: string) {
  const handoffId = ++imageHandoffId;
  const tryonId = `zankyo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  let delivered = false;
  let loadTimer: number | undefined;

  const deliver = (iframe: HTMLIFrameElement) => {
    if (delivered || handoffId !== imageHandoffId || !iframe.contentWindow) return;
    delivered = true;
    iframe.contentWindow.postMessage(
      {
        type: "DECART_AUTO_START",
        productImageUrl,
        tryonId,
        imageSource: "zankyo_product_button",
        pageUrl: window.location.href,
      },
      "*",
    );
  };

  const connect = () => {
    const iframe = document.querySelector<HTMLIFrameElement>(WIDGET_IFRAME);
    if (!iframe) return false;
    iframe.addEventListener("load", () => {
      window.clearTimeout(loadTimer);
      loadTimer = window.setTimeout(() => deliver(iframe), 150);
    }, { once: true });
    loadTimer = window.setTimeout(() => deliver(iframe), 700);
    return true;
  };

  if (connect()) return;

  const observer = new MutationObserver(() => {
    if (!connect()) return;
    observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 5000);
}

const WAIT_MESSAGE = "Please wait a moment while AI processes your request";
const WAIT_MS = 7000;
const HEADER_PX = 48;

/** Cover Decart's queue screen with our own waiting message for a short time. */
function showWaitingCover() {
  document.getElementById("zk-tryon-wait")?.remove();
  const cover = document.createElement("div");
  cover.id = "zk-tryon-wait";
  cover.setAttribute("role", "status");
  cover.innerHTML = `<div class="zk-tryon-spin"></div><p>${WAIT_MESSAGE}</p>`;
  Object.assign(cover.style, {
    position: "fixed", zIndex: "2147483647", display: "none", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: "16px", padding: "24px",
    textAlign: "center", background: "#080808", color: "#F4F4F0",
    font: "500 15px/1.4 Barlow, system-ui, sans-serif", letterSpacing: "0.02em",
  } as Partial<CSSStyleDeclaration>);
  if (!document.getElementById("zk-tryon-wait-style")) {
    const style = document.createElement("style");
    style.id = "zk-tryon-wait-style";
    style.textContent = `.zk-tryon-spin{width:36px;height:36px;border:3px solid rgba(244,244,240,.2);border-top-color:#8E1B2B;border-radius:50%;animation:zkspin .8s linear infinite}@keyframes zkspin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.zk-tryon-spin{animation-duration:3s}}`;
    document.head.appendChild(style);
  }
  document.body.appendChild(cover);

  const started = Date.now();
  let raf = 0;
  const sync = () => {
    const iframe = document.querySelector<HTMLIFrameElement>(WIDGET_IFRAME);
    const r = iframe?.getBoundingClientRect();
    if (Date.now() - started > WAIT_MS || (Date.now() - started > 4000 && (!r || r.width < 50))) {
      cover.remove();
      return;
    }
    if (r && r.width > 50 && r.height > HEADER_PX + 50) {
      Object.assign(cover.style, {
        display: "flex", left: `${r.left}px`, top: `${r.top + HEADER_PX}px`,
        width: `${r.width}px`, height: `${r.height - HEADER_PX}px`,
      });
    } else cover.style.display = "none";
    raf = requestAnimationFrame(sync);
  };
  raf = requestAnimationFrame(sync);
  window.setTimeout(() => { cancelAnimationFrame(raf); cover.remove(); }, WAIT_MS + 500);
}

/** Open Decart Anywear and preload the current product photo when available. */
export function openDecartTryOn(productImageUrl?: string): boolean {
  const el = findLauncher();
  if (!el) return false;
  el.style.setProperty("pointer-events", "auto", "important");
  el.click();
  window.setTimeout(() => el.style.setProperty("pointer-events", "none", "important"), 300);
  try { showWaitingCover(); } catch { /* never block the fitting room */ }
  if (productImageUrl) handOffProductImage(productImageUrl);
  return true;
}
