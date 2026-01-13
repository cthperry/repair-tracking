# CHANGELOG｜V161.168

## 版本資訊
- VERSION：V161
- BUILD_NUMBER：168
- VERSION_DATE：2026-01-10

## 修正：報價單 PDF 字型（細明體）
### 問題
- Acrobat 編輯模式顯示字型為 **ShanHeiSun**（替代字型），未符合「細明體」需求。

### 調整
- 報價單 PDF 輸出改為「**優先載入細明體字型檔**」，並 **不做 subset** 以提高 Acrobat 編輯一致性。
- 字型載入順序：
  1. `assets/fonts/mingliu.ttf`
  2. `assets/fonts/mingliu.ttc`
  3. `assets/fonts/uming.ttf`（內建免費明體風格字型，UMing TW）
  4. `assets/fonts/bsmi00lp.ttf`（最後 fallback）
- 輸出完成後 toast 會顯示本次使用的字型來源（例如「細明體」或 UMing）。

### 使用者操作（要真的使用 Windows 細明體）
- 請將 Windows 字型檔複製到：
  - `assets/fonts/mingliu.ttc`（或 `assets/fonts/mingliu.ttf`）
- 放入後重新整理頁面再輸出 PDF，即會套用細明體。
