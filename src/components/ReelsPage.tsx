import { ReelsFeed } from "@/components/ReelsFeed";

/** Full-height reel viewer: fills the phone screen above the tab bar, phone-shaped column on laptops. */
export function ReelsPage({ startId }: { startId?: string }) {
  return (
    <div className="zk-hide-vton bg-ink lg:py-6">
      <div className="relative mx-auto h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] w-full max-w-[460px] lg:h-[calc(100dvh-10rem)] lg:min-h-[560px]">
        <ReelsFeed startId={startId} />
      </div>
    </div>
  );
}
