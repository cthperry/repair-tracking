# CHANGELOG｜V161.263

日期：2026-02-12（Asia/Taipei）

## Phase 4｜簡易模式（Simple Mode）修正

### 修正
- **簡易模式未生效**：補上全域 `.hidden { display:none !important; }` 公用樣式，讓 UIMode 套用的「隱藏模組」在 Sidebar / Mobile Tab 實際可見。

### 影響範圍
- Desktop Sidebar
- Mobile Bottom Tabs

### 架構規則
- 維持 Phase 1–3 硬規則：不新增 `window.getService` / `window[service]` fallback / Controller 內 init。
