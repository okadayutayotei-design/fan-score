import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const multipliers = await prisma.areaMultiplier.findMany({
      orderBy: [{ fromArea: "asc" }, { toArea: "asc" }],
    });
    return NextResponse.json(multipliers);
  } catch (error) {
    console.error("GET /api/area-multipliers error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fromArea, toArea, multiplier } = body;

    if (!fromArea || !toArea) {
      return NextResponse.json(
        { error: "出発エリアと到着エリアは必須です" },
        { status: 400 }
      );
    }
    if (typeof multiplier !== "number" || multiplier <= 0) {
      return NextResponse.json(
        { error: "倍率は正の数値を入力してください" },
        { status: 400 }
      );
    }

    const result = await prisma.areaMultiplier.upsert({
      where: { fromArea_toArea: { fromArea, toArea } },
      update: { multiplier },
      create: { fromArea, toArea, multiplier },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/area-multipliers error:", error);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
