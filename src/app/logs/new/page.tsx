"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
// Textarea not needed here
import { ClipboardList, Check, ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AREA_LABELS,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  PHYSICAL_AREAS,
  isOnlineEvent,
  type Area,
} from "@/lib/constants";
import { format } from "date-fns";

interface Fan {
  id: string;
  displayName: string;
  residenceArea: string;
}

function formatNumber(value: number): string {
  return value.toLocaleString("ja-JP");
}

function parseNumber(value: string): number {
  return parseInt(value.replace(/,/g, ""), 10) || 0;
}

export default function NewLogPage() {
  const [fans, setFans] = useState<Fan[]>([]);
  const [fanOpen, setFanOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    fanId: "",
    eventType: "" as string,
    venueArea: "" as string,
    attendCount: "1",
    merchAmountJPY: "0",
    superchatAmountJPY: "0",
    note: "",
  });

  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/fans")
      .then((r) => r.json())
      .then(setFans)
      .catch(() => toast.error("ファン一覧の取得に失敗"));
  }, []);

  const selectedFan = fans.find((f) => f.id === formData.fanId);

  // When eventType changes, auto-set venueArea for online events
  const handleEventTypeChange = (value: string) => {
    const update: Partial<typeof formData> = { eventType: value };
    if (isOnlineEvent(value)) {
      update.venueArea = "ONLINE";
    } else if (formData.venueArea === "ONLINE") {
      update.venueArea = "";
    }
    // Reset superchat for non-YouTube
    if (value !== "YouTube") {
      update.superchatAmountJPY = "0";
    }
    setFormData((prev) => ({ ...prev, ...update }));
  };

  const resetForm = () => {
    setFormData((prev) => ({
      ...prev,
      fanId: "",
      eventType: "",
      venueArea: "",
      attendCount: "1",
      merchAmountJPY: "0",
      superchatAmountJPY: "0",
      note: "",
    }));
    // Keep the date for consecutive entries
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date) {
      toast.error("日付を入力してください");
      return;
    }
    if (!formData.fanId) {
      toast.error("ファンを選択してください");
      return;
    }
    if (!formData.eventType) {
      toast.error("イベント種別を選択してください");
      return;
    }
    if (!formData.venueArea) {
      toast.error("会場エリアを選択してください");
      return;
    }

    const attendCount = parseInt(formData.attendCount, 10);
    if (isNaN(attendCount) || attendCount < 1) {
      toast.error("参加回数は1以上を入力してください");
      return;
    }

    const merchAmount = parseNumber(formData.merchAmountJPY);
    const superchatAmount = parseNumber(formData.superchatAmountJPY);

    if (merchAmount < 0 || superchatAmount < 0) {
      toast.error("金額は0以上を入力してください");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formData.date,
          fanId: formData.fanId,
          eventType: formData.eventType,
          venueArea: formData.venueArea,
          attendCount,
          merchAmountJPY: merchAmount,
          superchatAmountJPY: superchatAmount,
          note: formData.note || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "保存に失敗しました");
      }

      setSavedCount((c) => c + 1);
      toast.success(
        `ログを保存しました (${selectedFan?.displayName}) — 連続${savedCount + 1}件目`
      );
      resetForm();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          参加ログ追加
        </h1>
        <p className="text-muted-foreground">
          イベント参加・視聴ログを入力
          {savedCount > 0 && (
            <span className="ml-2 text-green-600 font-medium">
              ({savedCount}件保存済み)
            </span>
          )}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date */}
            <div>
              <Label htmlFor="date">日付 *</Label>
              <Input
                id="date"
                ref={dateRef}
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>

            {/* Fan selection with autocomplete */}
            <div>
              <Label>ファン *</Label>
              <Popover open={fanOpen} onOpenChange={setFanOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={fanOpen}
                    className="w-full justify-between"
                  >
                    {selectedFan
                      ? `${selectedFan.displayName} (${
                          AREA_LABELS[selectedFan.residenceArea as Area] ??
                          selectedFan.residenceArea
                        })`
                      : "ファンを選択..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="名前で検索..." />
                    <CommandList>
                      <CommandEmpty>見つかりません</CommandEmpty>
                      <CommandGroup>
                        {fans.map((fan) => (
                          <CommandItem
                            key={fan.id}
                            value={fan.displayName}
                            onSelect={() => {
                              setFormData({ ...formData, fanId: fan.id });
                              setFanOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.fanId === fan.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {fan.displayName}
                            <span className="ml-auto text-xs text-muted-foreground">
                              {AREA_LABELS[fan.residenceArea as Area] ??
                                fan.residenceArea}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Event Type */}
            <div>
              <Label>イベント種別 *</Label>
              <Select
                value={formData.eventType}
                onValueChange={handleEventTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="種別を選択" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {EVENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Venue Area */}
            <div>
              <Label>会場エリア *</Label>
              <Select
                value={formData.venueArea}
                onValueChange={(v) =>
                  setFormData({ ...formData, venueArea: v })
                }
                disabled={isOnlineEvent(formData.eventType)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isOnlineEvent(formData.eventType)
                        ? "オンライン"
                        : "エリアを選択"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(isOnlineEvent(formData.eventType)
                    ? (["ONLINE"] as const)
                    : PHYSICAL_AREAS
                  ).map((area) => (
                    <SelectItem key={area} value={area}>
                      {AREA_LABELS[area as Area]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Attend count */}
            <div>
              <Label htmlFor="attendCount">参加回数</Label>
              <Input
                id="attendCount"
                type="number"
                min="1"
                value={formData.attendCount}
                onChange={(e) =>
                  setFormData({ ...formData, attendCount: e.target.value })
                }
              />
            </div>

            {/* Merch Amount */}
            <div>
              <Label htmlFor="merchAmount">物販金額 (円)</Label>
              <Input
                id="merchAmount"
                type="text"
                inputMode="numeric"
                value={
                  formData.merchAmountJPY === "0"
                    ? ""
                    : formatNumber(parseNumber(formData.merchAmountJPY))
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    merchAmountJPY: e.target.value.replace(/,/g, ""),
                  })
                }
                placeholder="0"
              />
            </div>

            {/* Superchat Amount (YouTube only) */}
            {formData.eventType === "YouTube" && (
              <div>
                <Label htmlFor="superchatAmount">スパチャ金額 (円)</Label>
                <Input
                  id="superchatAmount"
                  type="text"
                  inputMode="numeric"
                  value={
                    formData.superchatAmountJPY === "0"
                      ? ""
                      : formatNumber(
                          parseNumber(formData.superchatAmountJPY)
                        )
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      superchatAmountJPY: e.target.value.replace(/,/g, ""),
                    })
                  }
                  placeholder="0"
                />
              </div>
            )}

            {/* Note */}
            <div>
              <Label htmlFor="note">メモ</Label>
              <Input
                id="note"
                value={formData.note}
                onChange={(e) =>
                  setFormData({ ...formData, note: e.target.value })
                }
                placeholder="任意"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1 gap-2" disabled={saving}>
                <Plus className="h-4 w-4" />
                {saving ? "保存中..." : "保存して次へ"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
