# CHANGELOG — V161.266

日期：2026-02-21（Asia/Taipei）

## SOP Hub（SOP-1）
- **UI/流程全面對齊 OrderSOPHub Phase 1**：改為「列表頁 / 新增頁 / 詳情頁」三段式，不再使用新增/上傳 Modal（解決按鈕超出視窗問題）。
  - 列表頁：類別 + 關鍵字（標題/標籤/摘要）查詢 + 表格列出
  - 新增頁：先建立 SOP 主檔
  - 詳情頁：主檔唯讀顯示 + 上傳新版本（V{latest+1}）+ 版本列表

## 系統
- ModuleLoader：在 http/https 環境下自動加上 `?v=BUILD_NUMBER` 以避免瀏覽器快取造成「更新未生效」。
