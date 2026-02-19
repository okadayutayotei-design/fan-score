import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tier = await prisma.tier.findUnique({
      where: { id },
      include: { benefits: { orderBy: { sortOrder: "asc" } } },
    });
    if (!tier) {
      return NextResponse.json({ error: "ティアが見つかりません" }, { status: 404 });
    }
    return NextResponse.json(tier);
  } catch (error) {
    console.error("GET /api/tiers/[id] error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, slug, color, icon, minScore, sortOrder, description } = body;

    const tier = await prisma.tier.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(minScore !== undefined && { minScore }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(description !== undefined && { description }),
      },
      include: { benefits: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json(tier);
  } catch (error) {
    console.error("PUT /api/tiers/[id] error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.tier.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tiers/[id] error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
