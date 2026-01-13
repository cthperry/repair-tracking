# V161.140 變更記錄（P2-3｜維護性）

## 修正
- 新增維修單：在「設備名稱」欄位於 input（未指定產品線）與 select（已指定產品線）切換時，placeholder/文字的左右起點不一致。
  - 原因：Chrome/Blink 原生 `<select>` 受 UA style 影響，padding-start 與 input 不一致。
  - 作法：於 `core/ui.css` 對 `select.input` 同時指定 `padding-left/right`、`-webkit-padding-start/end`、`padding-inline-start/end` 並加上 `!important`，維持原生箭頭外觀。

## 範圍
- 僅 CSS 對齊與版號更新，不改功能、不改流程、不改 UI 結構。
