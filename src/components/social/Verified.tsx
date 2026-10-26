/** Red glowing verified tick, given by ZANKYO staff from the admin panel. */
export function VerifiedTick({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Verified" className={`zk-verified inline-block shrink-0 ${className}`}>
      <path fill="currentColor" d="M12 1.5l2.6 1.9 3.2-.2 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.2L12 22.5l-2.6-1.9-3.2.2-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.2z" />
      <path fill="none" stroke="var(--accent-foreground)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M7.8 12.3l2.8 2.8 5.6-5.8" />
    </svg>
  );
}
