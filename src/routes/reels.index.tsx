import { createFileRoute } from "@tanstack/react-router";
import { ReelsPage } from "@/components/ReelsPage";

export const Route = createFileRoute("/reels/")({
  head: () => ({
    meta: [
      { title: "Reels — ZANKYO fits by the community" },
      { name: "description", content: "Watch ZANKYO streetwear reels from real customers and shop every fit in one tap." },
      { property: "og:title", content: "ZANKYO Reels" },
      { property: "og:description", content: "Streetwear fits from the ZANKYO community. Tap to shop the look." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://zankyo.in/reels" }],
  }),
  component: () => <ReelsPage />,
});
