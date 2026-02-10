# V161.137 變更記錄（full_nolegacy）

## 範圍
- 僅 P2-3：維護性 / 穩定性
- 不新增功能、不改 UI 互動、不調整流程

## 修正
1. 新增維修單：設備名稱文字垂直位置一致化
   - 問題：未指定產品線（input）與指定產品線（select）時，設備名稱欄位內文字的垂直位置視覺不一致。
   - 修正：統一 `.input` 與 `select.input` 的 `height / line-height / padding-top / padding-bottom`，避免 input/select 切換造成文字位置差異。

## 版號
- AppConfig.BUILD_NUMBER：137
