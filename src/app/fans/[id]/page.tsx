import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  ShoppingBag,
  MessageSquare,
  Gift,
  TrendingUp,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { AREA_LABELS, EVENT_TYPE_LABELS, type Area, type EventType } from "@/lib/constants";
import { TierBadge } from "@/components/tier-badge";
import { TierProgressBar } from "@/components/tier-progress-bar";
import { ScoreBreakdownCard } from "@/components/score-breakdown-card";
import { ScoreTrendChart } from "@/components/score-trend-chart";
import { prisma } from "@/lib/prisma";
import { getScoringSettings, getAreaMultiplierMap } from "@/lib/settings";
import { calculateCumulativeScores } from "@/lib/scoring";
import {
  getTierDefinitions,
  determineTier,
  getNextTier,
  calculateTierProgress,
} from "@/lib/tiers";

export const dynamic = "force-dynamic";

async function getFanScoreData(id: string) {
  const fan = await prisma.fan.findUnique({ where: { id } });
  if (!fan) return null;

  const [allLogs, settings, multipliers, tiers] = await Promise.all([
    prisma.eventLog.findMany({ where: { fanId: id }, orderBy: { date: "asc" } }),
    getScoringSettings(),
    getAreaMultiplierMap(),
    getTierDefinitions(),
  ]);

  const fanData = [
    { id: fan.id, displayName: fan.displayName, residenceArea: fan.residenceArea },
  ];

  const logData = allLogs.map((l) => ({
    id: l.id,
    date: l.date,
    fanId: l.fanId,
    eventType: l.eventType,
    venueArea: l.venueArea,
    attendCount: l.attendCount,
    merchAmountJPY: l.merchAmountJPY,
    superchatAmountJPY: l.superchatAmountJPY,
  }));

  // Cumulative score
  const cumulativeResults = calculateCumulativeScores(logData, fanData, settings, multipliers);
  const cumulativeScore = cumulativeResults[0] ?? {
    totalScore: 0, actionScore: 0, moneyScore: 0, travelContribution: 0,
  };

  // Current month score
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const monthlyLogs = logData.filter((l) => l.date >= startOfMonth && l.date <= endOfMonth);
  const monthlyResults = calculateCumulativeScores(monthlyLogs, fanData, settings, multipliers);
  const currentMonthScore = monthlyResults[0] ?? {
    totalScore: 0, actionScore: 0, moneyScore: 0, travelContribution: 0,
  };

  // Tier info
  const currentTier = determineTier(cumulativeScore.totalScore, tiers);
  const nextTier = getNextTier(currentTier, tiers);
  const tierProgress = calculateTierProgress(cumulativeScore.totalScore, currentTier, nextTier);

  // Monthly history (last 12 months) — single-pass grouping instead of 12x filter
  const monthlyMap = new Map<string, typeof logData>();
  for (const log of logData) {
    const d = log.date;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const arr = monthlyMap.get(key) ?? [];
    arr.push(log);
    monthlyMap.set(key, arr);
  }

  const monthlyHistory: {
    month: string;
    totalScore: number;
    actionScore: number;
    moneyScore: number;
    travelContribution: number;
  }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const mLogs = monthlyMap.get(mMonth);

    if (mLogs && mLogs.length > 0) {
      const mResults = calculateCumulativeScores(mLogs, fanData, settings, multipliers);
      const r = mResults[0];
      monthlyHistory.push({
        month: mMonth,
        totalScore: r?.totalScore ?? 0,
        actionScore: r?.actionScore ?? 0,
        moneyScore: r?.moneyScore ?? 0,
        travelContribution: r?.travelContribution ?? 0,
      });
    } else {
      monthlyHistory.push({
        month: mMonth, totalScore: 0, actionScore: 0, moneyScore: 0, travelContribution: 0,
      });
    }
  }

  // Recent logs (last 20)
  const recentLogs = allLogs.slice(-20).reverse();

  // Stats
  const totalMerchSpent = allLogs.reduce((s, l) => s + l.merchAmountJPY, 0);
  const totalSuperchatSpent = allLogs.reduce((s, l) => s + l.superchatAmountJPY, 0);
  const eventTypeBreakdown: Record<string, number> = {};
  for (const log of allLogs) {
    eventTypeBreakdown[log.eventType] = (eventTypeBreakdown[log.eventType] ?? 0) + 1;
  }

  return {
    fan: {
      id: fan.id,
      displayName: fan.displayName,
      residenceArea: fan.residenceArea,
      memo: fan.memo,
      createdAt: fan.createdAt,
    },
    cumulativeScore: {
      totalScore: cumulativeScore.totalScore,
      actionScore: cumulativeScore.actionScore,
      moneyScore: cumulativeScore.moneyScore,
      travelContribution: cumulativeScore.travelContribution,
    },
    currentMonthScore: {
      totalScore: currentMonthScore.totalScore,
      actionScore: currentMonthScore.actionScore,
      moneyScore: currentMonthScore.moneyScore,
      travelContribution: currentMonthScore.travelContribution,
    },
    currentTier,
    nextTier,
    tierProgress,
    monthlyHistory,
    recentLogs,
    stats: {
      totalEvents: allLogs.length,
      totalMerchSpent,
      totalSuperchatSpent,
      firstEventDate: allLogs.length > 0 ? allLogs[0].date : null,
      lastEventDate: allLogs.length > 0 ? allLogs[allLogs.length - 1].date : null,
      eventTypeBreakdown,
    },
  };
}

export default async function FanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getFanScoreData(id);

  if (!data) {
    notFound();
  }

  const { fan, cumulativeScore, currentMonthScore, currentTier, nextTier, tierProgress, monthlyHistory, recentLogs, stats } = data;

  const now = new Date();
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/fans">
            <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-3">
              <ArrowLeft className="h-4 w-4" />
              お客様一覧
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{fan.displayName} 様</h1>
            <TierBadge tier={currentTier} size="lg" />
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {AREA_LABELS[fan.residenceArea as Area] ?? fan.residenceArea}
            </span>
            {stats.firstEventDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                初回: {format(new Date(stats.firstEventDate), "yyyy/MM/dd")}
              </span>
            )}
          </div>
          {fan.memo && (
            <p className="text-sm text-muted-foreground mt-2 bg-muted/50 rounded-lg px-3 py-2">
              {fan.memo}
            </p>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="card-elevated bg-gradient-to-br from-blue-500/5 to-transparent border-blue-100">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">総イベント数</p>
            <p className="text-2xl font-bold mt-1">{stats.totalEvents}</p>
          </CardContent>
        </Card>
        <Card className="card-elevated bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-100">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
              <ShoppingBag className="h-3.5 w-3.5 text-emerald-500" />
              物販総額
            </p>
            <p className="text-2xl font-bold mt-1">
              {stats.totalMerchSpent.toLocaleString()}
              <span className="text-xs font-normal ml-0.5">円</span>
            </p>
          </CardContent>
        </Card>
        <Card className="card-elevated bg-gradient-to-br from-violet-500/5 to-transparent border-violet-100">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
              <MessageSquare className="h-3.5 w-3.5 text-violet-500" />
              スパチャ総額
            </p>
            <p className="text-2xl font-bold mt-1">
              {stats.totalSuperchatSpent.toLocaleString()}
              <span className="text-xs font-normal ml-0.5">円</span>
            </p>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">イベント種別</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(stats.eventTypeBreakdown).map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {EVENT_TYPE_LABELS[type as EventType] ?? type}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Progress */}
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            ティア進捗
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TierProgressBar
            currentScore={cumulativeScore.totalScore}
            currentTier={currentTier}
            nextTier={nextTier}
            progress={tierProgress}
          />
          {/* Benefits */}
          {currentTier && currentTier.benefits.length > 0 && (
            <div className="mt-5 pt-5 border-t">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <Gift className="h-4 w-4 text-amber-500" />
                現在の特典
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {currentTier.benefits.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-start gap-2.5 text-sm bg-gradient-to-r from-amber-50/50 to-transparent rounded-lg px-3 py-2 border border-amber-100"
                  >
                    <Sparkles
                      className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
                      style={{ color: currentTier.color }}
                    />
                    <div>
                      <span className="font-medium">{b.title}</span>
                      {b.description && (
                        <span className="text-muted-foreground ml-1.5">
                          - {b.description}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <ScoreBreakdownCard
          title="累積スコア（通算）"
          totalScore={cumulativeScore.totalScore}
          actionScore={cumulativeScore.actionScore}
          moneyScore={cumulativeScore.moneyScore}
          travelContribution={cumulativeScore.travelContribution}
          accentColor={currentTier?.color}
        />
        <ScoreBreakdownCard
          title={`今月のスコア（${monthLabel}）`}
          totalScore={currentMonthScore.totalScore}
          actionScore={currentMonthScore.actionScore}
          moneyScore={currentMonthScore.moneyScore}
          travelContribution={currentMonthScore.travelContribution}
        />
      </div>

      {/* Score Trend */}
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            月別スコア推移（直近6ヶ月）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScoreTrendChart
            data={monthlyHistory}
            accentColor={currentTier?.color ?? "#3B82F6"}
          />
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            最近の参加ログ（直近20件）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground">
              参加ログがありません
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日付</TableHead>
                    <TableHead>種別</TableHead>
                    <TableHead className="hidden sm:table-cell">会場</TableHead>
                    <TableHead className="text-right">物販</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">
                      スパチャ
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.date), "yyyy/MM/dd")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {EVENT_TYPE_LABELS[log.eventType as EventType] ?? log.eventType}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {AREA_LABELS[log.venueArea as Area] ?? log.venueArea}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {log.merchAmountJPY > 0
                          ? `¥${log.merchAmountJPY.toLocaleString()}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm hidden sm:table-cell">
                        {log.superchatAmountJPY > 0
                          ? `¥${log.superchatAmountJPY.toLocaleString()}`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
