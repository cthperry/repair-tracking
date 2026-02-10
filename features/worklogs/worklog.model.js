/**
 * 工作記錄 - 資料模型
 * WorkLog Module - Data Model
 *
 * 職責：
 * 1. 定義工作記錄資料結構
 * 2. 資料驗證
 * 3. 資料轉換 / 顯示格式
 * 4. 預設值處理
 */

class WorkLogModel {

  // ========================================
  // 常數 / 設定
  // ========================================

  static get RESULTS() {
    return [
      { value: 'completed',  label: '完成',   color: '#22c55e' },
      { value: 'pending',    label: '待續',   color: '#f59e0b' },
      { value: 'need_parts', label: '需要零件', color: '#ef4444' }
    ];
  }

  static getResultConfig(value) {
    return this.RESULTS.find(r => r.value === value) || null;
  }

  // ========================================
  // Factory
  // ========================================

  /**
   * 建立新的工作記錄物件
   */
  static create(data = {}) {
    const now = new Date().toISOString();
    const taiwanDate = this.getTaiwanDateString(new Date());

    return {
      id: data.id || this.generateId(),
      repairId: data.repairId || '',
      workDate: data.workDate || taiwanDate,
      action: data.action || '',
      findings: data.findings || '',
      partsUsed: data.partsUsed || '',
      result: data.result || 'pending',
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };
  }

  /**
   * 生成工作記錄 ID
   * 格式：WL{timestamp}-{random}
   */
  static generateId() {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 6);
    return `WL${ts}-${rand}`;
  }

  /**
   * 取得台灣時間日期字串 YYYY-MM-DD
   */
  static getTaiwanDateString(date) {
    try {
      const offset = (window.AppConfig?.system?.timezoneOffset || 8) * 60;
      const taiwanTime = new Date(date.getTime() + offset * 60 * 1000);
      return taiwanTime.toISOString().slice(0, 10);
    } catch (_) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  // ========================================
  // 驗證
  // ========================================

  /**
   * 驗證工作記錄
   */
  static validate(log) {
    const errors = [];

    if (!log.repairId || String(log.repairId).trim() === '') {
      errors.push({ field: 'repairId', message: '維修單 ID 為必填' });
    }

    if (!log.workDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(log.workDate))) {
      errors.push({ field: 'workDate', message: '工作日期格式不正確 (YYYY-MM-DD)' });
    }

    if (!log.action || String(log.action).trim() === '') {
      errors.push({ field: 'action', message: '工作內容為必填' });
    }

    if (String(log.action || '').length > 1000) {
      errors.push({ field: 'action', message: '工作內容不可超過 1000 字元' });
    }

    if (String(log.findings || '').length > 3000) {
      errors.push({ field: 'findings', message: '發現 / 備註不可超過 3000 字元' });
    }

    if (String(log.partsUsed || '').length > 1000) {
      errors.push({ field: 'partsUsed', message: '使用零件不可超過 1000 字元' });
    }

    const validResults = this.RESULTS.map(r => r.value);
    if (!validResults.includes(log.result)) {
      errors.push({ field: 'result', message: '無效的結果狀態' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ========================================
  // 更新 / 轉換
  // ========================================

  /**
   * 部分更新
   */
  static update(existing, updates) {
    return {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * 轉換為顯示格式
   */
  static toDisplay(log) {
    const resultConfig = this.getResultConfig(log.result) || {};
    return {
      ...log,
      resultLabel: resultConfig.label || log.result || '待續',
      resultColor: resultConfig.color || '#6b7280',
      workDateFormatted: this.formatDate(log.workDate),
      createdAtFormatted: this.formatDateTime(log.createdAt),
      updatedAtFormatted: this.formatDateTime(log.updatedAt)
    };
  }

  // ========================================
  // 排序 / 過濾
  // ========================================

  /**
   * 按工作日期排序（預設由新到舊）
   */
  static sort(logs, order = 'desc') {
    return [...(logs || [])].sort((a, b) => {
      const da = (a.workDate || a.createdAt || '');
      const db = (b.workDate || b.createdAt || '');
      return order === 'asc'
        ? String(da).localeCompare(String(db))
        : String(db).localeCompare(String(da));
    });
  }

  /**
   * 按日期範圍過濾
   */
  static filterByDateRange(logs, startDate, endDate) {
    return (logs || []).filter(log => {
      const d = (log.workDate || '').toString();
      if (!d) return false;
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }

  /**
   * 按維修單 ID 過濾
   */
  static filterByRepairId(logs, repairId) {
    if (!repairId) return [];
    return (logs || []).filter(log => log.repairId === repairId);
  }

  /**
   * 按維修單 ID 分組
   */
  static groupByRepairId(logs) {
    const map = {};
    for (const log of (logs || [])) {
      const rid = log.repairId || '';
      if (!rid) continue;
      if (!map[rid]) map[rid] = [];
      map[rid].push(log);
    }
    // 每組內按日期排序（由舊到新，方便週報顯示時間線）
    for (const rid of Object.keys(map)) {
      map[rid] = this.sort(map[rid], 'asc');
    }
    return map;
  }

  // ========================================
  // 格式化 helpers
  // ========================================

  static formatDate(dateStr) {
    if (!dateStr) return '';
    return String(dateStr).slice(0, 10);
  }

  static formatDateTime(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day} ${h}:${min}`;
    } catch (_) {
      return String(isoString).slice(0, 16);
    }
  }

  // ========================================
  // Legacy Migration (Phase 5/6)
  // ========================================

  static _safeIdPart(v) {
    return String(v || '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 36);
  }

  static _hash32(text) {
    // djb2
    let h = 5381;
    const s = String(text || '');
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h) + s.charCodeAt(i);
      h = h >>> 0;
    }
    return h.toString(36);
  }

  static _toDateYYYYMMDD(value) {
    const v = (value === null || value === undefined) ? '' : String(value).trim();
    if (!v) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    // ISO string
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
    // timestamp (ms)
    if (/^\d{10,13}$/.test(v)) {
      const ms = v.length === 10 ? Number(v) * 1000 : Number(v);
      if (Number.isFinite(ms)) {
        return this.getTaiwanDateString(new Date(ms));
      }
    }
    return '';
  }

  static _mapLegacyResult(v) {
    const s = String(v || '').trim().toLowerCase();
    if (!s) return 'pending';
    if (s.includes('need') || s.includes('part') || s.includes('零件')) return 'need_parts';
    if (s.includes('done') || s.includes('complete') || s.includes('finish') || s.includes('完成')) return 'completed';
    if (s.includes('pending') || s.includes('wait') || s.includes('待')) return 'pending';
    return 'pending';
  }

  /**
   * 將舊 repairLogs/repairWorkLogs 轉為 workLogs（data/{uid}/workLogs）。
   * - 以穩定 ID 實現 idempotent（同一筆舊資料重跑不會新增重複）
   * - 不自動搬移：僅供 WorkLogService 明確呼叫
   */
  static fromLegacy({ source, repairId, legacyId, legacy }) {
    const src = this._safeIdPart(source || 'legacy');
    const rid = this._safeIdPart(repairId || '');
    const lid = this._safeIdPart(legacyId || '');

    let id = `WLLEG_${src}_${rid}_${lid}`.replace(/_+/g, '_');
    if (id.length > 64) {
      id = `WLLEG_${src}_${this._hash32(id)}`;
    }

    const obj = legacy && typeof legacy === 'object' ? legacy : {};
    const workDate =
      this._toDateYYYYMMDD(obj.workDate) ||
      this._toDateYYYYMMDD(obj.visitDate) ||
      this._toDateYYYYMMDD(obj.tsStart) ||
      this._toDateYYYYMMDD(obj.createdAt) ||
      this.getTaiwanDateString(new Date());

    const action = String(
      obj.action || obj.content || obj.work || obj.workContent || obj.desc || obj.description || ''
    ).trim();

    const findings = String(obj.findings || obj.note || obj.remark || '').trim();
    const partsUsed = String(obj.partsUsed || obj.parts || obj.usedParts || '').trim();
    const result = this._mapLegacyResult(obj.result || obj.status);

    const createdAt = String(obj.createdAt || '').trim() || new Date().toISOString();
    const updatedAt = String(obj.updatedAt || '').trim() || createdAt;

    return this.create({
      id,
      repairId: String(repairId || '').trim(),
      workDate,
      action,
      findings,
      partsUsed,
      result,
      createdAt,
      updatedAt
    });
  }
}

// 輸出到全域
if (typeof window !== 'undefined') {
  window.WorkLogModel = WorkLogModel;
}

console.log('✅ WorkLogModel loaded');
