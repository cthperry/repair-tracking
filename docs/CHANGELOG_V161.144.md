# V161.144 變更記錄（P2-3｜dead code 清理與 window.* 收斂）

> 範圍：不動功能、不改 UI；僅修正瘦身過程造成的載入問題，並維持 registry-first / window fallback 相容。

## 修正
- 修正 `core/bootstrap.js` 內誤植的跳脫字元（`\"function\"`）造成的 **SyntaxError: Invalid or unexpected token**。
  - 影響：全域快捷鍵綁定段落在瀏覽器解析階段失敗。
  - 修正：改回正確字串 `'function'` 比對。

## 版本
- `core/config.js`
  - `BUILD_NUMBER: '143'` → `BUILD_NUMBER: '144'`
