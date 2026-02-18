"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, AlertCircle, CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";

interface PreviewResult {
  total: number;
  valid: number;
  errors: { row: number; message: string }[];
  preview: Record<string, unknown>[];
}

interface ImportResult {
  success: boolean;
  created: number;
  total: number;
}

function CSVImportSection({
  title,
  apiEndpoint,
  sampleCSV,
  sampleFilename,
}: {
  title: string;
  apiEndpoint: string;
  sampleCSV: string;
  sampleFilename: string;
}) {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setPreview(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handlePreview = async () => {
    if (!csvText.trim()) {
      toast.error("CSVファイルを選択してください");
      return;
    }

    setIsLoading(true);
    setImportResult(null);
    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, dryRun: true }),
      });
      const data = await res.json();
      setPreview(data);
      if (data.errors?.length > 0) {
        toast.warning(`${data.errors.length}件のエラーがあります`);
      } else {
        toast.success(`${data.valid}件のデータを確認しました`);
      }
    } catch {
      toast.error("プレビューに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!csvText.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, dryRun: false }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setImportResult(data);
        toast.success(`${data.created}件をインポートしました`);
        setCsvText("");
        setFileName("");
        setPreview(null);
      } else {
        setPreview(data);
        toast.error(data.error || "インポートに失敗しました");
      }
    } catch {
      toast.error("インポートに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSample = () => {
    const bom = "\uFEFF";
    const blob = new Blob([bom + sampleCSV], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = sampleFilename;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("サンプルCSVをダウンロードしました");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ファイル選択 */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
                <Upload className="h-4 w-4" />
                CSVファイルを選択
              </div>
            </label>
            {fileName && (
              <span className="text-sm text-muted-foreground">{fileName}</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSample}
              className="gap-1"
            >
              <Download className="h-3 w-3" />
              サンプルCSV
            </Button>
          </div>

          {csvText && (
            <div className="flex gap-2">
              <Button
                onClick={handlePreview}
                disabled={isLoading}
                variant="outline"
              >
                プレビュー
              </Button>
              <Button
                onClick={handleImport}
                disabled={isLoading || (preview !== null && (preview.errors?.length ?? 0) > 0)}
              >
                {isLoading ? "処理中..." : "インポート実行"}
              </Button>
            </div>
          )}
        </div>

        {/* インポート結果 */}
        {importResult && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-green-700 dark:text-green-300 font-medium">
              {importResult.created}件のデータをインポートしました
            </span>
          </div>
        )}

        {/* エラー表示 */}
        {preview && preview.errors && preview.errors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">
                {preview.errors.length}件のエラー
              </span>
            </div>
            <div className="max-h-40 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">行</TableHead>
                    <TableHead>エラー内容</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.errors.map((err, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge variant="destructive">{err.row}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{err.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* プレビュー */}
        {preview && preview.preview && preview.preview.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              プレビュー（先頭{Math.min(10, preview.preview.length)}件 /
              有効{preview.valid}件）
            </p>
            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(preview.preview[0]).map((key) => (
                      <TableHead key={key} className="whitespace-nowrap text-xs">
                        {key}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.preview.map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).map((val, j) => (
                        <TableCell key={j} className="text-xs whitespace-nowrap">
                          {String(val ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const FAN_SAMPLE_CSV = `表示名,居住エリア,メモ
タロウ,KOBE,常連ファン
ハナコ,OSAKA,2024年から参加
ジロウ,TOKYO,`;

const LOG_SAMPLE_CSV = `日付,ファン名,種別,会場エリア,回数,物販(円),スパチャ(円),メモ
2025-01-15,タロウ,PaidLive,OSAKA,1,5000,0,
2025-01-16,ハナコ,FreeLive,KOBE,1,0,0,初参加
2025-01-20,タロウ,YouTube,ONLINE,1,0,1000,スパチャ`;

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Upload className="h-6 w-6" />
          CSV一括インポート
        </h1>
        <p className="text-muted-foreground">
          CSVファイルからファンや参加ログをまとめて登録できます
        </p>
      </div>

      <Tabs defaultValue="fans" className="w-full">
        <TabsList>
          <TabsTrigger value="fans">ファン登録</TabsTrigger>
          <TabsTrigger value="logs">ログ登録</TabsTrigger>
        </TabsList>

        <TabsContent value="fans" className="mt-4">
          <CSVImportSection
            title="ファン一括登録"
            apiEndpoint="/api/import/fans"
            sampleCSV={FAN_SAMPLE_CSV}
            sampleFilename="fan-sample.csv"
          />

          <Card className="mt-4">
            <CardContent className="pt-4">
              <h3 className="font-medium mb-2">CSVフォーマット</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>必須列:</strong> 表示名, 居住エリア
                </p>
                <p>
                  <strong>任意列:</strong> メモ
                </p>
                <p>
                  <strong>エリア:</strong> KOBE / OSAKA / NARA / TOKYO / MITO /
                  SHIKOKU / OTHER（日本語名も可）
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <CSVImportSection
            title="参加ログ一括登録"
            apiEndpoint="/api/import/logs"
            sampleCSV={LOG_SAMPLE_CSV}
            sampleFilename="log-sample.csv"
          />

          <Card className="mt-4">
            <CardContent className="pt-4">
              <h3 className="font-medium mb-2">CSVフォーマット</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>必須列:</strong> 日付, ファン名, 種別, 会場エリア
                </p>
                <p>
                  <strong>任意列:</strong> 回数(デフォルト1), 物販(円),
                  スパチャ(円), メモ
                </p>
                <p>
                  <strong>日付:</strong> YYYY-MM-DD形式
                </p>
                <p>
                  <strong>種別:</strong> PaidLive / FreeLive / PaidStream /
                  YouTube（日本語名も可）
                </p>
                <p>
                  <strong>注意:</strong>{" "}
                  ファン名は事前に登録されている必要があります（先にファン登録を行ってください）
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
