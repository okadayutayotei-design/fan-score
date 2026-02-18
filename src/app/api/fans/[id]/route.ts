import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const fan = await prisma.fan.findUnique({
      where: { id: params.id },
    });
    if (!fan) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }
    return NextResponse.json(fan);
  } catch (error) {
    console.error("GET /api/fans/[id] error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { displayName, residenceArea, memo } = body;

    if (!displayName?.trim()) {
      return NextResponse.json({ error: "表示名は必須です" }, { status: 400 });
    }
    if (!residenceArea) {
      return NextResponse.json({ error: "居住エリアは必須です" }, { status: 400 });
    }

    const fan = await prisma.fan.update({
      where: { id: params.id },
      data: {
        displayName: displayName.trim(),
        residenceArea,
        memo: memo || null,
      },
    });

    return NextResponse.json(fan);
  } catch (error) {
    console.error("PUT /api/fans/[id] error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.fan.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/fans/[id] error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
