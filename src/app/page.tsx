import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ClipboardList, Trophy, TrendingUp, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AREA_LABELS, type Area } from "@/lib/constants";
import { getScoringSettings, getAreaMultiplierMap } from "@/lib/settings";
import { calculateMonthlyScores, assignRanks } from "@/lib/scoring";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [fanCount, logCount, logs, fans] = await Promise.all([
    prisma.fan.count(),
    prisma.eventLog.count({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.eventLog.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.fan.findMany(),
  ]);

  const settings = await getScoringSettings();
  const multipliers = await getAreaMultiplierMap();

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

  const scores = calculateMonthlyScores(logData, fanData, settings, multipliers);
  const ranked = assignRanks(scores).slice(0, 10);

  return { fanCount, logCount, topRanking: ranked };
}

export default async function DashboardPage() {
  const { fanCount, logCount, topRanking } = await getDashboardData();
  const now = new Date();
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-muted-foreground">{monthLabel}の概要</p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総ファン数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fanCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月のログ</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">トップスコア</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topRanking.length > 0
                ? topRanking[0].totalScore.toFixed(1)
                : "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">参加者数</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topRanking.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>今月のトップ10</CardTitle>
            <Link href="/ranking">
              <Button variant="outline" size="sm">全ランキング</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {topRanking.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                今月のデータはまだありません
              </p>
            ) : (
              <div className="space-y-3">
                {topRanking.map((fan) => (
                  <div key={fan.fanId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        fan.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                        fan.rank === 2 ? "bg-gray-100 text-gray-600" :
                        fan.rank === 3 ? "bg-orange-100 text-orange-700" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {fan.rank}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{fan.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {AREA_LABELS[fan.residenceArea as Area] ?? fan.residenceArea}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{fan.totalScore.toFixed(1)} pt</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>クイックアクション</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/logs/new" className="block">
              <Button className="w-full justify-start gap-2" variant="outline">
                <ClipboardList className="h-4 w-4" />
                参加ログを追加
              </Button>
            </Link>
            <Link href="/fans" className="block">
              <Button className="w-full justify-start gap-2" variant="outline">
                <Users className="h-4 w-4" />
                ファン管理
              </Button>
            </Link>
            <Link href="/ranking" className="block">
              <Button className="w-full justify-start gap-2" variant="outline">
                <Trophy className="h-4 w-4" />
                月次ランキング
              </Button>
            </Link>
            <Link href="/settings" className="block">
              <Button className="w-full justify-start gap-2" variant="outline">
                <Settings className="h-4 w-4" />
                設定
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
