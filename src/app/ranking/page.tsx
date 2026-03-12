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
  totalAttendCount: number;
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
  const scoreKey =
    activeTab === "attend"
      ? "totalAttendCount"
      : activeTab === "sales"
      ? "salesAmount"
      : "totalScore";

  // Round score values to match display (1 decimal for scores, exact for integers)
  const displayValue = (fan: RankedFan) => {
    const v = fan[scoreKey];
    return scoreKey === "totalAttendCount" || scoreKey === "salesAmount"
      ? v
      : Math.round(v * 10) / 10;
  };

  const sortedRanking = [...ranking].sort((a, b) => displayValue(b) - displayValue(a));

  // Re-assign ranks: same display value = same rank
  const finalRanking: (RankedFan & { displayRank: number })[] = [];
  let currentRank = 1;
  for (let i = 0; i < sortedRanking.length; i++) {
    if (i > 0 && displayValue(sortedRanking[i]) !== displayValue(sortedRanking[i - 1])) {
      currentRank = i + 1;
    }
    finalRanking.push({ ...sortedRanking[i], displayRank: currentRank });
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
              <TabsTrigger value="attend">来場回数</TabsTrigger>
              <TabsTrigger value="sales">売上金額</TabsTrigger>
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
                      <TableHead className="hidden lg:table-cell">
                        居住地
                      </TableHead>
                      <TableHead className="text-right">回数</TableHead>
                      <TableHead className="text-right">金額合計</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">
                        スコア
                      </TableHead>
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
                            <div className="md:hidden mt-1">
                              <TierBadge tier={fan.tier} size="sm" />
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <TierBadge tier={fan.tier} size="sm" />
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant="outline">
                              {AREA_LABELS[fan.residenceArea as Area] ??
                                fan.residenceArea}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-bold text-lg ${activeTab === "attend" ? "text-primary" : ""}`}>
                            {fan.totalAttendCount > 0
                              ? `${fan.totalAttendCount}回`
                              : "-"}
                          </TableCell>
                          <TableCell className={`text-right font-bold text-lg ${activeTab === "sales" ? "text-primary" : "text-emerald-600"}`}>
                            {fan.salesAmount > 0
                              ? `¥${fan.salesAmount.toLocaleString()}`
                              : "-"}
                          </TableCell>
                          <TableCell className={`text-right hidden sm:table-cell font-medium ${activeTab === "total" ? "text-primary font-bold text-lg" : "text-muted-foreground"}`}>
                            {fan.totalScore.toFixed(1)}
                            <span className="text-xs font-normal ml-0.5">pt</span>
                          </TableCell>
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
