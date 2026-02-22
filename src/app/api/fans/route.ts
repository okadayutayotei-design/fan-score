import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getScoringSettings, getAreaMultiplierMap } from "@/lib/settings";
import { calculateCumulativeScores } from "@/lib/scoring";
import { getTierDefinitions, determineTier, sortTiersDescending } from "@/lib/tiers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const includeTiers = searchParams.get("includeTiers") === "1";

    const fans = await prisma.fan.findMany({
      where: search
        ? { displayName: { contains: search } }
        : undefined,
      orderBy: { displayName: "asc" },
    });

    if (!includeTiers) {
      return NextResponse.json(fans);
    }

    // Compute tiers inline to avoid a separate API call
    const [allLogs, settings, multipliers, tiers] = await Promise.all([
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

    const tierMap: Record<string, { name: string; slug: string; color: string; icon: string } | null> = {};
    for (const s of scores) {
      const tier = determineTier(s.totalScore, sortedTiers, true);
      tierMap[s.fanId] = tier
        ? { name: tier.name, slug: tier.slug, color: tier.color, icon: tier.icon }
        : null;
    }

    return NextResponse.json({ fans, tiers: tierMap });
  } catch (error) {
    console.error("GET /api/fans error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { displayName, residenceArea, memo } = body;

    if (!displayName?.trim()) {
      return NextResponse.json({ error: "表示名は必須です" }, { status: 400 });
    }
    if (!residenceArea) {
      return NextResponse.json({ error: "居住エリアは必須です" }, { status: 400 });
    }

    const fan = await prisma.fan.create({
      data: {
        displayName: displayName.trim(),
        residenceArea,
        memo: memo || null,
      },
    });

    return NextResponse.json(fan, { status: 201 });
  } catch (error) {
    console.error("POST /api/fans error:", error);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
