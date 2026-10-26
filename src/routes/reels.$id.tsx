import { createFileRoute } from "@tanstack/react-router";
import { ReelsPage } from "@/components/ReelsPage";

export const Route = createFileRoute("/reels/$id")({
  head: () => ({
    meta: [
      { title: "Watch this ZANKYO reel" },
      { name: "description", content: "A ZANKYO streetwear fit from the community. Tap the product to shop the look." },
      { property: "og:title", content: "ZANKYO reel" },
      { property: "og:description", content: "Streetwear fit from the ZANKYO community — shop the look." },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReelById,
});

function ReelById() {
  const { id } = Route.useParams();
  return <ReelsPage startId={/^[0-9a-f-]{36}$/i.test(id) ? id : undefined} />;
}
