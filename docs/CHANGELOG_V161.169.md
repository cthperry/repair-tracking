# Changelog V161.169

日期：2026-01-10

## 修正

- 報價單「輸出 PDF」修正字型載入：
  - 避免直接嵌入 `.ttc`（pdf-lib 1.17.1 + fontkit 對 TTC 可能觸發 `this.font.layout is not a function`）。
  - 內建免費替代字型改為 `assets/fonts/uming.ttf`（UMing TW，明體風格），確保不需額外安裝也可正常輸出。
  - 若偵測到使用者放入 `mingliu.ttc`，會提示需轉成 `mingliu.ttf` 才能套用細明體。
- PDF 字型嵌入改為 `subset: true`，避免每次輸出把整套 CJK 字型完整嵌入導致 PDF 檔案過大。

## 版本

- `core/config.js`：BUILD_NUMBER 168 → 169
