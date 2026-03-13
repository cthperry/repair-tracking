/**
 * utils/strings.js
 * 字串相關共用工具（集中 escape/安全輸出，避免各處重複實作）
 * - 不依賴外部函式庫
 * - 提供全域 StringUtils 以及相容別名 escapeHTML/escapeAttr
 */
(function () {
  'use strict';

  function escapeHTML(input) {
    const s = String(input ?? '');
    // 最常見的 HTML 特殊字元
    return s
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function escapeAttr(input) {
    // 屬性字串同樣以 HTML escape 規則處理即可（避免 value="..."" 爆掉）
    return escapeHTML(input);
  }

  window.StringUtils = Object.assign(window.StringUtils || {}, {
    escapeHTML,
    escapeAttr,
  });

  // 相容：既有程式碼可能直接呼叫 escapeHTML / escapeAttr
  if (typeof window.escapeHTML !== 'function') window.escapeHTML = escapeHTML;
  if (typeof window.escapeAttr !== 'function') window.escapeAttr = escapeAttr;
})();
