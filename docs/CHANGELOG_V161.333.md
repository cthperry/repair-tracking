# CHANGELOG V161.333

BUILD_NUMBER：333

## 現象
- 使用者回報 Repairs 首屏的 KPI 區塊與管理列表在桌機畫面仍有異常垂直排列問題。
- 前版雖已移除 `renderStats()` 內層 wrapper，但實機回報表示問題仍未解除。
- ZIP 交付格式也被明確指出有時單層、有時雙層，不可靠。

## 根因
1. Repairs 首屏仍混用兩套版面語法：
   - 模組本地 `.repairs-stats { display:flex; ... }`
   - 共用 grammar `ops-kpi-grid`
   兩者在同一元素上重疊時，桌機寬度分配不穩定。
2. 首屏缺少明確的主堆疊容器，KPI 與列表雖然是兄弟節點，但仍靠舊 flex shell 撐版，對桌機寬度計算不夠穩。
3. Repairs list header / search / cards 多處缺少 `min-width: 0`，在桌機下容易被內部欄位撐壞節奏。

## 修正層級
- DOM 結構：有改。
- 模組 CSS：有改。
- 交付規則文件：有補。

## 修正內容
- `features/repairs/repairs.ui.js`
  - 新增 `repairs-main-stack`，把 `#repairs-stats` 與 `#repairs-content` 放進單一主堆疊。
- `features/repairs/repairs.css`
  - `repairs-stats` 改為明確 grid。
  - `repairs-content` 從舊 flex 行為改為穩定的 block/grid stack 行為。
  - `repairs-list`、`repairs-list-header`、`repairs-list-right`、`repairs-search`、`repairs-cards` 補上 `min-width: 0`。
  - `repairs-list-header` 桌機欄位改為 `minmax(0, 1fr) auto`，降低右側工具列把整個列表擠壞的風險。
- `docs/ZIP_STRUCTURE_RULES.md`
  - 固定交付 ZIP 規則，禁止雙層同名巢狀根目錄。

## 影響範圍
- Repairs 首屏 KPI 區塊
- Repairs 列表 header / 搜尋 / cards
- 後續 ZIP 交付檢查流程

## 驗證
- `node --check core/config.js`
- `node --check features/repairs/repairs.ui.js`
- 以 jsdom 直接檢查 Repairs 首屏 DOM：
  - `repairs-main-stack` 已存在
  - `#repairs-stats` 為直接卡片集合
  - `#repairs-stats` 不再套用 `ops-kpi-grid`
- 交付 ZIP 將採平面根目錄封裝，不再外包同名資料夾

## 是否為結構性修正
- 是。
- 本版不是加條件遮蔽，也不是只改單一卡片輸出，而是把 Repairs 首屏 DOM + CSS 版面骨架一起收斂。

## 誠實註記
- 目前完成的是語法檢查、DOM 結構檢查、ZIP 結構規則固定化。
- 尚未取得使用者桌機實機再次確認，因此不能宣稱 Repairs 首屏已完全結案。
