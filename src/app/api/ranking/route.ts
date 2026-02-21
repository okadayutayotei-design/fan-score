import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getScoringSettings, getAreaMultiplierMap } from "@/lib/settings";
import {
  calculateMonthlyScores,
  calculateCumulativeScores,
  assignRanks,
} from "@/lib/scoring";
import { getTierDefinitions, determineTier, sortTiersDescending } from "@/lib/tiers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const mode = searchParams.get("mode") || "monthly";

    // Always fetch all logs once — filter for monthly in JS to avoid duplicate DB queries
    const [fans, allLogs, settings, multipliers, tiers] = await Promise.all([
      prisma.fan.findMany(),
      prisma.eventLog.findMany(),
      getScoringSettings(),
      getAreaMultiplierMap(),
      getTierDefinitions(),
    ]);

    const fanData = fans.map((f) => ({
      id: f.id,
      displayName: f.displayName,
      residenceArea: f.residenceArea,
    }));

    const allLogData = allLogs.map((l) => ({
      id: l.id,
      date: l.date,
      fanId: l.fanId,
      eventType: l.eventType,
      venueArea: l.venueArea,
      attendCount: l.attendCount,
      merchAmountJPY: l.merchAmountJPY,
      superchatAmountJPY: l.superchatAmountJPY,
    }));

    // For monthly mode, filter logs in JS; for cumulative, use all
    let logData;
    if (mode === "cumulative") {
      logData = allLogData;
    } else {
      let startDate: Date;
      let endDate: Date;
      if (month) {
        const [year, mon] = month.split("-").map(Number);
        startDate = new Date(year, mon - 1, 1);
        endDate = new Date(year, mon, 0, 23, 59, 59);
      } else {
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      }
      logData = allLogData.filter(
        (l) => l.date >= startDate && l.date <= endDate
      );
    }

    const calcFn =
      mode === "cumulative"
        ? calculateCumulativeScores
        : calculateMonthlyScores;
    const scores = calcFn(logData, fanData, settings, multipliers);
    const ranked = assignRanks(scores);

    // Cumulative scores for tier — reuse allLogData (no second DB query)
    const cumulativeScores =
      mode === "cumulative"
        ? scores
        : calculateCumulativeScores(allLogData, fanData, settings, multipliers);

    const cumulativeMap = new Map(
      cumulativeScores.map((s) => [s.fanId, s.totalScore])
    );

    // Calculate sales amounts per fan
    const fanSalesMap = new Map<string, number>();
    for (const l of logData) {
      const current = fanSalesMap.get(l.fanId) ?? 0;
      fanSalesMap.set(l.fanId, current + l.merchAmountJPY + l.superchatAmountJPY);
    }

    const sortedTiers = sortTiersDescending(tiers);

    const rankedWithTier = ranked.map((r) => {
      const cumScore = cumulativeMap.get(r.fanId) ?? 0;
      const tier = determineTier(cumScore, sortedTiers, true);
      return {
        ...r,
        cumulativeTotalScore: cumScore,
        salesAmount: fanSalesMap.get(r.fanId) ?? 0,
        tier: tier
          ? {
              name: tier.name,
              slug: tier.slug,
              color: tier.color,
              icon: tier.icon,
            }
          : null,
      };
    });

    return NextResponse.json(rankedWithTier);
  } catch (error) {
    console.error("GET /api/ranking error:", error);
    return NextResponse.json(
      { error: "ランキングの取得に失敗しました" },
      { status: 500 }
    );
  }
}
