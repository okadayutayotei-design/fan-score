"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AREA_LABELS, type Area } from "@/lib/constants";
import { TierBadge } from "@/components/tier-badge";
import Link from "next/link";

interface RankedFan {
  rank: number;
  fanId: string;
  displayName: string;
  residenceArea: string;
  totalScore: number;
  actionScore: number;
  moneyScore: number;
  travelContribution: number;
  cumulativeTotalScore: number;
  salesAmount: number;
  tier: {
    name: string;
    slug: string;
    color: string;
    icon: string;
  } | null;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="w-9 h-9 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center font-bold text-sm shadow-sm">
        1
      </span>
    );
  if (rank === 2)
    return (
      <span className="w-9 h-9 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-sm shadow-sm">
        2
      </span>
    );
  if (rank === 3)
    return (
      <span className="w-9 h-9 rounded-full bg-orange-400 text-orange-900 flex items-center justify-center font-bold text-sm shadow-sm">
        3
      </span>
    );
  return (
    <span className="w-9 h-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-sm">
      {rank}
    </span>
  );
}

export default function RankingPage() {
  const now = new Date();
  const [month, setMonth] = useState(format(now, "yyyy-MM"));
  const [ranking, setRanking] = useState<RankedFan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("total");
  const [mode, setMode] = useState<"monthly" | "cumulative">("monthly");

  const fetchRanking = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = mode === "cumulative"
        ? `?mode=cumulative`
        : `?month=${month}`;
      const res = await fetch(`/api/ranking${params}`);
      const data = await res.json();
      setRanking(data);
    } catch {
      toast.error("ランキングの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [month, mode]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  // Sort based on active tab
  const sortedRanking = [...ranking].sort((a, b) => {
    switch (activeTab) {
      case "travel":
        return b.travelContribution - a.travelContribution;
      case "money":
        return b.moneyScore - a.moneyScore;
      case "action":
        return b.actionScore - a.actionScore;
      default:
        return b.totalScore - a.totalScore;
    }
  });

  // Re-assign ranks based on current sort
  const finalRanking: (RankedFan & { displayRank: number })[] = [];
  for (let i = 0; i < sortedRanking.length; i++) {
    const item = sortedRanking[i];
    const scoreKey =
      activeTab === "travel"
        ? "travelContribution"
        : activeTab === "money"
        ? "moneyScore"
        : activeTab === "action"
        ? "actionScore"
        : "totalScore";
    let rank = i + 1;
    if (i > 0 && item[scoreKey] === sortedRanking[i - 1][scoreKey]) {
      rank = finalRanking[i - 1].displayRank;
    }
    finalRanking.push({ ...item, displayRank: rank });
  }

  const [yyyy, mm] = month.split("-");
  const monthLabel = mode === "cumulative"
    ? "累積（通算）"
    : `${yyyy}年${parseInt(mm)}月`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          ランキング
        </h1>
        <p className="text-muted-foreground mt-0.5">{monthLabel}のファンスコア</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Mode Toggle - larger and more colorful */}
        <div className="flex rounded-xl border-2 overflow-hidden">
          <button
            className={`px-5 py-2 text-sm font-semibold transition-all duration-200 ${
              mode === "monthly"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "hover:bg-muted text-muted-foreground"
            }`}
            onClick={() => setMode("monthly")}
          >
            月次
          </button>
          <button
            className={`px-5 py-2 text-sm font-semibold transition-all duration-200 ${
              mode === "cumulative"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "hover:bg-muted text-muted-foreground"
            }`}
            onClick={() => setMode("cumulative")}
          >
            累計
          </button>
        </div>

        {mode === "monthly" && (
          <>
            <label className="text-sm font-medium">月選択:</label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-48"
            />
          </>
        )}
      </div>

      <Card className="card-elevated">
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="total">総合</TabsTrigger>
              <TabsTrigger value="action">参加貢献</TabsTrigger>
              <TabsTrigger value="travel">遠征貢献</TabsTrigger>
              <TabsTrigger value="money">支払い貢献</TabsTrigger>
            </TabsList>

            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">
                読み込み中...
              </p>
            ) : finalRanking.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                {mode === "cumulative"
                  ? "データがありません"
                  : "この月のデータはありません"}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">順位</TableHead>
                      <TableHead>お客様名</TableHead>
                      <TableHead className="hidden md:table-cell w-28">
                        ティア
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        居住地
                      </TableHead>
                      <TableHead className="text-right">
                        {activeTab === "total"
                          ? "総合スコア"
                          : activeTab === "action"
                          ? "参加スコア"
                          : activeTab === "travel"
                          ? "遠征貢献"
                          : "支払いスコア"}
                      </TableHead>
                      <TableHead className="text-right">
                        売上金額
                      </TableHead>
                      {activeTab === "total" && (
                        <>
                          <TableHead className="text-right hidden sm:table-cell">
                            参加
                          </TableHead>
                          <TableHead className="text-right hidden sm:table-cell">
                            支払い
                          </TableHead>
                          <TableHead className="text-right hidden lg:table-cell">
                            遠征
                          </TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finalRanking.map((fan) => {
                      const isTop3 = fan.displayRank <= 3;
                      const rowBg =
                        fan.displayRank === 1
                          ? "bg-gradient-to-r from-yellow-50/80 to-transparent"
                          : fan.displayRank === 2
                          ? "bg-gradient-to-r from-slate-50/80 to-transparent"
                          : fan.displayRank === 3
                          ? "bg-gradient-to-r from-orange-50/80 to-transparent"
                          : "";
                      return (
                        <TableRow
                          key={fan.fanId}
                          className={`transition-colors hover:bg-muted/30 ${isTop3 ? rowBg : ""}`}
                        >
                          <TableCell>
                            <RankBadge rank={fan.displayRank} />
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/fans/${fan.fanId}`}
                              className="font-semibold hover:underline text-primary hover:text-primary/80 transition-colors"
                            >
                              {fan.displayName} 様
                            </Link>
                            {/* Mobile: show tier inline */}
                            <div className="md:hidden mt-1">
                              <TierBadge tier={fan.tier} size="sm" />
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <TierBadge tier={fan.tier} size="sm" />
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline">
                              {AREA_LABELS[fan.residenceArea as Area] ??
                                fan.residenceArea}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-lg text-primary">
                            {activeTab === "total"
                              ? fan.totalScore.toFixed(1)
                              : activeTab === "action"
                              ? fan.actionScore.toFixed(1)
                              : activeTab === "travel"
                              ? fan.travelContribution.toFixed(1)
                              : fan.moneyScore.toFixed(1)}
                            <span className="text-xs font-normal ml-0.5">pt</span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-base text-emerald-600">
                            {fan.salesAmount > 0
                              ? `¥${fan.salesAmount.toLocaleString()}`
                              : "-"}
                          </TableCell>
                          {activeTab === "total" && (
                            <>
                              <TableCell className="text-right text-muted-foreground hidden sm:table-cell">
                                {fan.actionScore.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground hidden sm:table-cell">
                                {fan.moneyScore.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground hidden lg:table-cell">
                                {fan.travelContribution.toFixed(1)}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
