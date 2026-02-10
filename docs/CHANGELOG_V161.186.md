# 版本更新紀錄｜V161.186｜2026-01-12

本版重點：以「效能與穩定性」為主，降低跨模組切換時的殘留 UI/Listener，並優化知識庫搜尋造成的即時重繪負擔。

---

## 1) 全站：Router 離開模組時自動釋放 UI

### 改善
- Desktop / Mobile 的 Router 在切換路由時，會先呼叫「前一個模組 Controller.destroy()」（若存在），再載入下一個模組。
- 目的：避免某些模組在背景殘留 window listener / 定時器 / UI 狀態，造成逐步累積的卡頓與異常。

### 影響範圍
- V161_Desktop.html
- V161_Mobile.html

---

## 2) 知識庫（KB-1）：搜尋輸入去抖動（Debounce）

### 改善
- 搜尋框 oninput 改為 120ms debounce：避免每個 key stroke 都立刻全量 filter + re-render。

### 影響範圍
- features/kb/kb.ui.js

---

## 3) 版本號更新

- BUILD_NUMBER：185 → 186

### 影響範圍
- core/config.js
