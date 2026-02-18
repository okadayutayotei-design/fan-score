import { prisma } from "./prisma";
import type { ScoringSettings, AreaMultiplierMap } from "./scoring";

const DEFAULT_SETTINGS: ScoringSettings = {
  pointsBase: {
    paidLiveBase: 10,
    freeLiveBase: 5,
    paidStreamBase: 3,
    youtubeViewBase: 1,
  },
  moneyCoeff: {
    merchCoeff: 0.01,
    superchatCoeff: 0.02,
  },
  moneyMode: "sqrt",
  diminishingReturns: {
    enabled: true,
    rate: 0.9,
    applyTo: ["PaidLive", "FreeLive", "PaidStream"],
  },
};

export async function getScoringSettings(): Promise<ScoringSettings> {
  const rows = await prisma.settings.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    pointsBase: map.has("pointsBase")
      ? JSON.parse(map.get("pointsBase")!)
      : DEFAULT_SETTINGS.pointsBase,
    moneyCoeff: map.has("moneyCoeff")
      ? JSON.parse(map.get("moneyCoeff")!)
      : DEFAULT_SETTINGS.moneyCoeff,
    moneyMode: map.has("moneyMode")
      ? JSON.parse(map.get("moneyMode")!)
      : DEFAULT_SETTINGS.moneyMode,
    diminishingReturns: map.has("diminishingReturns")
      ? JSON.parse(map.get("diminishingReturns")!)
      : DEFAULT_SETTINGS.diminishingReturns,
  };
}

export async function getAreaMultiplierMap(): Promise<AreaMultiplierMap> {
  const rows = await prisma.areaMultiplier.findMany();
  const map: AreaMultiplierMap = {};
  for (const row of rows) {
    map[`${row.fromArea}->${row.toArea}`] = row.multiplier;
  }
  return map;
}
