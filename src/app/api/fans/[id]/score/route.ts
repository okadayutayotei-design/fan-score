import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getScoringSettings, getAreaMultiplierMap } from "@/lib/settings";
import { calculateCumulativeScores } from "@/lib/scoring";
import {
  getTierDefinitions,
  determineTier,
  getNextTier,
  calculateTierProgress,
} from "@/lib/tiers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const fan = await prisma.fan.findUnique({ where: { id } });
    if (!fan) {
      return NextResponse.json(
        { error: "ファンが見つかりません" },
        { status: 404 }
      );
    }

    const [allLogs, settings, multipliers, tiers] = await Promise.all([
      prisma.eventLog.findMany({ where: { fanId: id }, orderBy: { date: "asc" } }),
      getScoringSettings(),
      getAreaMultiplierMap(),
      getTierDefinitions(),
    ]);

    const fanData = [
      {
        id: fan.id,
        displayName: fan.displayName,
        residenceArea: fan.residenceArea,
      },
    ];

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

    // Cumulative score
    const cumulativeResults = calculateCumulativeScores(
      logData,
      fanData,
      settings,
      multipliers
    );
    const cumulativeScore = cumulativeResults[0] ?? {
      totalScore: 0,
      actionScore: 0,
      moneyScore: 0,
      travelContribution: 0,
    };

    // Current month score
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const monthlyLogs = logData.filter(
      (l) => l.date >= startOfMonth && l.date <= endOfMonth
    );
    const monthlyResults = calculateCumulativeScores(
      monthlyLogs,
      fanData,
      settings,
      multipliers
    );
    const currentMonthScore = monthlyResults[0] ?? {
      totalScore: 0,
      actionScore: 0,
      moneyScore: 0,
      travelContribution: 0,
    };

    // Tier info
    const currentTier = determineTier(cumulativeScore.totalScore, tiers);
    const nextTier = getNextTier(currentTier, tiers);
    const tierProgress = calculateTierProgress(
      cumulativeScore.totalScore,
      currentTier,
      nextTier
    );

    // Monthly history (last 12 months)
    const monthlyHistory: {
      month: string;
      totalScore: number;
      actionScore: number;
      moneyScore: number;
      travelContribution: number;
    }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const mLogs = logData.filter((l) => l.date >= mStart && l.date <= mEnd);
      const mMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      if (mLogs.length > 0) {
        const mResults = calculateCumulativeScores(
          mLogs,
          fanData,
          settings,
          multipliers
        );
        const r = mResults[0];
        monthlyHistory.push({
          month: mMonth,
          totalScore: r?.totalScore ?? 0,
          actionScore: r?.actionScore ?? 0,
          moneyScore: r?.moneyScore ?? 0,
          travelContribution: r?.travelContribution ?? 0,
        });
      } else {
        monthlyHistory.push({
          month: mMonth,
          totalScore: 0,
          actionScore: 0,
          moneyScore: 0,
          travelContribution: 0,
        });
      }
    }

    // Recent logs (last 20)
    const recentLogs = allLogs.slice(-20).reverse();

    // Stats
    const totalMerchSpent = allLogs.reduce((s, l) => s + l.merchAmountJPY, 0);
    const totalSuperchatSpent = allLogs.reduce((s, l) => s + l.superchatAmountJPY, 0);
    const eventTypeBreakdown: Record<string, number> = {};
    for (const log of allLogs) {
      eventTypeBreakdown[log.eventType] =
        (eventTypeBreakdown[log.eventType] ?? 0) + 1;
    }

    return NextResponse.json({
      fan: {
        id: fan.id,
        displayName: fan.displayName,
        residenceArea: fan.residenceArea,
        memo: fan.memo,
        createdAt: fan.createdAt,
      },
      cumulativeScore: {
        totalScore: cumulativeScore.totalScore,
        actionScore: cumulativeScore.actionScore,
        moneyScore: cumulativeScore.moneyScore,
        travelContribution: cumulativeScore.travelContribution,
      },
      currentMonthScore: {
        totalScore: currentMonthScore.totalScore,
        actionScore: currentMonthScore.actionScore,
        moneyScore: currentMonthScore.moneyScore,
        travelContribution: currentMonthScore.travelContribution,
      },
      currentTier,
      nextTier,
      tierProgress,
      monthlyHistory,
      recentLogs,
      stats: {
        totalEvents: allLogs.length,
        totalMerchSpent,
        totalSuperchatSpent,
        firstEventDate: allLogs.length > 0 ? allLogs[0].date : null,
        lastEventDate:
          allLogs.length > 0 ? allLogs[allLogs.length - 1].date : null,
        eventTypeBreakdown,
      },
    });
  } catch (error) {
    console.error("GET /api/fans/[id]/score error:", error);
    return NextResponse.json(
      { error: "スコア情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
