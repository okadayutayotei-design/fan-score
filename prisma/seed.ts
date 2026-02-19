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

const defaultTiers = [
  { name: "プラチナ", slug: "platinum", color: "#8B5CF6", icon: "crown", minScore: 500, sortOrder: 1, description: "最上位ティア - 最も貢献度の高いファン" },
  { name: "ゴールド", slug: "gold", color: "#F59E0B", icon: "medal", minScore: 300, sortOrder: 2, description: "上位ティア - 積極的な活動を続けるファン" },
  { name: "シルバー", slug: "silver", color: "#6B7280", icon: "award", minScore: 150, sortOrder: 3, description: "中位ティア - 安定した参加を続けるファン" },
  { name: "ブロンズ", slug: "bronze", color: "#D97706", icon: "shield", minScore: 50, sortOrder: 4, description: "初級ティア - 活動を始めたファン" },
  { name: "レギュラー", slug: "regular", color: "#9CA3AF", icon: "user", minScore: 0, sortOrder: 5, description: "一般ファン" },
];

const defaultBenefits: Record<string, { title: string; description: string }[]> = {
  platinum: [
    { title: "限定グッズ優先購入権", description: "新作グッズをいち早く購入できます" },
    { title: "VIP席への優先案内", description: "ライブイベントでVIP席に優先的にご案内" },
    { title: "特別ミート&グリート", description: "アーティストとの特別交流機会" },
  ],
  gold: [
    { title: "限定グッズ購入権", description: "限定グッズの購入権利" },
    { title: "優先入場", description: "ライブイベントでの優先入場" },
  ],
  silver: [
    { title: "限定コンテンツアクセス", description: "シルバー会員限定の配信コンテンツ" },
  ],
  bronze: [
    { title: "ポイント還元ボーナス", description: "物販購入時のポイント還元率アップ" },
  ],
};

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

  // Seed tiers
  for (const tier of defaultTiers) {
    const upserted = await prisma.tier.upsert({
      where: { slug: tier.slug },
      update: { name: tier.name, color: tier.color, icon: tier.icon, minScore: tier.minScore, sortOrder: tier.sortOrder, description: tier.description },
      create: tier,
    });

    // Seed benefits for this tier
    const benefits = defaultBenefits[tier.slug] ?? [];
    for (let i = 0; i < benefits.length; i++) {
      const benefit = benefits[i];
      // Check if benefit already exists for this tier with same title
      const existing = await prisma.tierBenefit.findFirst({
        where: { tierId: upserted.id, title: benefit.title },
      });
      if (!existing) {
        await prisma.tierBenefit.create({
          data: {
            tierId: upserted.id,
            title: benefit.title,
            description: benefit.description,
            sortOrder: i,
          },
        });
      }
    }
  }
  console.log(`Seeded ${defaultTiers.length} tiers with benefits`);

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
