# V161.135 變更記錄（nolegacy）

範圍：P2-3（瘦身 + 維護性）
原則：不動功能、不改 UI，只做結構/穩定性調整。

## 1) 修正：新增維修單「設備名稱」欄位初始位置偏差
- 根因：設備名稱 label 內的「篩選」按鈕先前採 `visibility:hidden` 保留空間，但仍可能造成 label 文字換行/高度差，導致同列欄位在初始狀態就出現垂直位移。
- 修正：將篩選按鈕改為 **絕對定位**，並在 label 右側以 `padding-right` 預留按鈕寬度。
  - 好處：
    - 初始狀態不再因保留空間造成 label 換行/欄位下移
    - 後續 `visibility` 切換不觸發 reflow（避免選產品線時跳動）

涉及檔案：
- `features/repairs/repairs.css`
- `core/ui.css`（移除全域 `.machine-filter-btn` 規則，避免影響其他頁面）

## 2) 版本
- `core/config.js`：BUILD_NUMBER `134 → 135`
