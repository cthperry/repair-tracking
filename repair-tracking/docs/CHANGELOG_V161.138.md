# V161.138 變更記錄（full_nolegacy）

## 範圍
- 僅 P2-3：維護性 / 穩定性
- 不新增功能、不改 UI 互動、不調整流程

## 修正
1. 新增維修單：設備名稱文字左右位置一致化
   - 問題：未指定產品線（input）與指定產品線（select）時，設備名稱欄位內文字左右起始位置視覺不一致。
   - 修正：針對 `select.input` 追加一致化 `padding-left / padding-right`，在不改變原生箭頭外觀的前提下，讓 input/select 切換時文字左右對齊。

## 版號
- AppConfig.BUILD_NUMBER：138
