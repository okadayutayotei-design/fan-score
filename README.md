# Fan Score - ファン貢献度ポイント管理システム

アーティスト活動におけるファンの「来場/視聴」と「支払い（物販・スパチャ）」を数値化し、月ごとにポイント集計してランキング表示するWebアプリケーションです。

## 機能

- **ダッシュボード**: 今月の概要（ファン数・ログ数・トップ10）
- **ファン管理**: ファンの登録・編集・削除（居住エリア付き）
- **参加ログ入力**: イベント参加・視聴ログの高速入力（オートコンプリート対応）
- **月次ランキング**: 総合・参加貢献・遠征貢献・支払い貢献のタブ切替
- **設定管理**: 基礎点・金額係数・逓減率・距離倍率テーブルの管理画面
- **CSV入出力**: ログ一覧のCSVエクスポート、ファン・ログのCSV一括インポート
- **デスクトップアプリ**: Electron版（Windows EXE）

## ポイント計算仕様

### ActionScore（来場/視聴ポイント）
```
actionPoint = attendCount x basePoint x distanceMult x diminishMult
```
- `basePoint`: イベント種別ごとの基礎点（有料ライブ:10, フリーライブ:5, 有料配信:3, YouTube:1）
- `distanceMult`: 居住エリア→会場エリアの距離倍率
- `diminishMult`: rate^(n-1) の逓減（同月・同種別のn回目）

### MoneyScore（支払いポイント）
```
merchPoint = f(merchAmountJPY) x merchCoeff x distanceMult
superchatPoint = f(superchatAmountJPY) x superchatCoeff (距離倍率なし)
```
- `f(x)`: linear / sqrt / log の変換方式（設定で切替可能）

### 総合スコア
```
FanScore = sum(ActionScore + MoneyScore)
```

## 技術スタック

- **Framework**: Next.js 14 (App Router) + TypeScript
- **UI**: shadcn/ui + TailwindCSS
- **DB**: PostgreSQL (Supabase) - Prisma v6 ORM
- **Desktop**: Electron
- **Deploy**: Vercel

## セットアップ

### 前提条件
- Node.js v20 以上

### インストール

```bash
cd fan-score

# 依存関係インストール
npm install

# Prisma クライアント生成
npx prisma generate

# データベースマイグレーション
npx prisma migrate dev

# シードデータ投入（初期倍率テーブル・設定値）
npx prisma db seed
```

### 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアクセスできます。

### 本番ビルド

```bash
npm run build
npm start
```

## クラウドデプロイ（Vercel + Supabase）

### 1. Supabase セットアップ
1. [supabase.com](https://supabase.com) でプロジェクト作成
2. Settings → Database → Connection string (URI) をコピー
3. `.env` の `DATABASE_URL` に設定

### 2. データベース初期化
```bash
# .envにSupabaseの接続文字列を設定後
npx prisma migrate dev --name init
npx prisma db seed
```

### 3. Vercel デプロイ
1. GitHubにリポジトリをプッシュ
2. [vercel.com](https://vercel.com) でプロジェクトをインポート
3. 環境変数に `DATABASE_URL`（SupabaseのConnection string）を設定
4. デプロイ実行

### 4. メンバーへの共有
デプロイ後のURL（例: `https://fan-score.vercel.app`）をメンバーに共有。
全メンバーがブラウザからデータ入力・閲覧可能です。

## デスクトップアプリ（Electron）

Electronアプリはクラウド版のURLをデスクトップアプリとして表示するラッパーです。

### URL設定
`electron/main.js` の `CLOUD_URL` をデプロイ後のVercel URLに変更：
```javascript
const CLOUD_URL = "https://your-fan-score.vercel.app";
```

### 開発時の起動
```bash
npm run electron:dev
```

### EXEビルド（Windows）
```bash
npm run electron:build
```
`dist-electron/` フォルダにインストーラーが生成されます。

## CSV一括インポート

### ファンCSVフォーマット
```csv
表示名,居住エリア,メモ
タロウ,KOBE,常連ファン
ハナコ,OSAKA,
```

### ログCSVフォーマット
```csv
日付,ファン名,種別,会場エリア,回数,物販(円),スパチャ(円),メモ
2025-01-15,タロウ,PaidLive,OSAKA,1,5000,0,
2025-01-16,ハナコ,YouTube,ONLINE,1,0,1000,初スパチャ
```

**注意事項:**
- UTF-8エンコーディング（BOM付きも対応）
- 居住エリアはコード（KOBE等）または日本語名（神戸等）が使用可能
- イベント種別もコード（PaidLive等）または日本語名（有料ライブ等）が使用可能
- ログ登録時、ファン名は事前に登録済みである必要があります
- 画面でプレビュー確認してからインポート実行できます

## ディレクトリ構成

```
fan-score/
├── prisma/
│   ├── schema.prisma      # DBスキーマ（PostgreSQL）
│   ├── seed.ts             # 初期データ
│   └── migrations/         # マイグレーションファイル
├── electron/
│   ├── main.js             # Electronメインプロセス
│   ├── preload.js          # プリロードスクリプト
│   └── package.json        # Electron用設定
├── src/
│   ├── app/
│   │   ├── page.tsx        # ダッシュボード
│   │   ├── fans/           # ファン管理画面
│   │   ├── logs/           # ログ入力・一覧画面
│   │   ├── ranking/        # ランキング画面
│   │   ├── import/         # CSV一括インポート画面
│   │   ├── settings/       # 設定画面
│   │   └── api/            # APIルート
│   ├── components/
│   │   ├── layout/         # サイドバー等
│   │   └── ui/             # shadcn/uiコンポーネント
│   └── lib/
│       ├── constants.ts    # エリア・イベント種別定義
│       ├── csv-parser.ts   # CSVパーサー
│       ├── prisma.ts       # Prismaクライアント
│       ├── scoring.ts      # スコア計算ロジック
│       └── settings.ts     # 設定取得ヘルパー
├── electron-builder.yml    # Electronビルド設定
├── vercel.json             # Vercelデプロイ設定
└── package.json
```

## エリア定義

| コード | 表示名 |
|--------|--------|
| KOBE | 神戸 |
| OSAKA | 大阪 |
| NARA | 奈良 |
| TOKYO | 東京 |
| MITO | 水戸 |
| SHIKOKU | 四国 |
| OTHER | その他 |
| ONLINE | オンライン |

## 初期距離倍率テーブル（一部）

| 出発 → 到着 | 倍率 |
|-------------|------|
| 同一エリア | 1.00 |
| 神戸 ↔ 大阪 | 1.20 |
| 神戸 ↔ 奈良 | 1.20 |
| 神戸 ↔ 四国 | 1.35 |
| 神戸 ↔ 東京 | 1.60 |
| 神戸 ↔ 水戸 | 1.70 |
| オンライン | 常に1.00 |

※全組み合わせはシードデータに定義済み。設定画面から編集可能。
