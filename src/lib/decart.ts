const LAUNCHER_TEXT = "ai fitting room";

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

/** Programmatically open the Decart Anywear fitting room. */
export function openDecartTryOn(): boolean {
  const el = findLauncher();
  if (!el) return false;
  el.style.setProperty("pointer-events", "auto", "important");
  el.click();
  window.setTimeout(() => el.style.setProperty("pointer-events", "none", "important"), 300);
  return true;
}
