const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const AREAS = ["KOBE", "OSAKA", "NARA", "TOKYO", "MITO", "SHIKOKU", "OTHER", "ONLINE"];

const multiplierPairs: [string, string, number][] = [
  // Same area
  ...AREAS.filter(a => a !== "ONLINE").map(a => [a, a, 1.0] as [string, string, number]),
  // ONLINE is always 1.0
  ...AREAS.map(a => [a, "ONLINE", 1.0] as [string, string, number]),
  ...AREAS.filter(a => a !== "ONLINE").map(a => ["ONLINE", a, 1.0] as [string, string, number]),

  // KOBE combinations
  ["KOBE", "OSAKA", 1.2],
  ["OSAKA", "KOBE", 1.2],
  ["KOBE", "NARA", 1.2],
  ["NARA", "KOBE", 1.2],
  ["KOBE", "SHIKOKU", 1.35],
  ["SHIKOKU", "KOBE", 1.35],
  ["KOBE", "TOKYO", 1.6],
  ["TOKYO", "KOBE", 1.6],
  ["KOBE", "MITO", 1.7],
  ["MITO", "KOBE", 1.7],
  ["KOBE", "OTHER", 1.3],
  ["OTHER", "KOBE", 1.3],

  // OSAKA combinations
  ["OSAKA", "NARA", 1.1],
  ["NARA", "OSAKA", 1.1],
  ["OSAKA", "SHIKOKU", 1.25],
  ["SHIKOKU", "OSAKA", 1.25],
  ["OSAKA", "TOKYO", 1.5],
  ["TOKYO", "OSAKA", 1.5],
  ["OSAKA", "MITO", 1.6],
  ["MITO", "OSAKA", 1.6],
  ["OSAKA", "OTHER", 1.25],
  ["OTHER", "OSAKA", 1.25],

  // NARA combinations
  ["NARA", "SHIKOKU", 1.3],
  ["SHIKOKU", "NARA", 1.3],
  ["NARA", "TOKYO", 1.5],
  ["TOKYO", "NARA", 1.5],
  ["NARA", "MITO", 1.6],
  ["MITO", "NARA", 1.6],
  ["NARA", "OTHER", 1.25],
  ["OTHER", "NARA", 1.25],

  // TOKYO combinations
  ["TOKYO", "SHIKOKU", 1.5],
  ["SHIKOKU", "TOKYO", 1.5],
  ["TOKYO", "MITO", 1.15],
  ["MITO", "TOKYO", 1.15],
  ["TOKYO", "OTHER", 1.2],
  ["OTHER", "TOKYO", 1.2],

  // MITO combinations
  ["MITO", "SHIKOKU", 1.6],
  ["SHIKOKU", "MITO", 1.6],
  ["MITO", "OTHER", 1.3],
  ["OTHER", "MITO", 1.3],

  // SHIKOKU combinations
  ["SHIKOKU", "OTHER", 1.3],
  ["OTHER", "SHIKOKU", 1.3],

  // OTHER
  ["OTHER", "OTHER", 1.0],
];

const defaultSettings = [
  {
    key: "pointsBase",
    value: JSON.stringify({
      paidLiveBase: 10,
      freeLiveBase: 5,
      paidStreamBase: 3,
      youtubeViewBase: 1,
    }),
  },
  {
    key: "moneyCoeff",
    value: JSON.stringify({
      merchCoeff: 0.01,
      superchatCoeff: 0.02,
    }),
  },
  {
    key: "moneyMode",
    value: JSON.stringify("sqrt"),
  },
  {
    key: "diminishingReturns",
    value: JSON.stringify({
      enabled: true,
      rate: 0.9,
      applyTo: ["PaidLive", "FreeLive", "PaidStream"],
    }),
  },
];

async function main() {
  console.log("Seeding database...");

  for (const [fromArea, toArea, multiplier] of multiplierPairs) {
    await prisma.areaMultiplier.upsert({
      where: { fromArea_toArea: { fromArea, toArea } },
      update: { multiplier },
      create: { fromArea, toArea, multiplier },
    });
  }
  console.log(`Seeded ${multiplierPairs.length} area multipliers`);

  for (const setting of defaultSettings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log(`Seeded ${defaultSettings.length} settings`);

  console.log("Seed completed!");
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
