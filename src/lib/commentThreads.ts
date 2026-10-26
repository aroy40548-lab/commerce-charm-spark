/** Instagram-style threads: one level of replies under each top-level comment, replies oldest first. */
export interface ThreadItem { id: string; parentId: string | null; createdAt: string }

export function toThreads<T extends ThreadItem>(list: T[], topNewestFirst = false): Array<T & { replies: T[] }> {
  const ids = new Set(list.map((c) => c.id));
  const tops = list.filter((c) => !c.parentId || !ids.has(c.parentId));
  const by = (a: T, b: T) => a.createdAt.localeCompare(b.createdAt);
  tops.sort(topNewestFirst ? (a, b) => by(b, a) : by);
  return tops.map((t) => ({ ...t, replies: list.filter((c) => c.parentId === t.id).sort(by) }));
}
