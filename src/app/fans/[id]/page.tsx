"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { AREA_LABELS, EVENT_TYPE_LABELS, type Area, type EventType } from "@/lib/constants";
import { TierBadge } from "@/components/tier-badge";
import { TierProgressBar } from "@/components/tier-progress-bar";
import { ScoreBreakdownCard } from "@/components/score-breakdown-card";
import { ScoreTrendChart } from "@/components/score-trend-chart";

interface FanScoreData {
  fan: {
    id: string;
    displayName: string;
    residenceArea: string;
    memo: string | null;
    createdAt: string;
  };
  cumulativeScore: {
    totalScore: number;
    actionScore: number;
    moneyScore: number;
    travelContribution: number;
  };
  currentMonthScore: {
    totalScore: number;
    actionScore: number;
    moneyScore: number;
    travelContribution: number;
  };
  currentTier: {
    id: string;
    name: string;
    slug: string;
    color: string;
    icon: string;
    minScore: number;
    sortOrder: number;
    description: string | null;
    benefits: { id: string; title: string; description: string | null }[];
  } | null;
  nextTier: {
    name: string;
    color: string;
    minScore: number;
  } | null;
  tierProgress: number;
  monthlyHistory: {
    month: string;
    totalScore: number;
    actionScore: number;
    moneyScore: number;
    travelContribution: number;
  }[];
  recentLogs: {
    id: string;
    date: string;
    eventType: string;
    venueArea: string;
    attendCount: number;
    merchAmountJPY: number;
    superchatAmountJPY: number;
    note: string | null;
  }[];
  stats: {
    totalEvents: number;
    totalMerchSpent: number;
    totalSuperchatSpent: number;
    firstEventDate: string | null;
    lastEventDate: string | null;
    eventTypeBreakdown: Record<string, number>;
  };
}

export default function FanDetailPage() {
  const params = useParams();
  const fanId = params.id as string;
  const [data, setData] = useState<FanScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/fans/${fanId}/score`);
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("お客様情報の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [fanId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Link href="/fans">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            お客様一覧に戻る
          </Button>
        </Link>
        <p className="text-center text-muted-foreground py-10">
          お客様情報が見つかりませんでした
        </p>
      </div>
    );
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

      {/* Stats Summary - 売上・参加概要 */}
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
