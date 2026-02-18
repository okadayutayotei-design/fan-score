import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCSV, csvToObjects } from "@/lib/csv-parser";

const VALID_AREAS = [
  "KOBE",
  "OSAKA",
  "NARA",
  "TOKYO",
  "MITO",
  "SHIKOKU",
  "OTHER",
];

// エリアラベル→コード変換マップ
const AREA_LABEL_MAP: Record<string, string> = {
  神戸: "KOBE",
  大阪: "OSAKA",
  奈良: "NARA",
  東京: "TOKYO",
  水戸: "MITO",
  四国: "SHIKOKU",
  その他: "OTHER",
  KOBE: "KOBE",
  OSAKA: "OSAKA",
  NARA: "NARA",
  TOKYO: "TOKYO",
  MITO: "MITO",
  SHIKOKU: "SHIKOKU",
  OTHER: "OTHER",
};

// ヘッダーの別名マップ
const HEADER_ALIASES: Record<string, string> = {
  表示名: "displayName",
  名前: "displayName",
  ファン名: "displayName",
  displayName: "displayName",
  居住エリア: "residenceArea",
  エリア: "residenceArea",
  residenceArea: "residenceArea",
  メモ: "memo",
  memo: "memo",
  備考: "memo",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { csvText, dryRun = false } = body;

    if (!csvText || typeof csvText !== "string") {
      return NextResponse.json(
        { error: "CSVデータが必要です" },
        { status: 400 }
      );
    }

    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      return NextResponse.json(
        { error: "CSVにはヘッダー行と1行以上のデータが必要です" },
        { status: 400 }
      );
    }

    const objects = csvToObjects(rows);

    // ヘッダーを正規化
    const normalizedObjects = objects.map((obj) => {
      const normalized: Record<string, string> = {};
      for (const [key, value] of Object.entries(obj)) {
        const mappedKey = HEADER_ALIASES[key];
        if (mappedKey) {
          normalized[mappedKey] = value;
        }
      }
      return normalized;
    });

    // バリデーション
    const errors: { row: number; message: string }[] = [];
    const validFans: { displayName: string; residenceArea: string; memo: string | null }[] = [];

    normalizedObjects.forEach((obj, index) => {
      const rowNum = index + 2; // 1-indexed + header

      if (!obj.displayName?.trim()) {
        errors.push({ row: rowNum, message: "表示名が必要です" });
        return;
      }

      const areaInput = obj.residenceArea?.trim() || "";
      const areaCode = AREA_LABEL_MAP[areaInput];
      if (!areaCode || !VALID_AREAS.includes(areaCode)) {
        errors.push({
          row: rowNum,
          message: `不正なエリア: "${areaInput}" (使用可能: ${VALID_AREAS.join(", ")} または日本語名)`,
        });
        return;
      }

      validFans.push({
        displayName: obj.displayName.trim(),
        residenceArea: areaCode,
        memo: obj.memo?.trim() || null,
      });
    });

    if (dryRun) {
      return NextResponse.json({
        total: normalizedObjects.length,
        valid: validFans.length,
        errors,
        preview: validFans.slice(0, 10),
      });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "バリデーションエラーがあります",
          total: normalizedObjects.length,
          valid: validFans.length,
          errors,
        },
        { status: 400 }
      );
    }

    // 一括作成
    const result = await prisma.fan.createMany({
      data: validFans,
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      created: result.count,
      total: validFans.length,
    });
  } catch (error) {
    console.error("POST /api/import/fans error:", error);
    return NextResponse.json(
      { error: "インポートに失敗しました" },
      { status: 500 }
    );
  }
}
