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

/** Open Decart Anywear and preload the current product photo when available. */
export function openDecartTryOn(productImageUrl?: string): boolean {
  const el = findLauncher();
  if (!el) return false;
  el.style.setProperty("pointer-events", "auto", "important");
  el.click();
  window.setTimeout(() => el.style.setProperty("pointer-events", "none", "important"), 300);
  if (productImageUrl) handOffProductImage(productImageUrl);
  return true;
}
