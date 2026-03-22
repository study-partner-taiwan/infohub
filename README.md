# InfoHub 📡 資訊聚合平台

智慧收集、AI 自動分類你從各種媒體儲存下來的資訊。

## 功能特色

- **手機分享直達**：在 Instagram、YouTube 等 App 按分享鍵，直接分享到 InfoHub（PWA Share Target）
- **電腦手動新增**：貼上任何連結，一鍵儲存
- **AI 自動分類**：使用 Claude API 自動分析內容並分類（美食、旅遊、科技...等 20 種類別）
- **分類瀏覽**：按分類標籤快速篩選已收集的資訊
- **支援多平台**：Instagram、YouTube、Twitter/X、TikTok、Reddit、任何網頁

## 快速開始

### 1. 安裝

```bash
cd infohub
npm install
```

### 2. 設定環境變數

```bash
cp .env.example .env.local
```

編輯 `.env.local`，填入你的 Claude API Key：

```
ANTHROPIC_API_KEY=sk-ant-你的API金鑰
```

> 沒有 API Key 也能使用！系統會改用關鍵字分類（準確度較低）。
> API Key 可從 https://console.anthropic.com 取得。

### 3. 啟動

```bash
npm run dev
```

開啟瀏覽器前往 http://localhost:3000

## 如何從 Instagram 分享到 InfoHub

### 手機端（PWA 方式）

1. 用手機瀏覽器打開 `http://你的電腦IP:3000`
2. 點選「加到主畫面」（Safari 分享 → 加入主畫面 / Chrome 選單 → 安裝應用程式）
3. 安裝完成後，在 Instagram 中：
   - 看到喜歡的 Reel 或貼文
   - 點擊「分享」按鈕
   - 在分享選單中找到 **InfoHub**
   - 點擊即可自動儲存與分類！

### 電腦端

1. 打開 InfoHub 網頁
2. 點擊右上角「+ 新增」
3. 貼上 Instagram 連結
4. 按「儲存並分類」

## 技術架構

```
infohub/
├── src/
│   ├── app/
│   │   ├── page.tsx            # 主頁面（儀表板）
│   │   ├── share/page.tsx      # 分享接收頁面
│   │   └── api/
│   │       ├── sources/route.ts  # 來源 CRUD API
│   │       ├── classify/route.ts # AI 分類 API
│   │       └── share/route.ts    # PWA 分享接收
│   ├── lib/
│   │   ├── db.ts               # 資料庫層（JSON 檔案）
│   │   ├── classifier.ts       # AI 分類引擎
│   │   └── extractor.ts        # 內容擷取工具
│   └── components/             # React 元件
├── public/
│   ├── manifest.json           # PWA 配置（含 Share Target）
│   └── sw.js                   # Service Worker
└── data/
    └── infohub.json            # 資料儲存（自動建立）
```

- **前端**：Next.js 14 + React 18 + Tailwind CSS
- **後端**：Next.js API Routes
- **資料庫**：JSON 檔案（開發用，可替換為 PostgreSQL）
- **AI**：Claude API（Anthropic）自動分類
- **PWA**：Web Share Target API，支援手機分享

## 分類類別

美食料理、旅遊探險、時尚穿搭、美妝保養、健身運動、科技數位、攝影藝術、音樂舞蹈、寵物動物、家居生活、教育學習、商業理財、娛樂搞笑、新聞時事、手作DIY、遊戲電競、親子育兒、心靈成長、自然風景、其他

## 部署到生產環境

### Vercel（推薦）

```bash
npm install -g vercel
vercel
```

### 自架伺服器

```bash
npm run build
npm run start
```

> 部署後請將 `NEXT_PUBLIC_APP_URL` 改為你的實際網址，並在手機重新安裝 PWA。

## 未來規劃

- [ ] 整合更多平台 API（自動同步 Twitter 書籤、YouTube 稍後觀看）
- [ ] 知識簡報功能（AI 整合多個來源產生摘要）
- [ ] 語義搜尋（向量嵌入 + 相似度搜尋）
- [ ] 瀏覽器擴充功能（一鍵擷取網頁）
- [ ] 替換為 PostgreSQL + pgvector
