/*
 * Saved Views (篩選檢視)
 * V161.152
 *
 * 目的：提供「儲存/套用/管理」各模組列表的篩選檢視（localStorage）。
 * 原則：
 * - 僅保存 UI 查詢狀態（filters/sort/scope 等），不影響資料結構
 * - 以 uid 作為隔離（若不可得則 anon）
 */

(function () {
  'use strict';

  const SavedViews = (window.SavedViews = window.SavedViews || {});

  function getPrefix() {
    try {
      return (window.AppConfig && window.AppConfig.system && window.AppConfig.system.storage && window.AppConfig.system.storage.prefix)
        ? window.AppConfig.system.storage.prefix
        : 'repair_tracking_v161_';
    } catch (_) {
      return 'repair_tracking_v161_';
    }
  }

  function getUid() {
    try {
      if (window.AppState && typeof window.AppState.getUid === 'function') return window.AppState.getUid();
      if (window.currentUser && window.currentUser.uid) return window.currentUser.uid;
      return '';
    } catch (_) {
      return '';
    }
  }

  function safeParse(json, fallback) {
    try {
      const v = JSON.parse(json);
      return v === undefined ? fallback : v;
    } catch (_) {
      return fallback;
    }
  }

  function readList(key) {
    try {
      const raw = localStorage.getItem(key);
      const arr = safeParse(raw || '[]', []);
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function writeList(key, arr) {
    try {
      localStorage.setItem(key, JSON.stringify(Array.isArray(arr) ? arr : []));
    } catch (_) {
      // ignore
    }
  }

  function now() {
    try { return Date.now(); } catch (_) { return 0; }
  }

  SavedViews.keyFor = function keyFor(moduleName) {
    const module = (moduleName || 'unknown').toString();
    const uid = (getUid() || 'anon').toString();
    return `${getPrefix()}saved_views__${module}__${uid}`;
  };

  SavedViews.prefKey = function prefKey(name) {
    const n = (name || 'pref').toString();
    const uid = (getUid() || 'anon').toString();
    return `${getPrefix()}pref__${n}__${uid}`;
  };

  SavedViews.list = function list(moduleName) {
    return readList(SavedViews.keyFor(moduleName));
  };

  SavedViews.generateId = function generateId() {
    return `v_${now()}_${Math.random().toString(16).slice(2, 8)}`;
  };

  SavedViews.upsert = function upsert(moduleName, view) {
    const key = SavedViews.keyFor(moduleName);
    const arr = readList(key);
    const v = (view && typeof view === 'object') ? { ...view } : {};
    if (!v.id) v.id = SavedViews.generateId();
    if (!v.createdAt) v.createdAt = now();
    v.updatedAt = now();

    const idx = arr.findIndex(x => x && x.id === v.id);
    if (idx >= 0) arr[idx] = v;
    else arr.push(v);

    // 由新到舊
    arr.sort((a, b) => ((b && b.updatedAt) || 0) - ((a && a.updatedAt) || 0));
    writeList(key, arr);
    return v;
  };

  SavedViews.remove = function remove(moduleName, id) {
    const key = SavedViews.keyFor(moduleName);
    const arr = readList(key);
    const next = arr.filter(v => v && v.id !== id);
    writeList(key, next);
    return next;
  };

  SavedViews.rename = function rename(moduleName, id, newName) {
    const key = SavedViews.keyFor(moduleName);
    const arr = readList(key);
    const name = (newName || '').toString().trim();
    const idx = arr.findIndex(v => v && v.id === id);
    if (idx < 0) return null;
    arr[idx] = { ...arr[idx], name, updatedAt: now() };
    writeList(key, arr);
    return arr[idx];
  };

})();
