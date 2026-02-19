import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ClipboardList, Trophy, TrendingUp, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AREA_LABELS, type Area } from "@/lib/constants";
import { getScoringSettings, getAreaMultiplierMap } from "@/lib/settings";
import { calculateMonthlyScores, calculateCumulativeScores, assignRanks } from "@/lib/scoring";
import { getTierDefinitions, determineTier } from "@/lib/tiers";
import { TierBadge } from "@/components/tier-badge";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [fanCount, logCount, logs, allLogs, fans, settings, multipliers, tiers] = await Promise.all([
    prisma.fan.count(),
    prisma.eventLog.count({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.eventLog.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.eventLog.findMany(),
    prisma.fan.findMany(),
    getScoringSettings(),
    getAreaMultiplierMap(),
    getTierDefinitions(),
  ]);

  const fanData = fans.map((f) => ({
    id: f.id,
    displayName: f.displayName,
    residenceArea: f.residenceArea,
  }));

  const logData = logs.map((l) => ({
    id: l.id,
    date: l.date,
    fanId: l.fanId,
    eventType: l.eventType,
    venueArea: l.venueArea,
    attendCount: l.attendCount,
    merchAmountJPY: l.merchAmountJPY,
    superchatAmountJPY: l.superchatAmountJPY,
  }));

  const allLogData = allLogs.map((l) => ({
    id: l.id,
    date: l.date,
    fanId: l.fanId,
    eventType: l.eventType,
    venueArea: l.venueArea,
    attendCount: l.attendCount,
    merchAmountJPY: l.merchAmountJPY,
    superchatAmountJPY: l.superchatAmountJPY,
  }));

  const scores = calculateMonthlyScores(logData, fanData, settings, multipliers);
  const ranked = assignRanks(scores).slice(0, 10);

  // Cumulative scores for tier
  const cumulativeScores = calculateCumulativeScores(allLogData, fanData, settings, multipliers);
  const cumulativeMap = new Map(cumulativeScores.map((s) => [s.fanId, s.totalScore]));

  // Calculate monthly sales per fan
  const fanSalesMap = new Map<string, number>();
  for (const l of logs) {
    const current = fanSalesMap.get(l.fanId) ?? 0;
    fanSalesMap.set(l.fanId, current + l.merchAmountJPY + l.superchatAmountJPY);
  }

  const rankedWithTier = ranked.map((r) => {
    const cumScore = cumulativeMap.get(r.fanId) ?? 0;
    const tier = determineTier(cumScore, tiers);
    return {
      ...r,
      salesAmount: fanSalesMap.get(r.fanId) ?? 0,
      tier: tier ? { name: tier.name, color: tier.color, icon: tier.icon } : null,
    };
  });

  // Tier distribution
  const tierDistribution = tiers.map((tier) => {
    const count = cumulativeScores.filter((s) => {
      const t = determineTier(s.totalScore, tiers);
      return t?.id === tier.id;
    }).length;
    return { name: tier.name, color: tier.color, icon: tier.icon, count };
  });

  return { fanCount, logCount, topRanking: rankedWithTier, tierDistribution };
}

const statCards = [
  {
    key: "participants",
    label: "記録する",
    icon: TrendingUp,
    bgGradient: "from-violet-500/10 to-violet-600/5",
    iconColor: "text-violet-500",
    borderColor: "border-violet-200",
    href: "/logs/new",
  },
  {
    key: "fans",
    label: "お客様数",
    icon: Users,
    bgGradient: "from-blue-500/10 to-blue-600/5",
    iconColor: "text-blue-500",
    borderColor: "border-blue-200",
    href: "/fans",
  },
  {
    key: "logs",
    label: "今月の記録",
    icon: ClipboardList,
    bgGradient: "from-emerald-500/10 to-emerald-600/5",
    iconColor: "text-emerald-500",
    borderColor: "border-emerald-200",
    href: "/logs",
  },
  {
    key: "settings",
    label: "設定",
    icon: Settings,
    bgGradient: "from-slate-500/10 to-slate-600/5",
    iconColor: "text-slate-500",
    borderColor: "border-slate-200",
    href: "/settings",
  },
];

export default async function DashboardPage() {
  const { fanCount, logCount, topRanking, tierDistribution } = await getDashboardData();
  const now = new Date();
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          ダッシュボード
        </h1>
        <p className="text-muted-foreground mt-0.5">{monthLabel}の概要</p>
      </div>

      {/* Stat Cards - clickable */}
      <div className="grid gap-2 sm:gap-4 grid-cols-2 md:grid-cols-4">
        {statCards.map((card) => (
          <Link key={card.key} href={card.href}>
            <Card className={`card-elevated bg-gradient-to-br ${card.bgGradient} border ${card.borderColor} cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <card.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${card.iconColor}`} />
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-2xl sm:text-3xl font-bold">{
                  card.key === "fans" ? fanCount :
                  card.key === "logs" ? logCount :
                  card.key === "participants" ? "+" :
                  "\u00A0"
                }</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top 10 Ranking */}
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              今月のトップ10
            </CardTitle>
            <Link href="/ranking">
              <Button variant="outline" size="sm">全ランキング</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {topRanking.length === 0 ? (
              <p className="text-muted-foreground text-sm py-6 text-center">
                今月のデータはまだありません
              </p>
            ) : (
              <div className="space-y-2">
                {topRanking.map((fan) => {
                  const isTop3 = fan.rank <= 3;
                  const rankBg =
                    fan.rank === 1
                      ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200"
                      : fan.rank === 2
                      ? "bg-gradient-to-r from-slate-50 to-gray-100 border-gray-200"
                      : fan.rank === 3
                      ? "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200"
                      : "hover:bg-muted/50";
                  return (
                    <Link
                      key={fan.fanId}
                      href={`/fans/${fan.fanId}`}
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-200 ${
                        isTop3 ? `border ${rankBg}` : rankBg
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                            fan.rank === 1
                              ? "bg-yellow-400 text-yellow-900 shadow-sm"
                              : fan.rank === 2
                              ? "bg-gray-300 text-gray-700 shadow-sm"
                              : fan.rank === 3
                              ? "bg-orange-400 text-orange-900 shadow-sm"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {fan.rank}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate">{fan.displayName} 様</p>
                            <TierBadge tier={fan.tier} size="sm" showLabel={false} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {AREA_LABELS[fan.residenceArea as Area] ?? fan.residenceArea}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {fan.salesAmount > 0 && (
                          <span className="text-sm font-bold text-emerald-600">
                            ¥{fan.salesAmount.toLocaleString()}
                          </span>
                        )}
                        <Badge variant="secondary" className="font-bold">
                          {fan.totalScore.toFixed(1)} pt
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Tier Distribution */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-lg">🏆</span>
                ランキング
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tierDistribution.every((t) => t.count === 0) ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  データなし
                </p>
              ) : (
                <div className="space-y-3">
                  {tierDistribution.map((tier) => (
                    <div key={tier.name} className="flex items-center gap-3">
                      <TierBadge
                        tier={{ name: tier.name, color: tier.color, icon: tier.icon }}
                        size="sm"
                      />
                      <div className="flex-1">
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(
                                tier.count > 0 ? (tier.count / Math.max(...tierDistribution.map(t => t.count), 1)) * 100 : 0,
                                tier.count > 0 ? 10 : 0
                              )}%`,
                              backgroundColor: tier.color,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-bold w-8 text-right">{tier.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-base">クイックアクション</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Link href="/logs/new" className="block">
                <Button className="w-full justify-start gap-2 h-11" variant="outline">
                  <ClipboardList className="h-4 w-4 text-emerald-500" />
                  売上記録
                </Button>
              </Link>
              <Link href="/fans" className="block">
                <Button className="w-full justify-start gap-1.5 h-11 text-xs sm:text-sm px-2 sm:px-3" variant="outline">
                  <Users className="h-4 w-4 text-violet-500 flex-shrink-0" />
                  <span className="truncate">お客様一覧・追加</span>
                </Button>
              </Link>
              <Link href="/ranking" className="block">
                <Button className="w-full justify-start gap-2 h-11" variant="outline">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  ランキング
                </Button>
              </Link>
              <Link href="/settings" className="block">
                <Button className="w-full justify-start gap-2 h-11" variant="outline">
                  <Settings className="h-4 w-4 text-slate-500" />
                  設定
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
