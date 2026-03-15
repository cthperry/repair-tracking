# CHANGELOG V161.308

日期：2026-03-13

## 本版重點
- SOP 詳情頁企業級收斂：`hero → overview board → command bar → 主檔 / 版本支援板`。
- Parts editor modal 企業級收斂：新增、編輯與批次編輯統一為 `form-context-bar + 分段表單 + sticky footer`。

## 根因與修正
### 1. SOP 詳情頁
- 根因：主檔、版本上傳、版本列表與操作按鈕長期分散在 `topbar + panel + 長段說明文字`，沒有正式的單一 detail 結構。
- 修正：將 SOP detail 改為企業級 detail page，集中呈現主檔總覽、適用脈絡、版本節點、命令列、主檔表單與版本支援區。

### 2. Parts editor modal
- 根因：零件主檔、用料追蹤與批次編輯 modal 雖可用，但缺少上下文摘要與明確 section，仍帶有舊式表單殼感。
- 修正：新增 `form-context-bar` 與 section head，將主檔資料、庫存/價格、流程節點與備註拆成正式企業級表單段落；批次編輯同步補齊相同規格。

## 影響檔案
- `features/sops/sops.ui.js`
- `features/sops/sops.css`
- `features/parts/parts.ui.js`
- `features/parts/parts.css`
- `core/config.js`
- `docs/CHANGELOG.md`
- `docs/HANDOFF.md`
- `docs/UI_UX_GUIDELINE.md`

## 驗證
- `node --check core/config.js`
- `node --check features/sops/sops.ui.js`
- `node --check features/parts/parts.ui.js`
