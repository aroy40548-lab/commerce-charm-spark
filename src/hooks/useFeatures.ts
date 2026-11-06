import { useQuery } from "@tanstack/react-query";
import { getFeatures } from "@/lib/features.functions";
import { mergeFeatures, type Features } from "@/lib/features";

const ALL_ON = mergeFeatures({});

/** Live feature switches — re-checked every 10 seconds and on tab focus. */
export function useFeatures(): Features {
  const q = useQuery({ queryKey: ["features"], queryFn: () => getFeatures(), refetchInterval: 10_000, refetchOnWindowFocus: true, staleTime: 5_000 });
  return q.data ?? ALL_ON;
}
