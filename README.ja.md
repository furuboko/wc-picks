# ⚽ WC PICKS — 2026 FIFA ワールドカップ グループリーグ予想

[English version here](README.md)

友人同士で 2026 FIFA ワールドカップのグループリーグ順位を予想するウェブアプリです。  
締切前に全グループの順位を予想し、公式結果が入力されると自動的にスコアが計算されます。

---

## スクリーンショット

| ダッシュボード | ドラッグ＆ドロップ予想 |
|:---:|:---:|
| ![ダッシュボード](docs/screenshots/home-logged-in.png) | ![予想入力](docs/screenshots/predict.png) |

| スコアボード | みんなの予想 |
|:---:|:---:|
| ![スコアボード](docs/screenshots/scores.png) | ![みんなの予想](docs/screenshots/predictions.png) |

<details>
<summary>📱 モバイル表示</summary>

| ホーム | 予想入力 |
|:---:|:---:|
| ![モバイルホーム](docs/screenshots/mobile-home.png) | ![モバイル予想](docs/screenshots/mobile-predict.png) |

</details>

---

## 機能

- **Google ログイン** — ワンクリックでサインイン、パスワード不要
- **ドラッグ＆ドロップ** で全 12 グループの順位を予想
- 管理者が選択できる **4 種類の採点パターン**
- 結果入力後の **自動採点**
- グループ別内訳付き **スコアボード**
- 締切まで非表示になる **予想公開** 機能
- **モバイル対応** レスポンシブデザイン
- Firebase 無料枠で **セルフホスト** 可能

---

## 採点ルール

管理者が締切前に4つのパターンから1つを選択できます。デフォルトは **Classic** です。

### Classic（デフォルト）

| 条件 | 得点 |
|---|---|
| 1〜4位を完全的中 | **+5** |
| 上位2チーム（1・2位）と下位2チーム（3・4位）の組み合わせが一致（順不同） | **+3** |
| 1位に予想したチームがグループステージで敗退 | **−3** |

- +5 と +3 は重複しない（+5 優先）
- −3 は +5 も +3 も成立しない場合のみ適用

### No Penalty

Classic と同じルールだが −3 ペナルティなし。

### Per Position

各順位の正解ごとに +1（最大 +4）、完全的中ボーナス +1（計最大 +5）。

### Top Heavy

1位的中 +3 / 2位的中 +2 / 3位的中 +1 を重複加算（最大 +6、ペナルティなし）。

---

## スケジュール

| 日時 | イベント |
|---|---|
| 〜2026-06-11 23:59 JST | 予想受付・編集可能 |
| 2026-06-12 00:00 JST〜 | 全員の予想が公開 |

---

## セルフホスティング手順

### 必要なもの

- [Node.js](https://nodejs.org/) 20以上
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
- Google アカウント

### 1. クローン & インストール

```bash
git clone <このリポジトリのURL>
cd wc-picks
npm install
```

### 2. Firebase プロジェクト作成

1. [https://console.firebase.google.com/](https://console.firebase.google.com/) にアクセス
2. **「プロジェクトを追加」** → 任意のプロジェクト名を入力
3. Google Analytics: **無効** でOK
4. プロジェクト作成完了まで待つ

### 3. Authentication を有効化

1. Firebase コンソール → **Authentication** → **始める**
2. **Google** サインインを有効化 → サポートメールを設定 → 保存
3. **設定 → 承認済みドメイン** にデプロイ先のドメインを追加（デプロイ後）

### 4. Firestore を有効化

1. Firebase コンソール → **Firestore Database** → **データベースを作成**
2. リージョン: ユーザーに近い場所を選択（日本なら `asia-northeast1`）
3. セキュリティルール: **テストモードで開始**（正しいルールは手順7でデプロイします）

### 5. ウェブアプリを登録して設定値を取得

1. Firebase コンソール → プロジェクトの概要 → **`</>`**（ウェブ）
2. ニックネームを入力（例: `wc-picks-web`）→ **アプリを登録**
3. 表示された `firebaseConfig` の値をコピー

### 6. 環境変数を設定

```bash
cp .env.local.example .env.local
```

`.env.local` を開き、上でコピーした値を入力:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_DATABASE_ID=default
NEXT_PUBLIC_APP_URL=https://<your-project-id>.web.app
```

### 7. Firebase CLI を接続してルールをデプロイ

```bash
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules
```

### 8. 管理者アカウントを設定

試合結果を `/admin` ページから入力するために、最低1名の管理者が必要です。

1. ローカルでアプリを起動（`npm run dev`）し、Google アカウントでサインイン
2. Firebase コンソール → Firestore → **`allowlist`** コレクションを作成
3. **自分の Gmail アドレス** をドキュメントIDとしてドキュメントを追加:
   - フィールド: `role` → 値: `"admin"`（文字列）
   - フィールド: `addedAt` → 値: 現在のタイムスタンプ

### 9. Firebase Hosting にデプロイ

```bash
npm run deploy
```

`clean → build → firebase deploy --only hosting` を順に実行します。

アプリは `https://<your-project-id>.web.app` で公開されます。

---

## ローカル開発

```bash
npm run dev        # http://localhost:3000
npm test           # ユニットテストを実行（ウォッチモード）
npm run test:run   # ユニットテストを一度だけ実行
npm run test:e2e   # E2E テストを実行（Playwright）
npm run emulator   # Firebase エミュレーターを起動
```

---

## 試合結果の入力（管理者）

1. 管理者の Google アカウントでサインイン
2. `/admin` ページへ移動
3. 各グループで、チームを最終順位にドラッグして並び替え
4. 3位のチームが突破する場合は **3位** トグルをオン
5. **保存** をクリック — 全参加者のスコアが自動で更新されます

---

## ファイル構成

```
wc-picks/
├── src/
│   ├── app/
│   │   ├── page.tsx              # ホーム（グループ一覧・予想状況）
│   │   ├── predict/[group]/      # 予想入力（ドラッグ&ドロップ）
│   │   ├── predictions/          # 全員の予想（締切後公開）
│   │   ├── scores/               # スコアボード
│   │   └── admin/                # 管理者: 試合結果入力・採点パターン選択
│   ├── components/
│   ├── contexts/
│   │   ├── AuthContext.tsx       # Firebase Auth 状態管理
│   │   └── PredictionsContext.tsx# ページ間の予想データ共有
│   ├── data/
│   │   └── groups.ts             # 12グループ × 4チーム
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── usePredictions.ts
│   └── lib/
│       ├── constants.ts          # DEADLINE・REVEAL・採点パターン定数
│       ├── firebase.ts           # Firebase 初期化
│       ├── firestore.ts          # Firestore 読み書き
│       ├── scoring.ts            # 採点ロジック（純粋関数）
│       └── utils.ts              # 共通ユーティリティ
├── firestore.rules               # セキュリティルール
├── firebase.json                 # Firebase 設定
└── .env.local.example            # 環境変数テンプレート
```

---

## 技術スタック

- [Next.js](https://nextjs.org/)（Static Export）
- [Firebase](https://firebase.google.com/) — Authentication, Firestore, Hosting
- [Tailwind CSS](https://tailwindcss.com/)
- [@dnd-kit](https://dndkit.com/) — ドラッグ&ドロップ

---

## ライセンス

MIT
