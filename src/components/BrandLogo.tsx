import compactLightLogo from "@/assets/zankyo-compact-light.png.asset.json";
import compactDarkLogo from "@/assets/zankyo-compact-dark.png.asset.json";

/** ZANKYO icon + wordmark, swapping artwork for light/dark themes. */
export function BrandLogo({ className = "w-32" }: { className?: string }) {
  return (
    <>
      <img src={compactLightLogo.url} alt="ZANKYO 残響" width={700} height={176} className={`h-auto object-contain dark:hidden ${className}`} />
      <img src={compactDarkLogo.url} alt="" aria-hidden="true" width={700} height={176} className={`hidden h-auto object-contain dark:block ${className}`} />
    </>
  );
}

/** Icon only (the tab icon). */
export function BrandIcon({ className = "h-8 w-8" }: { className?: string }) {
  return <img src="/favicon.png" alt="ZANKYO" width={64} height={64} className={`object-contain ${className}`} />;
}
