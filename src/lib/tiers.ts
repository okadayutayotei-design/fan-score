import { prisma } from "@/lib/prisma";

export interface TierBenefitDef {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
}

export interface TierDefinition {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  minScore: number;
  sortOrder: number;
  description: string | null;
  benefits: TierBenefitDef[];
}

/**
 * Fetch all tier definitions from DB, ordered by sortOrder.
 */
export async function getTierDefinitions(): Promise<TierDefinition[]> {
  const tiers = await prisma.tier.findMany({
    include: { benefits: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
  return tiers;
}

/**
 * Determine which tier a fan belongs to based on their cumulative score.
 * Returns the highest-qualifying tier (highest minScore that the score exceeds).
 */
export function determineTier(
  cumulativeScore: number,
  tiers: TierDefinition[]
): TierDefinition | null {
  // Sort by minScore descending so we match the highest qualifying tier first
  const sorted = [...tiers].sort((a, b) => b.minScore - a.minScore);
  return sorted.find((t) => cumulativeScore >= t.minScore) ?? null;
}

/**
 * Get the next tier above the current one (the one to aim for).
 * Returns null if already at the top tier.
 */
export function getNextTier(
  currentTier: TierDefinition | null,
  tiers: TierDefinition[]
): TierDefinition | null {
  if (!currentTier) {
    // No current tier, return the lowest tier
    const sorted = [...tiers].sort((a, b) => a.minScore - b.minScore);
    return sorted[0] ?? null;
  }
  // Sort by sortOrder ascending (1 = highest tier)
  const sorted = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = sorted.findIndex((t) => t.id === currentTier.id);
  // The next higher tier has a lower sortOrder (earlier in the sorted array)
  return idx > 0 ? sorted[idx - 1] : null;
}

/**
 * Calculate progress percentage toward the next tier.
 * Returns 100 if already at the top tier.
 */
export function calculateTierProgress(
  cumulativeScore: number,
  currentTier: TierDefinition | null,
  nextTier: TierDefinition | null
): number {
  if (!nextTier) return 100; // Already at top tier
  if (!currentTier) return 0;
  const range = nextTier.minScore - currentTier.minScore;
  if (range <= 0) return 100;
  const progress =
    ((cumulativeScore - currentTier.minScore) / range) * 100;
  return Math.min(Math.max(progress, 0), 100);
}
