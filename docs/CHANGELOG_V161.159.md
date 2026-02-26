# CHANGELOG V161.159

日期：2026-01-09  
版號：V161.159（Modular Phoenix）

## 修正

### 維修管理｜儲存/管理檢視按鈕破版
- 修正「⭐ 儲存 / ⚙ 管理」在工具列空間不足時被壓縮造成中文逐字換行（例：『儲/存』『管/理』）的問題。
- 調整 Saved Views 工具列控制項行為：
  - 下拉選單不再強制 `width:100%` 佔滿剩餘空間，避免擠壓右側按鈕。
  - 按鈕強制 `white-space:nowrap` 並設定最小寬度，確保 Desktop/Mobile 均維持單行顯示。
  - 小螢幕自動換行，但不逐字斷行。

## 變更檔案
- `features/repairs/repairs.ui.js`
- `core/ui.css`
- `core/config.js`
