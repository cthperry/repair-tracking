# V161.139 變更記錄（nolegacy）

## 範圍
- P2-3（瘦身 + 維護性）：不動功能、不改 UI。

## 修正
- 修正「新增維修單」設備名稱欄位在「未指定產品線（input）」與「指定產品線（select）」切換時，placeholder/文字左右起點不一致。
  - 於 `core/ui.css` 對 `select.input` 同時套用 `padding-left/right` 與 `-webkit-padding-start/end`（含 `padding-inline-*`），並以 `!important` 強制一致化，維持原生箭頭外觀不變。

## 版號
- `core/config.js`：BUILD_NUMBER 138 → 139
