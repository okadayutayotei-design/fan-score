import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tiers = await prisma.tier.findMany({
      include: { benefits: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(tiers);
  } catch (error) {
    console.error("GET /api/tiers error:", error);
    return NextResponse.json(
      { error: "ティアの取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, color, icon, minScore, sortOrder, description } = body;

    if (!name || !slug || !color || !icon || minScore == null || sortOrder == null) {
      return NextResponse.json(
        { error: "必須項目が不足しています" },
        { status: 400 }
      );
    }

    const tier = await prisma.tier.create({
      data: { name, slug, color, icon, minScore, sortOrder, description },
      include: { benefits: true },
    });

    return NextResponse.json(tier, { status: 201 });
  } catch (error) {
    console.error("POST /api/tiers error:", error);
    return NextResponse.json(
      { error: "ティアの作成に失敗しました" },
      { status: 500 }
    );
  }
}
