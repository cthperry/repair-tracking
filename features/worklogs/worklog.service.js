/**
 * 工作記錄 - 服務層
 * WorkLog Module - Service Layer
 *
 * 職責：
 * 1. Firebase CRUD（data/{uid}/workLogs/{logId}）
 * 2. Realtime listener（增量同步）
 * 3. 日期範圍查詢（週報用）
 * 4. 本地快取（localStorage）
 * 5. 同步回 repair.content 摘要
 *
 * Firebase 路徑：
 *   data/{uid}/workLogs/{logId}
 *
 * 索引（需在 Database Rules 設定）：
 *   workLogs: { ".indexOn": ["workDate", "repairId"] }
 */

class WorkLogService {
  constructor() {
    this.workLogs = [];
    this.isInitialized = false;
    this.listeners = [];

    // Firebase
    this.db = null;
    this.workLogsRef = null;

    // Realtime
    this._listenersReady = false;

    // 並行 init() 去重
    this._initPromise = null;

    // localStorage 節流
    this._cacheSaveTimer = null;
    this._localDirty = false;
  }

  // ========================================
  // 初始化
  // ========================================

  async init() {
    if (this.isInitialized) {
      console.debug('WorkLogService already initialized');
      return;
    }
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      try {
        console.debug('📝 Initializing WorkLog Service...');

        if (window.AuthSystem?.authMode === 'firebase' && typeof firebase !== 'undefined') {
          this.db = firebase.database();
          const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || '').toString();
          if (uid) {
            this.workLogsRef = this.db.ref('data').child(uid).child('workLogs');
          }
        }

        await this.loadData();

        this.isInitialized = true;
        console.debug(`✅ WorkLog Service initialized (${this.workLogs.length} logs)`);

      } catch (error) {
        console.error('WorkLog Service initialization error:', error);
        // 降級：使用本地資料
        await this.loadFromLocalStorage();
        this.isInitialized = true;
      } finally {
        this._initPromise = null;
      }
    })();

    return this._initPromise;
  }

  // ========================================
  // Legacy Migration（一次性、可控、不自動）
  // ========================================

  /**
   * 從舊節點 repairLogs / repairWorkLogs 搬移到 workLogs（data/{uid}/workLogs）。
   * - 不會自動執行：需手動呼叫
   * - idempotent：使用 WorkLogModel.fromLegacy 的穩定 ID
   *
   * options:
   * - source: 'repairLogs' | 'repairWorkLogs'
   * - dryRun: true 時不寫入，只回報統計
   * - limit: 最大搬移筆數（避免一次性過大）
   */
  async migrateLegacy({ source = 'repairLogs', dryRun = false, limit = 500 } = {}) {
    const src = String(source || '').trim();
    if (!src) throw new Error('migrateLegacy: source required');

    const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || '').toString();
    if (!uid) throw new Error('migrateLegacy: uid not ready');

    if (!this.db && window.AuthSystem?.authMode === 'firebase' && typeof firebase !== 'undefined') {
      this.db = firebase.database();
    }

    if (!this.db) {
      throw new Error('migrateLegacy: firebase database not available');
    }

    // ensure workLogsRef
    if (!this.workLogsRef) {
      this.workLogsRef = this.db.ref('data').child(uid).child('workLogs');
    }

    const legacyRef = this.db.ref('data').child(uid).child(src);
    const snap = await legacyRef.once('value');
    const legacyRoot = snap.val();
    return await this._migrateLegacyObject(legacyRoot, { source: src, dryRun, limit });
  }

  async _migrateLegacyObject(legacyRoot, { source, dryRun, limit } = {}) {
    const root = (legacyRoot && typeof legacyRoot === 'object') ? legacyRoot : {};
    const src = String(source || 'repairLogs');
    const max = Number(limit) > 0 ? Number(limit) : 500;

    let scanned = 0;
    let migrated = 0;
    let skippedInvalid = 0;

    const writes = [];

    for (const repairId of Object.keys(root)) {
      const group = root[repairId];
      if (!group || typeof group !== 'object') continue;
      for (const legacyId of Object.keys(group)) {
        scanned += 1;
        if (migrated >= max) break;

        const legacy = group[legacyId];
        const log = (window.WorkLogModel && typeof window.WorkLogModel.fromLegacy === 'function')
          ? window.WorkLogModel.fromLegacy({ source: src, repairId, legacyId, legacy })
          : null;

        if (!log) { skippedInvalid += 1; continue; }

        const v = (window.WorkLogModel && typeof window.WorkLogModel.validate === 'function')
          ? window.WorkLogModel.validate(log)
          : { isValid: true };

        if (!v.isValid) {
          skippedInvalid += 1;
          continue;
        }

        if (!dryRun && this.workLogsRef) {
          writes.push(this.workLogsRef.child(log.id).set(log));
        }

        // 也同步進本地快取（避免下次 load 不一致）
        const idx = this.workLogs.findIndex(l => l && l.id === log.id);
        if (idx === -1) this.workLogs.push(log);
        else this.workLogs[idx] = log;

        migrated += 1;
      }
      if (migrated >= max) break;
    }

    if (writes.length) {
      await Promise.allSettled(writes);
      this._scheduleCacheSave(500);
    }

    return { source: src, scanned, migrated, skippedInvalid, dryRun: !!dryRun };
  }

  // ========================================
  // 資料載入
  // ========================================

  async loadData() {
    if (this.workLogsRef) {
      try {
        await this.loadFromFirebase();
        this.setupRealtimeListeners();
        this.saveToLocalStorage();
        return;
      } catch (e) {
        console.warn('WorkLogService: Firebase load failed, fallback to local:', e);
      }
    }
    await this.loadFromLocalStorage();
  }

  async loadFromFirebase() {
    const snapshot = await this.workLogsRef.once('value');
    const data = snapshot.val();
    if (data && typeof data === 'object') {
      this.workLogs = Object.values(data).filter(l => l && l.id);
      console.debug(`  ✓ Loaded ${this.workLogs.length} work logs from Firebase`);
    } else {
      this.workLogs = [];
    }
  }

  setupRealtimeListeners() {
    if (!this.workLogsRef || this._listenersReady) return;

    this.workLogsRef.on('child_added', (snap) => {
      const log = snap.val();
      if (!log || !log.id) return;
      const idx = this.workLogs.findIndex(l => l.id === log.id);
      if (idx === -1) {
        this.workLogs.push(log);
        this.notifyListeners('added', log);
        this._scheduleCacheSave();
      }
    });

    this.workLogsRef.on('child_changed', (snap) => {
      const log = snap.val();
      if (!log || !log.id) return;
      const idx = this.workLogs.findIndex(l => l.id === log.id);
      if (idx !== -1) {
        this.workLogs[idx] = log;
      } else {
        this.workLogs.push(log);
      }
      this.notifyListeners('updated', log);
      this._scheduleCacheSave();
    });

    this.workLogsRef.on('child_removed', (snap) => {
      const log = snap.val();
      if (!log || !log.id) return;
      const idx = this.workLogs.findIndex(l => l.id === log.id);
      if (idx !== -1) {
        this.workLogs.splice(idx, 1);
        this.notifyListeners('removed', log);
        this._scheduleCacheSave();
      }
    });

    this._listenersReady = true;
    console.debug('  ✓ WorkLog realtime listeners setup');
  }

  // ========================================
  // localStorage 快取
  // ========================================

  _getCacheKey() {
    const prefix = (window.AppConfig?.system?.storage?.prefix) || 'repair_tracking_v161_';
    const scope = (window.getUserScopeKey ? window.getUserScopeKey() : (window.currentUser?.uid || 'unknown'));
    return `${prefix}worklogs_${scope}`;
  }

  async loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(this._getCacheKey());
      if (raw) {
        this.workLogs = JSON.parse(raw);
        console.debug(`  ✓ Loaded ${this.workLogs.length} work logs from localStorage`);
        return true;
      }
    } catch (e) {
      console.warn('WorkLogService loadFromLocalStorage failed:', e);
    }
    this.workLogs = [];
    return false;
  }

  saveToLocalStorage() {
    try {
      localStorage.setItem(this._getCacheKey(), JSON.stringify(this.workLogs || []));
    } catch (e) {
      console.warn('WorkLogService saveToLocalStorage failed:', e);
    }
  }

  _scheduleCacheSave(delayMs = 1500) {
    if (this._cacheSaveTimer) clearTimeout(this._cacheSaveTimer);
    this._cacheSaveTimer = setTimeout(() => {
      this._cacheSaveTimer = null;
      this.saveToLocalStorage();
    }, Math.max(250, delayMs));
  }

  // ========================================
  // CRUD
  // ========================================

  /**
   * 建立工作記錄
   */
  async create(repairId, data) {
    const log = WorkLogModel.create({
      ...data,
      repairId: repairId
    });

    const validation = WorkLogModel.validate(log);
    if (!validation.isValid) {
      throw new Error('驗證失敗：' + validation.errors.map(e => e.message).join(', '));
    }

    // Firebase
    if (this.workLogsRef) {
      await this.workLogsRef.child(log.id).set(log);
    }

    // 本地
    const idx = this.workLogs.findIndex(l => l.id === log.id);
    if (idx === -1) {
      this.workLogs.push(log);
    } else {
      this.workLogs[idx] = log;
    }

    this.notifyListeners('added', log);
    this._scheduleCacheSave(500);

    // 同步摘要到 repair.content
    try { await this._syncRepairContent(repairId); } catch (_) {}

    return log;
  }

  /**
   * 更新工作記錄
   */
  async update(logId, data) {
    const idx = this.workLogs.findIndex(l => l.id === logId);
    if (idx === -1) throw new Error('找不到工作記錄：' + logId);

    const existing = this.workLogs[idx];
    const updated = WorkLogModel.update(existing, data);

    const validation = WorkLogModel.validate(updated);
    if (!validation.isValid) {
      throw new Error('驗證失敗：' + validation.errors.map(e => e.message).join(', '));
    }

    // Firebase
    if (this.workLogsRef) {
      await this.workLogsRef.child(logId).set(updated);
    }

    this.workLogs[idx] = updated;
    this.notifyListeners('updated', updated);
    this._scheduleCacheSave(500);

    // 同步摘要
    try { await this._syncRepairContent(updated.repairId); } catch (_) {}

    return updated;
  }

  /**
   * 刪除工作記錄
   */
  async delete(logId) {
    const idx = this.workLogs.findIndex(l => l.id === logId);
    if (idx === -1) throw new Error('找不到工作記錄：' + logId);

    const log = this.workLogs[idx];
    const repairId = log.repairId;

    // Firebase
    if (this.workLogsRef) {
      await this.workLogsRef.child(logId).remove();
    }

    this.workLogs.splice(idx, 1);
    this.notifyListeners('removed', log);
    this._scheduleCacheSave(500);

    // 同步摘要
    try { await this._syncRepairContent(repairId); } catch (_) {}

    return log;
  }

  // ========================================
  // 查詢 API
  // ========================================

  /**
   * 取得全部
   */
  getAll() {
    return this.workLogs || [];
  }

  /**
   * 取得指定維修單的所有工作記錄
   */
  getForRepair(repairId) {
    if (!repairId) return [];
    return WorkLogModel.sort(
      WorkLogModel.filterByRepairId(this.workLogs, repairId),
      'desc'
    );
  }

  /**
   * 取得指定維修單的工作記錄數量
   */
  getCountForRepair(repairId) {
    if (!repairId) return 0;
    return (this.workLogs || []).filter(l => l.repairId === repairId).length;
  }

  /**
   * 取得指定日期範圍內的工作記錄（週報用）
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate   - YYYY-MM-DD
   */
  getByDateRange(startDate, endDate) {
    let logs = WorkLogModel.filterByDateRange(this.workLogs, startDate, endDate);
    return WorkLogModel.sort(logs, 'asc');
  }

  /**
   * 取得指定維修單的工作記錄摘要（用於 mini summary）
   */
  getSummaryForRepair(repairId) {
    const logs = this.getForRepair(repairId);
    const count = logs.length;
    if (count === 0) return { count: 0, latest: null, text: '尚無工作記錄' };

    const latest = logs[0]; // 已按 desc 排序
    const latestDisplay = WorkLogModel.toDisplay(latest);

    return {
      count,
      latest: latestDisplay,
      text: `${count} 筆記錄，最新：${latestDisplay.workDateFormatted} - ${latestDisplay.resultLabel}`
    };
  }

  // ========================================
  // 同步 repair.content 摘要
  // ========================================

  /**
   * 將最新工作記錄的 action 同步回 repair.content
   * 讓搜尋 / 列表仍可快速取得最新工作摘要
   */
  async _syncRepairContent(repairId) {
    if (!repairId) return;
    const repairSvc = (typeof window._svc === 'function') ? window._svc('RepairService') : (window.AppRegistry?.get?.('RepairService') || null);
    if (!repairSvc) return;

    const logs = this.getForRepair(repairId); // desc sorted
    if (logs.length === 0) return;

    // 組合最近的（最多 3 筆）作為摘要
    const recent = logs.slice(0, 3);
    const summaryLines = recent.map(l => {
      const date = (l.workDate || '').slice(5); // MM-DD
      const resultCfg = WorkLogModel.getResultConfig(l.result);
      const tag = resultCfg ? resultCfg.label : '';
      const action = (l.action || '').trim().slice(0, 80);
      return `[${date}] ${action}${tag ? ' → ' + tag : ''}`;
    });

    const content = summaryLines.join('\n');

    try {
      // 只更新 content 欄位，不觸發歷史紀錄中的大量變更
      // 使用 _silentUpdate 或直接 Firebase set
      if (this.db && window.AppState?.getUid?.()) {
        const uid = window.AppState.getUid();
        await this.db.ref(`data/${uid}/repairs/${repairId}/content`).set(content);

        // 同步本地 cache
        try {
          const repair = (typeof repairSvc.get === 'function')
            ? repairSvc.get(repairId)
            : ((typeof repairSvc.getAll === 'function' ? (repairSvc.getAll() || []) : [])).find(r => r.id === repairId);
          if (repair) repair.content = content;
        } catch (_) {}
      }
    } catch (e) {
      console.warn('WorkLogService._syncRepairContent failed:', e);
    }
  }

  // ========================================
  // 變更通知
  // ========================================

  onChange(callback) {
    if (typeof callback !== 'function') return () => {};
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(fn => fn !== callback);
    };
  }

  notifyListeners(action, log) {
    for (const fn of this.listeners) {
      try { fn(action, log); } catch (e) { console.warn('WorkLogService listener error:', e); }
    }
  }
}

// 全域實例（也暴露 class 本身，供測試用 new window.WorkLogService()）
if (typeof window !== 'undefined') {
  try { window.WorkLogService = WorkLogService; } catch (_) {}
}
const workLogService = new WorkLogService();
try { window.AppRegistry?.register?.('WorkLogService', workLogService); } catch (_) {}

console.log('✅ WorkLogService loaded');
