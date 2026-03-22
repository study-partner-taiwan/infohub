#!/bin/bash
# InfoHub 一鍵安裝 (macOS)

# 切換到腳本所在目錄
cd "$(dirname "$0")"

clear
echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║     InfoHub 資訊聚合平台 - 安裝      ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# ========== 檢查 Node.js ==========
if ! command -v node &> /dev/null; then
    echo "[!] 未偵測到 Node.js，正在自動安裝..."
    echo ""

    # 嘗試用 Homebrew 安裝
    if command -v brew &> /dev/null; then
        echo "    使用 Homebrew 安裝 Node.js..."
        brew install node
    else
        echo "    未偵測到 Homebrew，正在安裝 Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

        # Apple Silicon Mac 的 Homebrew 路徑
        if [ -f "/opt/homebrew/bin/brew" ]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi

        echo "    使用 Homebrew 安裝 Node.js..."
        brew install node
    fi

    if ! command -v node &> /dev/null; then
        echo ""
        echo "[X] 自動安裝失敗，請手動安裝 Node.js："
        echo "    https://nodejs.org"
        echo ""
        echo "    安裝完成後重新執行此腳本。"
        read -p "按 Enter 結束..."
        exit 1
    fi

    echo "[OK] Node.js 安裝完成！"
    echo ""
fi

NODE_VER=$(node -v)
echo "[OK] Node.js 版本: $NODE_VER"

# ========== 安裝依賴 ==========
echo ""
echo "[2/4] 正在安裝依賴套件..."
npm install
if [ $? -ne 0 ]; then
    echo "[X] npm install 失敗，請檢查網路連線後重試。"
    read -p "按 Enter 結束..."
    exit 1
fi
echo "[OK] 依賴安裝完成！"

# ========== 建立環境設定檔 ==========
echo ""
echo "[3/4] 設定環境..."
if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    echo "[OK] 已建立 .env.local 設定檔"
    echo ""
    echo "  ┌─────────────────────────────────────────────┐"
    echo "  │  選填：填入 Claude API Key 可啟用 AI 分類    │"
    echo "  │  沒有 API Key 也能使用（用關鍵字分類）       │"
    echo "  │                                             │"
    echo "  │  取得 API Key: https://console.anthropic.com │"
    echo "  │  設定檔位置:   .env.local                    │"
    echo "  └─────────────────────────────────────────────┘"
else
    echo "[OK] .env.local 已存在，跳過"
fi

# ========== 取得本機 IP ==========
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "找不到")

# ========== 啟動 ==========
echo ""
echo "[4/4] 正在啟動 InfoHub..."
echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║  InfoHub 啟動成功！                   ║"
echo "  ║                                      ║"
echo "  ║  電腦開啟: http://localhost:3000      ║"
echo "  ║                                      ║"
echo "  ║  手機設定:                            ║"
echo "  ║  1. 連同一個 Wi-Fi                    ║"
echo "  ║  2. 手機瀏覽器開啟下方網址            ║"
echo "  ║  3. 加到主畫面 (安裝 PWA)             ║"
echo "  ║  4. 之後在 IG 分享就能看到 InfoHub     ║"
echo "  ║                                      ║"
echo "  ║  按 Ctrl+C 停止伺服器                 ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
echo "  你的區域網路 IP: $LOCAL_IP"
echo "  手機請開啟: http://$LOCAL_IP:3000"
echo ""

# 自動開啟瀏覽器
open http://localhost:3000 2>/dev/null &

# 啟動伺服器
npx next dev
