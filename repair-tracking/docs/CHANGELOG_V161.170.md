# Changelog V161.170

日期：2026-01-10

## 修正

- 報價單「輸出 PDF」修正 `Failed to fetch`：
  - 讀取母版 PDF / 字型改為「fetch → XHR」雙路徑。
  - 若以 `file://` 直接開啟導致瀏覽器阻擋讀取，錯誤訊息會明確提示改用 `http://` 開啟（並提供 `python -m http.server` 指令）。
- 報價單 PDF 版面微調：
  - 「報價單號」數值位置往左移，貼近「：」後。
  - 「客戶全名」位置上移，避免偏下。
- 報價單空白母版更新：
  - `assets/quote/quote_template.pdf` 已替換為最新提供版本。

## 版本

- `core/config.js`：BUILD_NUMBER 169 → 170
