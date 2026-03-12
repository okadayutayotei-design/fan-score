import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const OLD_AREAS = ["KOBE", "OSAKA", "KYOTO", "NARA"];
const NEW_AREA = "KINKI";

const NEW_MULTIPLIERS: [string, string, number][] = [
  ["KINKI", "KINKI", 1.0],
  ["KINKI", "SHIKOKU", 1.35],
  ["SHIKOKU", "KINKI", 1.35],
  ["KINKI", "TOKYO", 1.6],
  ["TOKYO", "KINKI", 1.6],
  ["KINKI", "MITO", 1.7],
  ["MITO", "KINKI", 1.7],
  ["KINKI", "OTHER", 1.3],
  ["OTHER", "KINKI", 1.3],
  ["KINKI", "ONLINE", 1.0],
  ["ONLINE", "KINKI", 1.0],
];

export async function POST() {
  try {
    // 1. Update Fan residenceArea
    const fanResult = await prisma.$executeRawUnsafe(
      `UPDATE "Fan" SET "residenceArea" = '${NEW_AREA}' WHERE "residenceArea" IN (${OLD_AREAS.map(a => `'${a}'`).join(",")})`
    );

    // 2. Update EventLog venueArea
    const logResult = await prisma.$executeRawUnsafe(
      `UPDATE "EventLog" SET "venueArea" = '${NEW_AREA}' WHERE "venueArea" IN (${OLD_AREAS.map(a => `'${a}'`).join(",")})`
    );

    // 3. Delete old AreaMultiplier records
    const deleteResult = await prisma.$executeRawUnsafe(
      `DELETE FROM "AreaMultiplier" WHERE "fromArea" IN (${OLD_AREAS.map(a => `'${a}'`).join(",")}) OR "toArea" IN (${OLD_AREAS.map(a => `'${a}'`).join(",")})`
    );

    // 4. Upsert new KINKI multipliers
    let upsertCount = 0;
    for (const [fromArea, toArea, multiplier] of NEW_MULTIPLIERS) {
      await prisma.areaMultiplier.upsert({
        where: { fromArea_toArea: { fromArea, toArea } },
        update: { multiplier },
        create: { fromArea, toArea, multiplier },
      });
      upsertCount++;
    }

    return NextResponse.json({
      success: true,
      fansUpdated: fanResult,
      logsUpdated: logResult,
      oldMultipliersDeleted: deleteResult,
      newMultipliersCreated: upsertCount,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "マイグレーションに失敗しました", details: String(error) },
      { status: 500 }
    );
  }
}
