import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const benefits = await prisma.tierBenefit.findMany({
      where: { tierId: id },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(benefits);
  } catch (error) {
    console.error("GET /api/tiers/[id]/benefits error:", error);
    return NextResponse.json({ error: "特典の取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, sortOrder } = body;

    if (!title) {
      return NextResponse.json({ error: "特典名は必須です" }, { status: 400 });
    }

    const benefit = await prisma.tierBenefit.create({
      data: {
        tierId: id,
        title,
        description: description ?? null,
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json(benefit, { status: 201 });
  } catch (error) {
    console.error("POST /api/tiers/[id]/benefits error:", error);
    return NextResponse.json({ error: "特典の作成に失敗しました" }, { status: 500 });
  }
}
