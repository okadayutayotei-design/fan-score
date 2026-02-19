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
import { Settings, Save, Pencil, Trash2, Plus, Gift } from "lucide-react";
import { toast } from "sonner";
import { AREAS, AREA_LABELS, type Area } from "@/lib/constants";
import { TierBadge } from "@/components/tier-badge";

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

interface TierBenefitRow {
  id: string;
  tierId: string;
  title: string;
  description: string | null;
  sortOrder: number;
}

interface TierRow {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  minScore: number;
  sortOrder: number;
  description: string | null;
  benefits: TierBenefitRow[];
}

const TIER_ICONS = [
  { value: "crown", label: "Crown" },
  { value: "medal", label: "Medal" },
  { value: "award", label: "Award" },
  { value: "shield", label: "Shield" },
  { value: "star", label: "Star" },
  { value: "heart", label: "Heart" },
  { value: "gem", label: "Gem" },
  { value: "trophy", label: "Trophy" },
  { value: "user", label: "User" },
  { value: "zap", label: "Zap" },
];

export default function SettingsPage() {
  const [, setSettings] = useState<Record<string, unknown>>({});
  const [multipliers, setMultipliers] = useState<MultiplierRow[]>([]);
  const [tiers, setTiers] = useState<TierRow[]>([]);
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

  // Tier dialog
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<TierRow | null>(null);
  const [tierForm, setTierForm] = useState({
    name: "",
    slug: "",
    color: "#3B82F6",
    icon: "star",
    minScore: "0",
    sortOrder: "1",
    description: "",
  });

  // Benefit dialog
  const [benefitDialogOpen, setBenefitDialogOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<TierBenefitRow | null>(null);
  const [benefitTierId, setBenefitTierId] = useState<string>("");
  const [benefitForm, setBenefitForm] = useState({
    title: "",
    description: "",
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [settingsRes, multsRes, tiersRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/area-multipliers"),
        fetch("/api/tiers"),
      ]);
      const settingsData: SettingRow[] = await settingsRes.json();
      const multsData: MultiplierRow[] = await multsRes.json();
      const tiersData: TierRow[] = await tiersRes.json();

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
      setTiers(tiersData);
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

  // Tier CRUD
  const openTierDialog = (tier?: TierRow) => {
    if (tier) {
      setEditingTier(tier);
      setTierForm({
        name: tier.name,
        slug: tier.slug,
        color: tier.color,
        icon: tier.icon,
        minScore: tier.minScore.toString(),
        sortOrder: tier.sortOrder.toString(),
        description: tier.description ?? "",
      });
    } else {
      setEditingTier(null);
      const nextOrder = tiers.length > 0 ? Math.max(...tiers.map(t => t.sortOrder)) + 1 : 1;
      setTierForm({
        name: "",
        slug: "",
        color: "#3B82F6",
        icon: "star",
        minScore: "0",
        sortOrder: nextOrder.toString(),
        description: "",
      });
    }
    setTierDialogOpen(true);
  };

  const saveTier = async () => {
    if (!tierForm.name || !tierForm.slug) {
      toast.error("ティア名とスラッグは必須です");
      return;
    }
    const minScore = parseFloat(tierForm.minScore);
    const sortOrder = parseInt(tierForm.sortOrder);
    if (isNaN(minScore) || isNaN(sortOrder)) {
      toast.error("数値を正しく入力してください");
      return;
    }

    try {
      const body = {
        name: tierForm.name,
        slug: tierForm.slug,
        color: tierForm.color,
        icon: tierForm.icon,
        minScore,
        sortOrder,
        description: tierForm.description || null,
      };

      if (editingTier) {
        await fetch(`/api/tiers/${editingTier.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/tiers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      toast.success("ティアを保存しました");
      setTierDialogOpen(false);
      fetchData();
    } catch {
      toast.error("ティアの保存に失敗しました");
    }
  };

  const deleteTier = async (id: string) => {
    try {
      await fetch(`/api/tiers/${id}`, { method: "DELETE" });
      toast.success("ティアを削除しました");
      fetchData();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  // Benefit CRUD
  const openBenefitDialog = (tierId: string, benefit?: TierBenefitRow) => {
    setBenefitTierId(tierId);
    if (benefit) {
      setEditingBenefit(benefit);
      setBenefitForm({
        title: benefit.title,
        description: benefit.description ?? "",
      });
    } else {
      setEditingBenefit(null);
      setBenefitForm({ title: "", description: "" });
    }
    setBenefitDialogOpen(true);
  };

  const saveBenefit = async () => {
    if (!benefitForm.title) {
      toast.error("特典名は必須です");
      return;
    }

    try {
      if (editingBenefit) {
        await fetch(
          `/api/tiers/${benefitTierId}/benefits/${editingBenefit.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: benefitForm.title,
              description: benefitForm.description || null,
            }),
          }
        );
      } else {
        await fetch(`/api/tiers/${benefitTierId}/benefits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: benefitForm.title,
            description: benefitForm.description || null,
          }),
        });
      }
      toast.success("特典を保存しました");
      setBenefitDialogOpen(false);
      fetchData();
    } catch {
      toast.error("特典の保存に失敗しました");
    }
  };

  const deleteBenefit = async (tierId: string, benefitId: string) => {
    try {
      await fetch(`/api/tiers/${tierId}/benefits/${benefitId}`, {
        method: "DELETE",
      });
      toast.success("特典を削除しました");
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
          <Settings className="h-6 w-6 text-slate-500" />
          設定
        </h1>
        <p className="text-muted-foreground mt-0.5">
          ポイント計算の係数・倍率・ティアを管理
        </p>
      </div>

      <Tabs defaultValue="scoring">
        <TabsList>
          <TabsTrigger value="scoring">スコア設定</TabsTrigger>
          <TabsTrigger value="multipliers">距離倍率</TabsTrigger>
          <TabsTrigger value="tiers">ティア設定</TabsTrigger>
        </TabsList>

        <TabsContent value="scoring" className="space-y-4 mt-4">
          {/* Base Points */}
          <Card className="card-elevated">
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
          <Card className="card-elevated">
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
          <Card className="card-elevated">
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

        <TabsContent value="multipliers" className="space-y-4 mt-4">
          <Card className="card-elevated">
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

        {/* Tier Settings Tab */}
        <TabsContent value="tiers" className="space-y-4 mt-4">
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">ティア一覧</CardTitle>
              <Button
                size="sm"
                onClick={() => openTierDialog()}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                ティア追加
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                累積スコアが閾値以上のファンに自動でティアが付与されます。表示順が小さいほど上位ティアです。
              </p>
              <div className="space-y-4">
                {tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="border rounded-xl p-5 transition-all hover:shadow-sm"
                    style={{ borderLeftColor: tier.color, borderLeftWidth: "4px" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <TierBadge tier={tier} size="md" />
                        <div>
                          <span className="text-sm text-muted-foreground">
                            閾値: {tier.minScore} pt | 表示順: {tier.sortOrder}
                          </span>
                          {tier.description && (
                            <p className="text-xs text-muted-foreground">
                              {tier.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openTierDialog(tier)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTier(tier.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Benefits */}
                    <div className="mt-3 pl-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium flex items-center gap-1">
                          <Gift className="h-3 w-3" />
                          特典 ({tier.benefits.length})
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs gap-1"
                          onClick={() => openBenefitDialog(tier.id)}
                        >
                          <Plus className="h-3 w-3" />
                          追加
                        </Button>
                      </div>
                      {tier.benefits.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          特典が設定されていません
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {tier.benefits.map((b) => (
                            <div
                              key={b.id}
                              className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50"
                            >
                              <div>
                                <span className="font-medium">{b.title}</span>
                                {b.description && (
                                  <span className="text-muted-foreground text-xs ml-2">
                                    {b.description}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => openBenefitDialog(tier.id, b)}
                                >
                                  <Pencil className="h-2.5 w-2.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => deleteBenefit(tier.id, b.id)}
                                >
                                  <Trash2 className="h-2.5 w-2.5 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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

      {/* Tier Edit Dialog */}
      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTier ? "ティア編集" : "ティア追加"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ティア名</Label>
                <Input
                  value={tierForm.name}
                  onChange={(e) =>
                    setTierForm({ ...tierForm, name: e.target.value })
                  }
                  placeholder="例: ゴールド"
                />
              </div>
              <div>
                <Label>スラッグ (英字)</Label>
                <Input
                  value={tierForm.slug}
                  onChange={(e) =>
                    setTierForm({ ...tierForm, slug: e.target.value })
                  }
                  placeholder="例: gold"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>閾値スコア</Label>
                <Input
                  type="number"
                  step="1"
                  value={tierForm.minScore}
                  onChange={(e) =>
                    setTierForm({ ...tierForm, minScore: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>表示順 (小=上位)</Label>
                <Input
                  type="number"
                  step="1"
                  value={tierForm.sortOrder}
                  onChange={(e) =>
                    setTierForm({ ...tierForm, sortOrder: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>色</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={tierForm.color}
                    onChange={(e) =>
                      setTierForm({ ...tierForm, color: e.target.value })
                    }
                    className="h-10 w-14 rounded-lg cursor-pointer border-2"
                  />
                  <Input
                    value={tierForm.color}
                    onChange={(e) =>
                      setTierForm({ ...tierForm, color: e.target.value })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label>アイコン</Label>
                <Select
                  value={tierForm.icon}
                  onValueChange={(v) =>
                    setTierForm({ ...tierForm, icon: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIER_ICONS.map((ic) => (
                      <SelectItem key={ic.value} value={ic.value}>
                        {ic.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>説明（任意）</Label>
              <Input
                value={tierForm.description}
                onChange={(e) =>
                  setTierForm({ ...tierForm, description: e.target.value })
                }
                placeholder="このティアの説明"
              />
            </div>
            {/* Preview */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">プレビュー:</span>
              <TierBadge
                tier={{ name: tierForm.name || "ティア名", color: tierForm.color, icon: tierForm.icon }}
                size="md"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTierDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button onClick={saveTier}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Benefit Edit Dialog */}
      <Dialog open={benefitDialogOpen} onOpenChange={setBenefitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBenefit ? "特典編集" : "特典追加"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>特典名</Label>
              <Input
                value={benefitForm.title}
                onChange={(e) =>
                  setBenefitForm({ ...benefitForm, title: e.target.value })
                }
                placeholder="例: VIP席への優先案内"
              />
            </div>
            <div>
              <Label>説明（任意）</Label>
              <Input
                value={benefitForm.description}
                onChange={(e) =>
                  setBenefitForm({ ...benefitForm, description: e.target.value })
                }
                placeholder="特典の詳細説明"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBenefitDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button onClick={saveBenefit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
