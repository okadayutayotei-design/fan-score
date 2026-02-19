import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getScoringSettings, getAreaMultiplierMap } from "@/lib/settings";
import {
  calculateMonthlyScores,
  calculateCumulativeScores,
  assignRanks,
} from "@/lib/scoring";
import { getTierDefinitions, determineTier } from "@/lib/tiers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const mode = searchParams.get("mode") || "monthly";

    const [fans, settings, multipliers, tiers] = await Promise.all([
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

    // Fetch logs based on mode
    let logs;
    if (mode === "cumulative") {
      logs = await prisma.eventLog.findMany();
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
        endDate = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59
        );
      }
      logs = await prisma.eventLog.findMany({
        where: { date: { gte: startDate, lte: endDate } },
      });
    }

    const logData = logs.map((l) => ({
      id: l.id,
      date: l.date,
      fanId: l.fanId,
      eventType: l.eventType,
      venueArea: l.venueArea,
      attendCount: l.attendCount,
      merchAmountJPY: l.merchAmountJPY,
      superchatAmountJPY: l.superchatAmountJPY,
    }));

    const calcFn =
      mode === "cumulative"
        ? calculateCumulativeScores
        : calculateMonthlyScores;
    const scores = calcFn(logData, fanData, settings, multipliers);
    const ranked = assignRanks(scores);

    // Compute cumulative scores for tier determination
    let cumulativeScores;
    if (mode === "cumulative") {
      cumulativeScores = scores;
    } else {
      const allLogs = await prisma.eventLog.findMany();
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
      cumulativeScores = calculateCumulativeScores(
        allLogData,
        fanData,
        settings,
        multipliers
      );
    }

    const cumulativeMap = new Map(
      cumulativeScores.map((s) => [s.fanId, s.totalScore])
    );

    // Calculate sales amounts per fan
    const fanSalesMap = new Map<string, number>();
    for (const l of logData) {
      const current = fanSalesMap.get(l.fanId) ?? 0;
      fanSalesMap.set(l.fanId, current + l.merchAmountJPY + l.superchatAmountJPY);
    }

    const rankedWithTier = ranked.map((r) => {
      const cumScore = cumulativeMap.get(r.fanId) ?? 0;
      const tier = determineTier(cumScore, tiers);
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
