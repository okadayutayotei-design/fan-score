import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getScoringSettings, getAreaMultiplierMap } from "@/lib/settings";
import { calculateCumulativeScores } from "@/lib/scoring";
import { getTierDefinitions, determineTier, sortTiersDescending } from "@/lib/tiers";

export const dynamic = "force-dynamic";

/**
 * Lightweight endpoint to get tier info for all fans.
 * Unlike /api/ranking, this skips ranking/sorting/sales calculations.
 */
export async function GET() {
  try {
    const [allLogs, fans, settings, multipliers, tiers] = await Promise.all([
      prisma.eventLog.findMany(),
      prisma.fan.findMany(),
      getScoringSettings(),
      getAreaMultiplierMap(),
      getTierDefinitions(),
    ]);

    const fanData = fans.map((f) => ({
      id: f.id,
      displayName: f.displayName,
      residenceArea: f.residenceArea,
    }));

    const logData = allLogs.map((l) => ({
      id: l.id,
      date: l.date,
      fanId: l.fanId,
      eventType: l.eventType,
      venueArea: l.venueArea,
      attendCount: l.attendCount,
      merchAmountJPY: l.merchAmountJPY,
      superchatAmountJPY: l.superchatAmountJPY,
    }));

    const scores = calculateCumulativeScores(logData, fanData, settings, multipliers);
    const sortedTiers = sortTiersDescending(tiers);

    const result: Record<string, { name: string; slug: string; color: string; icon: string } | null> = {};
    for (const s of scores) {
      const tier = determineTier(s.totalScore, sortedTiers, true);
      result[s.fanId] = tier
        ? { name: tier.name, slug: tier.slug, color: tier.color, icon: tier.icon }
        : null;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/fans/tiers error:", error);
    return NextResponse.json(
      { error: "ティア情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
