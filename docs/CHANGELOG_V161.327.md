# CHANGELOG V161.327

日期：2026-03-14
BUILD_NUMBER：327

## 本版重點
- Machines detail 改成 enterprise detail hero / overview / history 的三層資訊表面。
- Machines 序號清單、維修履歷與保養動作改走 delegated handlers，減少 inline onclick。
- Parts form / batch editor section head 改用共用 enterprise section helper，catalog 與 tracker 的表單視覺層級一致。

## 主要修改檔案
- `core/config.js`
- `features/machines/machines.ui.js`
- `features/machines/machines.css`
- `features/parts/parts.ui.js`
- `features/parts/parts.css`
- `docs/README.md`
- `docs/CHANGELOG.md`
- `docs/HANDOFF.md`
- `docs/CHANGELOG_V161.327.md`
- `docs/VALIDATION_V161.327_MACHINES_PARTS_SURFACE.md`
