# V161.136 變更記錄（nolegacy）

日期：2026-01-05（Asia/Taipei）

## 範圍
- 僅限 P2-3（瘦身 / 維護性）
- 不新增功能、不改流程、不調整 UI 視覺

## 修正
### 新增維修單：設備名稱高度一致化
- 問題：
  - 「未指定產品線」時「設備名稱」為 input
  - 「指定產品線」時「設備名稱」為 select
  - 兩者在 Chrome 下高度不同，造成欄位視覺大小不一致
- 修正：在 `core/ui.css` 統一 `.input`（非 textarea）與 `select.input` 的高度與 line-height

## 版本
- `core/config.js`：BUILD_NUMBER `135` → `136`
