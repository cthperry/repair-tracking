# CHANGELOG — V161.267

日期：2026-02-21（Asia/Taipei）  
基底：V161.266

## 修正
### SOP Hub（SOP-1）
- 修正「＋新增 SOP / 建立 SOP」點擊無反應：
  - SOP Hub 的事件委派改為 **document 層級（capture）**，避免主容器被其他模組重繪後，原本綁在 root 的事件失效。
  - 僅在畫面存在 `#sops-page` 且命中 `sops-*` action / `form[data-action]` 時才處理，不影響其他模組。

## 影響範圍
- 僅影響 SOP Hub 的按鈕/表單事件處理；不改動資料結構與既有 SOP 資料。
