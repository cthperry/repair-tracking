# CHANGELOG - V161.165

日期：2026-01-09

## 修正 / 改進

### 日期輸入自動格式（YYYY-MM-DD）
- 針對以文字輸入日期、且 placeholder 為 `YYYY-MM-DD` 的欄位，新增「自動帶入 `-`」輸入遮罩。
- 支援：逐字輸入數字、貼上 `20260109` / `2026/01/09` / `2026-01-09` 皆會自動整理為 `YYYY-MM-DD`。
- 不影響 `input[type="date"]`（原生日期選擇器維持不變）。
- Desktop + Mobile 同步支援（含數字鍵盤 inputmode）。

## 變更檔案
- `core/ui.js`
- `core/config.js`
