"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ClipboardList, Plus, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { AREA_LABELS, EVENT_TYPE_LABELS, type Area, type EventType } from "@/lib/constants";

interface LogEntry {
  id: string;
  date: string;
  fanId: string;
  eventType: string;
  venueArea: string;
  attendCount: number;
  merchAmountJPY: number;
  superchatAmountJPY: number;
  note: string | null;
  fan: { displayName: string; residenceArea: string };
}

export default function LogsPage() {
  const now = new Date();
  const [month, setMonth] = useState(format(now, "yyyy-MM"));
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingLog, setDeletingLog] = useState<LogEntry | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/logs?month=${month}`);
      const data = await res.json();
      setLogs(data);
    } catch {
      toast.error("ログの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDelete = async () => {
    if (!deletingLog) return;
    try {
      const res = await fetch(`/api/logs/${deletingLog.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("ログを削除しました");
      setDeleteDialogOpen(false);
      setDeletingLog(null);
      fetchLogs();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const exportCSV = () => {
    if (logs.length === 0) {
      toast.error("エクスポートするデータがありません");
      return;
    }
    const headers = [
      "日付",
      "お客様名",
      "居住地",
      "種別",
      "会場",
      "回数",
      "物販(円)",
      "スパチャ(円)",
      "メモ",
    ];
    const rows = logs.map((log) => [
      format(new Date(log.date), "yyyy-MM-dd"),
      log.fan.displayName,
      AREA_LABELS[log.fan.residenceArea as Area] ?? log.fan.residenceArea,
      EVENT_TYPE_LABELS[log.eventType as EventType] ?? log.eventType,
      AREA_LABELS[log.venueArea as Area] ?? log.venueArea,
      log.attendCount,
      log.merchAmountJPY,
      log.superchatAmountJPY,
      log.note ?? "",
    ]);

    const csv =
      "\uFEFF" +
      [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fan-score-logs-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSVをダウンロードしました");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            売上記録
          </h1>
          <p className="text-muted-foreground">{logs.length}件の記録</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Link href="/logs/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              追加
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">月選択:</label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-48"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">読み込み中...</p>
          ) : logs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              この月の記録はありません
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日付</TableHead>
                    <TableHead>お客様名</TableHead>
                    <TableHead>種別</TableHead>
                    <TableHead className="hidden md:table-cell">会場</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">
                      物販
                    </TableHead>
                    <TableHead className="text-right hidden sm:table-cell">
                      スパチャ
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.date), "MM/dd")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.fan.displayName} 様
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="whitespace-nowrap">
                          {EVENT_TYPE_LABELS[log.eventType as EventType] ??
                            log.eventType}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {AREA_LABELS[log.venueArea as Area] ?? log.venueArea}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        {log.merchAmountJPY > 0
                          ? `¥${log.merchAmountJPY.toLocaleString()}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        {log.superchatAmountJPY > 0
                          ? `¥${log.superchatAmountJPY.toLocaleString()}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingLog(log);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>記録の削除確認</DialogTitle>
          </DialogHeader>
          <p>
            {deletingLog && (
              <>
                {format(new Date(deletingLog.date), "MM/dd")}{" "}
                {deletingLog.fan.displayName} 様の
                {EVENT_TYPE_LABELS[deletingLog.eventType as EventType]}
                記録を削除しますか？
              </>
            )}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
