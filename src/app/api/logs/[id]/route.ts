import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const log = await prisma.eventLog.findUnique({
      where: { id: params.id },
      include: { fan: true },
    });
    if (!log) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }
    return NextResponse.json(log);
  } catch (error) {
    console.error("GET /api/logs/[id] error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      date,
      fanId,
      eventType,
      venueArea,
      attendCount,
      merchAmountJPY,
      superchatAmountJPY,
      note,
    } = body;

    const data: Record<string, unknown> = {};
    if (date) data.date = new Date(date);
    if (fanId) data.fanId = fanId;
    if (eventType) data.eventType = eventType;
    if (venueArea) data.venueArea = venueArea;
    if (attendCount !== undefined) data.attendCount = Number(attendCount);
    if (merchAmountJPY !== undefined)
      data.merchAmountJPY = Number(merchAmountJPY);
    if (superchatAmountJPY !== undefined)
      data.superchatAmountJPY = Number(superchatAmountJPY);
    if (note !== undefined) data.note = note || null;

    const log = await prisma.eventLog.update({
      where: { id: params.id },
      data,
      include: { fan: true },
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error("PUT /api/logs/[id] error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.eventLog.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/logs/[id] error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
