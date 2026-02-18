"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Save, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { AREAS, AREA_LABELS, type Area } from "@/lib/constants";

interface SettingRow {
  id: string;
  key: string;
  value: string;
}

interface MultiplierRow {
  id: string;
  fromArea: string;
  toArea: string;
  multiplier: number;
}

export default function SettingsPage() {
  const [, setSettings] = useState<Record<string, unknown>>({});
  const [multipliers, setMultipliers] = useState<MultiplierRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state for settings
  const [pointsBase, setPointsBase] = useState({
    paidLiveBase: 10,
    freeLiveBase: 5,
    paidStreamBase: 3,
    youtubeViewBase: 1,
  });
  const [moneyCoeff, setMoneyCoeff] = useState({
    merchCoeff: 0.01,
    superchatCoeff: 0.02,
  });
  const [moneyMode, setMoneyMode] = useState("sqrt");
  const [diminishing, setDiminishing] = useState({
    enabled: true,
    rate: 0.9,
    applyTo: ["PaidLive", "FreeLive", "PaidStream"] as string[],
  });

  // Multiplier dialog
  const [multDialogOpen, setMultDialogOpen] = useState(false);
  const [editingMult, setEditingMult] = useState<MultiplierRow | null>(null);
  const [multForm, setMultForm] = useState({
    fromArea: "",
    toArea: "",
    multiplier: "1.0",
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [settingsRes, multsRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/area-multipliers"),
      ]);
      const settingsData: SettingRow[] = await settingsRes.json();
      const multsData: MultiplierRow[] = await multsRes.json();

      // Parse settings
      const map: Record<string, unknown> = {};
      for (const s of settingsData) {
        map[s.key] = JSON.parse(s.value);
      }

      if (map.pointsBase)
        setPointsBase(
          map.pointsBase as typeof pointsBase
        );
      if (map.moneyCoeff)
        setMoneyCoeff(map.moneyCoeff as typeof moneyCoeff);
      if (map.moneyMode) setMoneyMode(map.moneyMode as string);
      if (map.diminishingReturns)
        setDiminishing(
          map.diminishingReturns as typeof diminishing
        );

      setSettings(map);
      setMultipliers(multsData);
    } catch {
      toast.error("設定の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: "pointsBase", value: pointsBase },
        { key: "moneyCoeff", value: moneyCoeff },
        { key: "moneyMode", value: moneyMode },
        { key: "diminishingReturns", value: diminishing },
      ];

      for (const update of updates) {
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(update),
        });
      }

      toast.success("設定を保存しました");
    } catch {
      toast.error("設定の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const openMultDialog = (mult?: MultiplierRow) => {
    if (mult) {
      setEditingMult(mult);
      setMultForm({
        fromArea: mult.fromArea,
        toArea: mult.toArea,
        multiplier: mult.multiplier.toString(),
      });
    } else {
      setEditingMult(null);
      setMultForm({ fromArea: "", toArea: "", multiplier: "1.0" });
    }
    setMultDialogOpen(true);
  };

  const saveMultiplier = async () => {
    const mult = parseFloat(multForm.multiplier);
    if (isNaN(mult) || mult <= 0) {
      toast.error("倍率は正の数値を入力してください");
      return;
    }
    if (!multForm.fromArea || !multForm.toArea) {
      toast.error("エリアを選択してください");
      return;
    }

    try {
      if (editingMult) {
        await fetch(`/api/area-multipliers/${editingMult.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromArea: multForm.fromArea,
            toArea: multForm.toArea,
            multiplier: mult,
          }),
        });
      } else {
        await fetch("/api/area-multipliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromArea: multForm.fromArea,
            toArea: multForm.toArea,
            multiplier: mult,
          }),
        });
      }
      toast.success("倍率を保存しました");
      setMultDialogOpen(false);
      fetchData();
    } catch {
      toast.error("倍率の保存に失敗しました");
    }
  };

  const deleteMultiplier = async (id: string) => {
    try {
      await fetch(`/api/area-multipliers/${id}`, { method: "DELETE" });
      toast.success("倍率を削除しました");
      fetchData();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">読み込み中...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          設定
        </h1>
        <p className="text-muted-foreground">
          ポイント計算の係数・倍率を管理
        </p>
      </div>

      <Tabs defaultValue="scoring">
        <TabsList>
          <TabsTrigger value="scoring">スコア設定</TabsTrigger>
          <TabsTrigger value="multipliers">距離倍率</TabsTrigger>
        </TabsList>

        <TabsContent value="scoring" className="space-y-4">
          {/* Base Points */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">基礎点</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label>有料ライブ</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={pointsBase.paidLiveBase}
                  onChange={(e) =>
                    setPointsBase({
                      ...pointsBase,
                      paidLiveBase: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>フリーライブ</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={pointsBase.freeLiveBase}
                  onChange={(e) =>
                    setPointsBase({
                      ...pointsBase,
                      freeLiveBase: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>有料配信</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={pointsBase.paidStreamBase}
                  onChange={(e) =>
                    setPointsBase({
                      ...pointsBase,
                      paidStreamBase: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>YouTube</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={pointsBase.youtubeViewBase}
                  onChange={(e) =>
                    setPointsBase({
                      ...pointsBase,
                      youtubeViewBase: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Money Coefficients */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">金額係数</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>物販係数</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={moneyCoeff.merchCoeff}
                    onChange={(e) =>
                      setMoneyCoeff({
                        ...moneyCoeff,
                        merchCoeff: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>スパチャ係数</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={moneyCoeff.superchatCoeff}
                    onChange={(e) =>
                      setMoneyCoeff({
                        ...moneyCoeff,
                        superchatCoeff: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>金額変換方式</Label>
                <Select value={moneyMode} onValueChange={setMoneyMode}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">そのまま (linear)</SelectItem>
                    <SelectItem value="sqrt">平方根 (sqrt)</SelectItem>
                    <SelectItem value="log">対数 (log)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Diminishing Returns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">回数逓減</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label>有効/無効</Label>
                <Select
                  value={diminishing.enabled ? "true" : "false"}
                  onValueChange={(v) =>
                    setDiminishing({
                      ...diminishing,
                      enabled: v === "true",
                    })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">ON</SelectItem>
                    <SelectItem value="false">OFF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {diminishing.enabled && (
                <>
                  <div>
                    <Label>逓減率 (0〜1)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={diminishing.rate}
                      onChange={(e) =>
                        setDiminishing({
                          ...diminishing,
                          rate: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-32"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      n回目のポイント = 基礎点 × {diminishing.rate}^(n-1)
                    </p>
                  </div>
                  <div>
                    <Label>適用対象</Label>
                    <div className="flex gap-4 mt-2">
                      {["PaidLive", "FreeLive", "PaidStream", "YouTube"].map(
                        (type) => (
                          <label
                            key={type}
                            className="flex items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={diminishing.applyTo.includes(type)}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...diminishing.applyTo, type]
                                  : diminishing.applyTo.filter(
                                      (t) => t !== type
                                    );
                                setDiminishing({
                                  ...diminishing,
                                  applyTo: next,
                                });
                              }}
                            />
                            {type === "PaidLive"
                              ? "有料ライブ"
                              : type === "FreeLive"
                              ? "フリーライブ"
                              : type === "PaidStream"
                              ? "有料配信"
                              : "YouTube"}
                          </label>
                        )
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={saveSettings}
            disabled={saving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "保存中..." : "設定を保存"}
          </Button>
        </TabsContent>

        <TabsContent value="multipliers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">距離倍率テーブル</CardTitle>
              <Button
                size="sm"
                onClick={() => openMultDialog()}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                追加
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>出発エリア</TableHead>
                      <TableHead>到着エリア</TableHead>
                      <TableHead className="text-right">倍率</TableHead>
                      <TableHead className="w-20">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {multipliers.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          {AREA_LABELS[m.fromArea as Area] ?? m.fromArea}
                        </TableCell>
                        <TableCell>
                          {AREA_LABELS[m.toArea as Area] ?? m.toArea}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {m.multiplier.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openMultDialog(m)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMultiplier(m.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Multiplier Edit Dialog */}
      <Dialog open={multDialogOpen} onOpenChange={setMultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMult ? "倍率編集" : "倍率追加"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>出発エリア（居住地）</Label>
              <Select
                value={multForm.fromArea}
                onValueChange={(v) =>
                  setMultForm({ ...multForm, fromArea: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択" />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {AREA_LABELS[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>到着エリア（会場）</Label>
              <Select
                value={multForm.toArea}
                onValueChange={(v) =>
                  setMultForm({ ...multForm, toArea: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択" />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {AREA_LABELS[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>倍率</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={multForm.multiplier}
                onChange={(e) =>
                  setMultForm({ ...multForm, multiplier: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMultDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button onClick={saveMultiplier}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
