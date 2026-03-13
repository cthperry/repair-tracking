# CHANGELOG｜V161.264（2026-02-21）

## SOP Hub（SOP-1）整合
- 新增模組：**🧾 SOP Hub**（路由：`sops`）
  - 支援 SOP 主檔（title/category/scopeCustomerId/tags/abstract）
  - 支援版本清單（version / Drive WebViewLink / changeLog）
  - 支援 Apps Script Web App 上傳到 My Drive（與 OrderSOPHub Phase 1 規格一致）
- 維修單詳情新增區塊：**🧾 SOP（作業流程）**
  - 可在維修單內「關聯 SOP」
  - 顯示已關聯 SOP 清單、快速開啟最新版本、查看版本列表、移除關聯

## 設定 / 相容性
- `core/config.js` 新增：`AppConfig.integration.gas`（上傳 URL / token）
  - 預設留空（避免把 token 上傳到公開倉庫）
- 維修資料模型新增欄位：`sopRefs`（格式：`[{ sopId, version? }]`）

