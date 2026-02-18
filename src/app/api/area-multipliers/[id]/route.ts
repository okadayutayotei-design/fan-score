import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { fromArea, toArea, multiplier } = body;

    if (typeof multiplier !== "number" || multiplier <= 0) {
      return NextResponse.json(
        { error: "倍率は正の数値を入力してください" },
        { status: 400 }
      );
    }

    const result = await prisma.areaMultiplier.update({
      where: { id: params.id },
      data: { fromArea, toArea, multiplier },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("PUT /api/area-multipliers/[id] error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.areaMultiplier.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/area-multipliers/[id] error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
