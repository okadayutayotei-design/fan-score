import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; benefitId: string }> }
) {
  try {
    const { benefitId } = await params;
    const body = await request.json();
    const { title, description, sortOrder } = body;

    const benefit = await prisma.tierBenefit.update({
      where: { id: benefitId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(benefit);
  } catch (error) {
    console.error("PUT /api/tiers/[id]/benefits/[benefitId] error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; benefitId: string }> }
) {
  try {
    const { benefitId } = await params;
    await prisma.tierBenefit.delete({ where: { id: benefitId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tiers/[id]/benefits/[benefitId] error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
