import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCSV, csvToObjects } from "@/lib/csv-parser";

const VALID_EVENT_TYPES = ["PaidLive", "FreeLive", "PaidStream", "YouTube"];
const VALID_AREAS = [
  "KOBE",
  "OSAKA",
  "NARA",
  "TOKYO",
  "MITO",
  "SHIKOKU",
  "OTHER",
  "ONLINE",
];

// 日本語→コード変換マップ
const EVENT_TYPE_MAP: Record<string, string> = {
  有料ライブ: "PaidLive",
  フリーライブ: "FreeLive",
  有料配信: "PaidStream",
  YouTube: "YouTube",
  youtube: "YouTube",
  PaidLive: "PaidLive",
  FreeLive: "FreeLive",
  PaidStream: "PaidStream",
};

const AREA_MAP: Record<string, string> = {
  神戸: "KOBE",
  大阪: "OSAKA",
  奈良: "NARA",
  東京: "TOKYO",
  水戸: "MITO",
  四国: "SHIKOKU",
  その他: "OTHER",
  オンライン: "ONLINE",
  KOBE: "KOBE",
  OSAKA: "OSAKA",
  NARA: "NARA",
  TOKYO: "TOKYO",
  MITO: "MITO",
  SHIKOKU: "SHIKOKU",
  OTHER: "OTHER",
  ONLINE: "ONLINE",
};

// ヘッダーの別名マップ
const HEADER_ALIASES: Record<string, string> = {
  日付: "date",
  date: "date",
  ファン名: "fanName",
  表示名: "fanName",
  名前: "fanName",
  fanName: "fanName",
  種別: "eventType",
  イベント種別: "eventType",
  eventType: "eventType",
  会場エリア: "venueArea",
  会場: "venueArea",
  エリア: "venueArea",
  venueArea: "venueArea",
  回数: "attendCount",
  参加回数: "attendCount",
  attendCount: "attendCount",
  "物販(円)": "merchAmountJPY",
  物販: "merchAmountJPY",
  物販金額: "merchAmountJPY",
  merchAmountJPY: "merchAmountJPY",
  "スパチャ(円)": "superchatAmountJPY",
  スパチャ: "superchatAmountJPY",
  スパチャ金額: "superchatAmountJPY",
  superchatAmountJPY: "superchatAmountJPY",
  メモ: "note",
  備考: "note",
  note: "note",
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

    // ファン名→IDのマッピングを取得
    const allFans = await prisma.fan.findMany({
      select: { id: true, displayName: true },
    });
    const fanNameMap = new Map(
      allFans.map((f) => [f.displayName, f.id])
    );

    // バリデーション
    const errors: { row: number; message: string }[] = [];
    const validLogs: {
      date: Date;
      fanId: string;
      eventType: string;
      venueArea: string;
      attendCount: number;
      merchAmountJPY: number;
      superchatAmountJPY: number;
      note: string | null;
    }[] = [];

    normalizedObjects.forEach((obj, index) => {
      const rowNum = index + 2;

      // 日付チェック
      if (!obj.date?.trim()) {
        errors.push({ row: rowNum, message: "日付が必要です" });
        return;
      }
      const dateObj = new Date(obj.date.trim());
      if (isNaN(dateObj.getTime())) {
        errors.push({
          row: rowNum,
          message: `不正な日付: "${obj.date}" (YYYY-MM-DD形式で入力)`,
        });
        return;
      }

      // ファン名チェック
      const fanName = obj.fanName?.trim();
      if (!fanName) {
        errors.push({ row: rowNum, message: "ファン名が必要です" });
        return;
      }
      const fanId = fanNameMap.get(fanName);
      if (!fanId) {
        errors.push({
          row: rowNum,
          message: `未登録のファン: "${fanName}" (先にファンを登録してください)`,
        });
        return;
      }

      // イベント種別チェック
      const eventTypeInput = obj.eventType?.trim() || "";
      const eventType = EVENT_TYPE_MAP[eventTypeInput];
      if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
        errors.push({
          row: rowNum,
          message: `不正な種別: "${eventTypeInput}" (使用可能: ${VALID_EVENT_TYPES.join(", ")} または日本語名)`,
        });
        return;
      }

      // オンラインイベントは会場をONLINEに固定
      const isOnline = eventType === "PaidStream" || eventType === "YouTube";
      let venueArea: string;

      if (isOnline) {
        venueArea = "ONLINE";
      } else {
        const venueInput = obj.venueArea?.trim() || "";
        venueArea = AREA_MAP[venueInput] || "";
        if (!venueArea || !VALID_AREAS.includes(venueArea)) {
          errors.push({
            row: rowNum,
            message: `不正な会場エリア: "${venueInput}"`,
          });
          return;
        }
      }

      // 数値チェック
      const attendCount = parseInt(obj.attendCount || "1") || 1;
      const merchAmountJPY = parseInt(
        (obj.merchAmountJPY || "0").replace(/[,，]/g, "")
      ) || 0;
      const superchatAmountJPY = parseInt(
        (obj.superchatAmountJPY || "0").replace(/[,，]/g, "")
      ) || 0;

      if (attendCount < 1) {
        errors.push({ row: rowNum, message: "回数は1以上" });
        return;
      }
      if (merchAmountJPY < 0) {
        errors.push({ row: rowNum, message: "物販金額は0以上" });
        return;
      }
      if (superchatAmountJPY < 0) {
        errors.push({ row: rowNum, message: "スパチャ金額は0以上" });
        return;
      }

      validLogs.push({
        date: dateObj,
        fanId,
        eventType,
        venueArea,
        attendCount,
        merchAmountJPY,
        superchatAmountJPY,
        note: obj.note?.trim() || null,
      });
    });

    if (dryRun) {
      return NextResponse.json({
        total: normalizedObjects.length,
        valid: validLogs.length,
        errors,
        preview: validLogs.slice(0, 10).map((log) => ({
          ...log,
          date: log.date.toISOString(),
          fanName:
            allFans.find((f) => f.id === log.fanId)?.displayName ?? log.fanId,
        })),
      });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "バリデーションエラーがあります",
          total: normalizedObjects.length,
          valid: validLogs.length,
          errors,
        },
        { status: 400 }
      );
    }

    // 一括作成
    const result = await prisma.eventLog.createMany({
      data: validLogs,
    });

    return NextResponse.json({
      success: true,
      created: result.count,
      total: validLogs.length,
    });
  } catch (error) {
    console.error("POST /api/import/logs error:", error);
    return NextResponse.json(
      { error: "インポートに失敗しました" },
      { status: 500 }
    );
  }
}
