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
import { AREA_LABELS, PHYSICAL_AREAS, type Area } from "@/lib/constants";

interface Fan {
  id: string;
  displayName: string;
  residenceArea: string;
  memo: string | null;
  createdAt: string;
}

export default function FansPage() {
  const [fans, setFans] = useState<Fan[]>([]);
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
      toast.error("表示名は必須です");
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
            <Users className="h-6 w-6" />
            ファン管理
          </h1>
          <p className="text-muted-foreground">
            ファンの登録・編集・削除
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          新規登録
        </Button>
      </div>

      <Card>
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
                    <TableHead>名前</TableHead>
                    <TableHead>居住エリア</TableHead>
                    <TableHead className="hidden md:table-cell">メモ</TableHead>
                    <TableHead className="w-24">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fans.map((fan) => (
                    <TableRow key={fan.id}>
                      <TableCell className="font-medium">
                        {fan.displayName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {AREA_LABELS[fan.residenceArea as Area] ?? fan.residenceArea}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {fan.memo || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(fan)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
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
              {editingFan ? "ファン編集" : "ファン新規登録"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="displayName">表示名 *</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
                placeholder="例: タロウ"
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
            <strong>{deletingFan?.displayName}</strong>{" "}
            を削除しますか？関連するログも全て削除されます。
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
