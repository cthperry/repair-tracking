# RepairTracking V161 快速開始指南（企業系統風）

## 目標
- 全站淺色系、低彩度（企業系統風）
- Desktop / Mobile 入口（同一套核心）
- Firebase 模式優先，失敗自動降級本機模式

## 檔案結構

```
Index_V161.html            裝置導向頁
V161_Desktop.html          桌面版入口
V161_Mobile.html           行動版入口
core/                      核心（Config/Bootstrap/Auth/ErrorHandler）
features/                  功能模組（維修/客戶）
docs/                      文件（本檔、變更摘要、UI 規格）
```

## 建議啟動方式（避免 file:// 限制）

```bash
# 在專案根目錄執行
python -m http.server 8000
```

瀏覽器開啟：
- http://localhost:8000/Index_V161.html

## 版本資訊
- AppConfig.VERSION：V161
- Build：292（2026-03-13）

## 備註
- 建議使用 Chrome / Edge 最新版
- 預設採 Firebase Auth local persistence；啟動時會先等待 auth state，再決定進入系統或顯示登入頁。
