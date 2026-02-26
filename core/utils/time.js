/**
 * utils/time.js
 * 時間/日期共用工具（統一 timestamp 標準：epoch ms）
 *
 * 目標：
 * - 避免 ISO 字串相減、Date.parse 散落、時區不一致
 * - 全站以 epoch(ms) 作為比較/排序的唯一標準
 */
(function () {
  'use strict';

  const TZ = 'Asia/Taipei';

  function toEpoch(value, fallback = 0) {
    if (value == null) return fallback;

    // number: 直接視為 ms（若是秒級，請在呼叫端轉換；此處不猜測以免誤判）
    if (typeof value === 'number' && Number.isFinite(value)) return value;

    // Date
    if (value instanceof Date) return value.getTime();

    // Firebase RTDB / Firestore Timestamp-like
    if (typeof value === 'object') {
      if (typeof value.toMillis === 'function') {
        const ms = value.toMillis();
        return Number.isFinite(ms) ? ms : fallback;
      }
      if (typeof value.toDate === 'function') {
        const d = value.toDate();
        return d instanceof Date ? d.getTime() : fallback;
      }
      // { seconds, nanoseconds }
      if (Number.isFinite(value.seconds)) {
        return Math.floor(Number(value.seconds) * 1000);
      }
    }

    // string
    const s = String(value).trim();
    if (!s) return fallback;

    // 純數字字串：視為 ms
    if (/^-?\d+$/.test(s)) {
      const n = Number(s);
      return Number.isFinite(n) ? n : fallback;
    }

    const t = Date.parse(s);
    return Number.isFinite(t) ? t : fallback;
  }

  function nowEpoch() {
    return Date.now();
  }

  function formatTaipeiDateTime(value) {
    try {
      const ms = toEpoch(value, NaN);
      if (!Number.isFinite(ms)) return '-';
      const d = new Date(ms);
      // 使用瀏覽器 Intl（不強制，失敗則 fallback）
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        return new Intl.DateTimeFormat('zh-TW', {
          timeZone: TZ,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }).format(d);
      }
      return d.toLocaleString();
    } catch (_) {
      return '-';
    }
  }

  window.TimeUtils = Object.assign(window.TimeUtils || {}, {
    TZ,
    toEpoch,
    nowEpoch,
    formatTaipeiDateTime,
  });

  // 相容：既有程式碼可能使用 Utils.isoToMs 或直接用 toEpoch
  if (typeof window.toEpoch !== 'function') window.toEpoch = toEpoch;
})();
