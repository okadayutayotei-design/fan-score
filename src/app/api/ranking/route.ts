import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getScoringSettings, getAreaMultiplierMap } from "@/lib/settings";
import { calculateMonthlyScores, assignRanks } from "@/lib/scoring";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

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

    const [logs, fans, settings, multipliers] = await Promise.all([
      prisma.eventLog.findMany({
        where: { date: { gte: startDate, lte: endDate } },
      }),
      prisma.fan.findMany(),
      getScoringSettings(),
      getAreaMultiplierMap(),
    ]);

    const fanData = fans.map((f) => ({
      id: f.id,
      displayName: f.displayName,
      residenceArea: f.residenceArea,
    }));

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

    const scores = calculateMonthlyScores(
      logData,
      fanData,
      settings,
      multipliers
    );
    const ranked = assignRanks(scores);

    return NextResponse.json(ranked);
  } catch (error) {
    console.error("GET /api/ranking error:", error);
    return NextResponse.json(
      { error: "ランキングの取得に失敗しました" },
      { status: 500 }
    );
  }
}
