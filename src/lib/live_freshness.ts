/** Metadata for values whose completed responses deliberately bypass the cache. */
export function liveFreshness(sourceUpdatedAt: string | null): {
  fetched_at: string;
  source_updated_at: string | null;
  source_age_ms: number | null;
  completed_cache: "bypassed";
} {
  const fetchedAt = new Date();
  const sourceMs = sourceUpdatedAt ? Date.parse(sourceUpdatedAt) : NaN;
  return {
    fetched_at: fetchedAt.toISOString(),
    source_updated_at: sourceUpdatedAt,
    source_age_ms: Number.isFinite(sourceMs) ? Math.max(0, fetchedAt.getTime() - sourceMs) : null,
    completed_cache: "bypassed",
  };
}
