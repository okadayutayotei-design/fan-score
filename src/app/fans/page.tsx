"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AREA_LABELS, PHYSICAL_AREAS, type Area } from "@/lib/constants";
import { TierBadge } from "@/components/tier-badge";
import Link from "next/link";

interface Fan {
  id: string;
  displayName: string;
  residenceArea: string;
  memo: string | null;
  createdAt: string;
}

interface TierInfo {
  name: string;
  slug: string;
  color: string;
  icon: string;
}

export default function FansPage() {
  const [fans, setFans] = useState<Fan[]>([]);
  const [fanTiers, setFanTiers] = useState<Record<string, TierInfo | null>>({});
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingFan, setEditingFan] = useState<Fan | null>(null);
  const [deletingFan, setDeletingFan] = useState<Fan | null>(null);
  const [formData, setFormData] = useState({
    displayName: "",
    residenceArea: "",
    memo: "",
  });

  const fetchFans = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/fans?${params}`);
      const data = await res.json();
      setFans(data);

      // Fetch tier info from ranking API (cumulative mode gives us tiers)
      try {
        const rankRes = await fetch("/api/ranking?mode=cumulative");
        const rankData = await rankRes.json();
        const tierMap: Record<string, TierInfo | null> = {};
        for (const r of rankData) {
          tierMap[r.fanId] = r.tier ?? null;
        }
        setFanTiers(tierMap);
      } catch {
        // Tier info is optional, don't block the page
      }
    } catch {
      toast.error("ファンの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchFans();
  }, [fetchFans]);

  const openCreateDialog = () => {
    setEditingFan(null);
    setFormData({ displayName: "", residenceArea: "", memo: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (fan: Fan) => {
    setEditingFan(fan);
    setFormData({
      displayName: fan.displayName,
      residenceArea: fan.residenceArea,
      memo: fan.memo ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.displayName.trim()) {
      toast.error("お名前は必須です");
      return;
    }
    if (!formData.residenceArea) {
      toast.error("居住エリアを選択してください");
      return;
    }

    try {
      const url = editingFan ? `/api/fans/${editingFan.id}` : "/api/fans";
      const method = editingFan ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "保存に失敗しました");
      }

      toast.success(editingFan ? "更新しました" : "登録しました");
      setDialogOpen(false);
      fetchFans();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "エラーが発生しました");
    }
  };

  const handleDelete = async () => {
    if (!deletingFan) return;
    try {
      const res = await fetch(`/api/fans/${deletingFan.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("削除に失敗しました");
      toast.success("削除しました");
      setDeleteDialogOpen(false);
      setDeletingFan(null);
      fetchFans();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-violet-500" />
            お客様一覧
          </h1>
          <p className="text-muted-foreground mt-0.5">
            お客様の登録・編集・管理
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          お客様を追加
        </Button>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="名前で検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">読み込み中...</p>
          ) : fans.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {search ? "該当するファンが見つかりません" : "ファンが登録されていません"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">お名前</TableHead>
                    <TableHead className="w-20 hidden sm:table-cell">ティア</TableHead>
                    <TableHead className="whitespace-nowrap">エリア</TableHead>
                    <TableHead className="hidden md:table-cell">メモ</TableHead>
                    <TableHead className="hidden md:table-cell">登録日</TableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fans.map((fan) => (
                    <TableRow key={fan.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium whitespace-nowrap">
                        <Link
                          href={`/fans/${fan.id}`}
                          className="hover:underline text-primary hover:text-primary/80 transition-colors"
                        >
                          {fan.displayName} 様
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <TierBadge tier={fanTiers[fan.id] ?? null} size="sm" />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">
                          {AREA_LABELS[fan.residenceArea as Area] ?? fan.residenceArea}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {fan.memo || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm whitespace-nowrap">
                        {format(new Date(fan.createdAt), "yyyy/MM/dd")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(fan)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setDeletingFan(fan);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFan ? "お客様情報の編集" : "お客様の新規登録"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="displayName">お名前 *</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
                placeholder="例: 山田 太郎"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="residenceArea">居住エリア *</Label>
              <Select
                value={formData.residenceArea}
                onValueChange={(v) =>
                  setFormData({ ...formData, residenceArea: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="エリアを選択" />
                </SelectTrigger>
                <SelectContent>
                  {PHYSICAL_AREAS.map((area) => (
                    <SelectItem key={area} value={area}>
                      {AREA_LABELS[area as Area]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="memo">メモ</Label>
              <Textarea
                id="memo"
                value={formData.memo}
                onChange={(e) =>
                  setFormData({ ...formData, memo: e.target.value })
                }
                placeholder="自由メモ"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit}>
              {editingFan ? "更新" : "登録"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>削除確認</DialogTitle>
          </DialogHeader>
          <p>
            <strong>{deletingFan?.displayName} 様</strong>
            を削除しますか？関連する記録も全て削除されます。
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
