import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_EVENT_TYPES = ["PaidLive", "FreeLive", "PaidStream", "YouTube"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const fanId = searchParams.get("fanId");

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

    const where: Record<string, unknown> = {
      date: { gte: startDate, lte: endDate },
    };
    if (fanId) {
      where.fanId = fanId;
    }

    const logs = await prisma.eventLog.findMany({
      where,
      include: { fan: true },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("GET /api/logs error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      date,
      fanId,
      eventType,
      venueArea,
      attendCount = 1,
      merchAmountJPY = 0,
      superchatAmountJPY = 0,
      note,
    } = body;

    // Validation
    if (!date) {
      return NextResponse.json({ error: "日付は必須です" }, { status: 400 });
    }
    if (!fanId) {
      return NextResponse.json({ error: "ファンは必須です" }, { status: 400 });
    }
    if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { error: "有効なイベント種別を選択してください" },
        { status: 400 }
      );
    }
    if (!venueArea) {
      return NextResponse.json({ error: "会場エリアは必須です" }, { status: 400 });
    }
    if (attendCount < 1) {
      return NextResponse.json(
        { error: "参加回数は1以上にしてください" },
        { status: 400 }
      );
    }
    if (merchAmountJPY < 0) {
      return NextResponse.json(
        { error: "物販金額は0以上にしてください" },
        { status: 400 }
      );
    }
    if (superchatAmountJPY < 0) {
      return NextResponse.json(
        { error: "スパチャ金額は0以上にしてください" },
        { status: 400 }
      );
    }

    // Check fan exists
    const fan = await prisma.fan.findUnique({ where: { id: fanId } });
    if (!fan) {
      return NextResponse.json(
        { error: "指定されたファンが見つかりません" },
        { status: 404 }
      );
    }

    // Determine venueArea for online events
    const finalVenueArea =
      eventType === "PaidStream" || eventType === "YouTube"
        ? "ONLINE"
        : venueArea;

    const log = await prisma.eventLog.create({
      data: {
        date: new Date(date),
        fanId,
        eventType,
        venueArea: finalVenueArea,
        attendCount: Number(attendCount),
        merchAmountJPY: Number(merchAmountJPY),
        superchatAmountJPY: Number(superchatAmountJPY),
        note: note || null,
      },
      include: { fan: true },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("POST /api/logs error:", error);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
