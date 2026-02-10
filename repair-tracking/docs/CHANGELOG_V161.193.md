# Changelog - V161.193

日期：2026-01-13

## 修正

### 1) 手機誤開 Desktop（導致左側功能選單、版面看起來「被改」）

**問題**

- 使用手機從根目錄開啟時，因 `index.html` 強制導向 `V161_Desktop.html`，造成手機版誤載入 Desktop 介面。

**修正**

- `index.html` 改為導向 `Index_V161.html`（入口頁），由入口頁自動判斷裝置並導向 `V161_Mobile.html / V161_Desktop.html`。
- `V161_Desktop.html` 新增防呆：偵測到手機 UA 且未指定 `?force=desktop` 時，自動改導向 `V161_Mobile.html`。

## 變更檔案

- `index.html`
- `Index_V161.html`（沿用既有自動選擇流程，不變）
- `V161_Desktop.html`
- `core/config.js`（BUILD_NUMBER：193）
