# VALIDATION V161.337 REQUIRED MARKERS

## 驗證目標
確認各表單必填欄位可自動顯示 `*`，且不需逐模組手動補標。

## 驗證方式
1. `node --check core/ui.js`
2. `node --check core/config.js`
3. 使用 jsdom 載入 `core/ui.js`
4. 建立測試 DOM：
   - 一般欄位：`label[for] + input[required]`
   - wrapper 欄位：`.form-group > label + select[required]`
   - hidden 欄位：`input[type=hidden][required]`
5. 動態新增 required 控制項，確認 observer 可自動同步

## 預期結果
- 一般欄位 label 會補上 `required` class
- wrapper 欄位 label 會補上 `required` class
- hidden 欄位不加星號
- 動態新增欄位也會出現星號

## 誠實註記
- 本版完成的是共用標示同步機制
- 尚未逐頁做人工視覺巡檢
- 最終仍需以你那邊實機檢查各模組表單畫面為準
