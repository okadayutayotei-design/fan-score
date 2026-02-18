import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const fans = await prisma.fan.findMany({
      where: search
        ? { displayName: { contains: search } }
        : undefined,
      orderBy: { displayName: "asc" },
    });

    return NextResponse.json(fans);
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
