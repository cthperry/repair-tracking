/**
 * 維修管理 - 資料模型
 * V160 - Repairs Module - Data Model
 * 
 * 職責：
 * 1. 定義維修單資料結構
 * 2. 資料驗證
 * 3. 資料轉換
 * 4. 預設值處理
 */

class RepairModel {
  /**
   * 建立新的維修單物件
   */
  static create(data = {}) {
    const now = new Date().toISOString();
    const taiwanDate = this.getTaiwanDateString(new Date());
    const u = (window.AppState?.getCurrentUser?.() || window.currentUser || null);

    return {
      // 基本資訊
      id: data.id || this.generateRepairId(),
      repairNo: data.repairNo || data.id || '',
      customer: data.customer || '',
      contact: data.contact || '',
      phone: data.phone || '',
      email: data.email || '',
      
      // 維修資訊
      productLine: data.productLine || '',
      machine: data.machine || '',
      serialNumber: data.serialNumber || '',
      issue: data.issue || '',
      content: data.content || '',
      
      // 狀態管理
      status: data.status || AppConfig.business.defaults.repairStatus,
      progress: data.progress !== undefined ? data.progress : AppConfig.business.defaults.progress,
      priority: data.priority || AppConfig.business.defaults.priority,
      
      // 負責人
      ownerUid: data.ownerUid || (u?.uid || ''),
      ownerName: data.ownerName || (u?.displayName || ''),
      ownerEmail: data.ownerEmail || (u?.email || ''),
      
      // 時間戳記
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
      createdDate: data.createdDate || taiwanDate,

      // 歸檔用：第一次進入「已完成」時寫入（ISO 字串）
      completedAt: (data.completedAt || '').toString().trim(),
      
      // 額外資訊
      tags: data.tags || [],
      attachments: data.attachments || [],
      notes: data.notes || '',
      
      // 零件相關
      needParts: data.needParts || false,
      partsOrdered: data.partsOrdered || false,
      partsArrived: data.partsArrived || false,
      
      
      partsReplaced: data.partsReplaced || false,
      // 元資料
      version: data.version || 1,
      isDeleted: (typeof data.isDeleted === 'boolean') ? data.isDeleted : false
    };
  }
  
  /**
   * 驗證維修單資料
   */
  static validate(repair) {
    const errors = [];
    
    // 必填欄位檢查
    if (!repair.customer || repair.customer.trim() === '') {
      errors.push({ field: 'customer', message: '客戶名稱為必填' });
    }
    
    if (!repair.machine || repair.machine.trim() === '') {
      errors.push({ field: 'machine', message: '設備名稱為必填' });
    }
    
    if (!repair.issue || repair.issue.trim() === '') {
      errors.push({ field: 'issue', message: '問題描述為必填' });
    }
    
    // 狀態檢查
    const validStatuses = AppConfig.business.repairStatus.map(s => s.value);
    if (!validStatuses.includes(repair.status)) {
      errors.push({ field: 'status', message: '無效的狀態值' });
    }
    
    // 進度檢查
    if (repair.progress < 0 || repair.progress > 100) {
      errors.push({ field: 'progress', message: '進度必須在 0-100 之間' });
    }
    
    // 優先級檢查
    const validPriorities = AppConfig.business.priority.map(p => p.value);
    if (!validPriorities.includes(repair.priority)) {
      errors.push({ field: 'priority', message: '無效的優先級' });
    }
    
    // Email 格式檢查（如果有填）
    if (repair.email && !this.isValidEmail(repair.email)) {
      errors.push({ field: 'email', message: 'Email 格式錯誤' });
    }
    
    // 電話格式檢查（如果有填）
    if (repair.phone && !this.isValidPhone(repair.phone)) {
      errors.push({ field: 'phone', message: '電話格式錯誤' });
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * 生成維修單號
   * 格式：R20241215-001
   */
  static generateRepairId() {
    // 備援：避免在未經 RepairService 取號下產生亂碼
    const date = this.getTaiwanDateString(new Date()).replace(/-/g, '');
    return `R${date}-TEMP`;
  }
  
  /**
   * 取得台灣時間日期字串
   */
  static getTaiwanDateString(date) {
    const offset = AppConfig.system.timezoneOffset * 60; // 分鐘
    const taiwanTime = new Date(date.getTime() + offset * 60 * 1000);
    return taiwanTime.toISOString().slice(0, 10);
  }
  
  /**
   * 驗證 Email 格式
   */
  static isValidEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  }
  
  /**
   * 驗證電話格式
   */
  static isValidPhone(phone) {
    // 允許：0912345678, 02-12345678, +886-912-345-678
    const pattern = /^[\d\s\-\+\(\)]+$/;
    return pattern.test(phone) && phone.replace(/\D/g, '').length >= 8;
  }
  
  /**
   * 更新維修單（部分更新）
   */
  static update(existing, updates) {
    return {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: (existing.version || 1) + 1
    };
  }
  
  /**
   * 建立狀態歷程記錄
   */
  /**
 * 建立歷史紀錄（支援 CREATE / UPDATE / DELETE）
 *
 * 相容舊版呼叫：
 *   createHistory(repair, fromStatus, toStatus, note)
 *
 * 新版建議：
 *   createHistory(repair, {
 *     action: 'CREATE'|'UPDATE'|'DELETE',
 *     changed: [{ field, from, to }],
 *     note: '',
 *     fromStatus, toStatus, fromProgress, toProgress
 *   })
 */
static createHistory(repair, arg2, arg3, arg4 = '') {
  const now = new Date().toISOString();
  const u = (window.AppState?.getCurrentUser?.() || window.currentUser || null);

  const base = {
    id: `H${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    repairId: repair?.id || '',
    action: 'UPDATE',
    changed: [],
    note: '',
    fromStatus: null,
    toStatus: null,
    fromProgress: null,
    toProgress: null,
    byUid: (u?.uid || ''),
    byName: (u?.displayName || ''),
    byEmail: (u?.email || ''),
    timestamp: now
  };

  // 新版：第二參數為 options 物件
  if (arg2 && typeof arg2 === 'object' && !Array.isArray(arg2)) {
    const opt = arg2;

    base.action = opt.action || base.action;
    base.changed = Array.isArray(opt.changed) ? opt.changed : [];
    base.note = (opt.note || '').toString();

    if (opt.fromStatus !== undefined) base.fromStatus = opt.fromStatus;
    if (opt.toStatus !== undefined) base.toStatus = opt.toStatus;
    if (opt.fromProgress !== undefined) base.fromProgress = opt.fromProgress;
    if (opt.toProgress !== undefined) base.toProgress = opt.toProgress;

    return base;
  }

  // 舊版：fromStatus, toStatus, note
  const fromStatus = (arg2 ?? '').toString();
  const toStatus = (arg3 ?? '').toString();
  const note = (arg4 ?? '').toString();

  return {
    ...base,
    action: 'UPDATE',
    fromStatus,
    toStatus,
    // 舊版無法正確取得「變更前 progress」，保持相容欄位即可
    fromProgress: repair?.progress ?? null,
    toProgress: this.getProgressByStatus(toStatus),
    changed: fromStatus && toStatus ? [{ field: 'status', from: fromStatus, to: toStatus }] : [],
    note
  };
}

/**
 * 根據狀態取得對應進度
   */
static normalizeStatusProgress(repair) {
  if (!repair) return repair;
  const out = { ...repair };

  // progress clamp
  const p = Number(out.progress);
  const progress = Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 0;
  out.progress = progress;

  // 規則：
  // 1) 100% 一律視為「已完成」（且 needParts=false）
  // 2) needParts=true 或狀態=需要零件 -> 狀態=需要零件
  // 3) 其餘一律為「進行中」
  // 4) 狀態選成「已完成」自動把進度推到 100%

  // 4) 選擇已完成 -> 100%
  if (out.status === '已完成') {
    out.progress = 100;
    out.needParts = false;
    return out;
  }

  // 1) 100% -> 已完成
  if (out.progress >= 100) {
    out.status = '已完成';
    out.progress = 100;
    out.needParts = false;
    return out;
  }

  // 2) needParts / 需要零件 連動
  if (out.needParts === true || out.status === '需要零件') {
    out.status = '需要零件';
    out.needParts = true;
    return out;
  }

  // 3) 其他 -> 進行中
  out.status = '進行中';
  out.needParts = false;
  return out;
}

static getProgressByStatus(status) {
    const statusConfig = AppConfig.getStatusByValue(status);
    return statusConfig ? statusConfig.progress : 0;
  }
  
  /**
   * 轉換為顯示格式
   */
  static toDisplay(repair) {
    const statusConfig = AppConfig.getStatusByValue(repair.status);
    const priorityConfig = AppConfig.business.priority.find(p => p.value === repair.priority);
    
    return {
      ...repair,
      statusLabel: statusConfig?.label || repair.status,
      statusColor: statusConfig?.color || '#6b7280',
      priorityLabel: priorityConfig?.label || repair.priority,
      priorityColor: priorityConfig?.color || '#6b7280',
      createdAtFormatted: this.formatDateTime(repair.createdAt),
      updatedAtFormatted: this.formatDateTime(repair.updatedAt),
      completedAtFormatted: this.formatDateTime(repair.completedAt || ''),
      ageInDays: this.calculateAgeByRepairDate(repair)
    };
  }

  /**
   * 以維修日期（createdDate: YYYY-MM-DD，台灣時區）計算天數；若缺少則退回 createdAt
   */
  static calculateAgeByRepairDate(repair) {
    try {
      const createdDate = (repair?.createdDate || '').toString().trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(createdDate)) {
        const created = new Date(`${createdDate}T00:00:00+08:00`);
        const now = new Date();
        const diffTime = Math.abs(now - created);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
      }
    } catch (_) {}
    return this.calculateAge(repair?.createdAt);
  }
  
  /**
   * 格式化日期時間
   */
  static formatDateTime(isoString) {
    if (!isoString) return '';
    
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
  
  /**
   * 計算維修單年齡（天數）
   */
  static calculateAge(createdAt) {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  
  /**
   * 搜尋過濾
   */
  static filter(repairs, filters) {
    return repairs.filter(repair => {
      const f = filters || {};

      // 預設排除軟刪除（避免「刪了但還在」）
      if (!f.includeDeleted && repair?.isDeleted) {
        return false;
      }

      // 進行中 / 歷史（已完成）scope
      // - active：status ≠ 已完成
      // - history：status = 已完成
      const scope = (f.scope || '').toString();
      if (scope === 'active') {
        if ((repair.status || '') === '已完成') return false;
      } else if (scope === 'history') {
        if ((repair.status || '') !== '已完成') return false;
      }

      // 關鍵字搜尋
      if (f.keyword) {
        const keyword = f.keyword.toLowerCase();
        const searchFields = [
          repair.id,
          repair.repairNo,
          repair.customer,
          repair.contact,
          repair.phone,
          repair.email,
          repair.machine,
          repair.serialNumber,
          repair.issue,
          repair.content,
          repair.ownerName
        ].join(' ').toLowerCase();
        
        if (!searchFields.includes(keyword)) {
          return false;
        }
      }
      
      // 狀態過濾
      if (f.status && f.status.length > 0) {
        if (!f.status.includes(repair.status)) {
          return false;
        }
      }
      
      // 優先級過濾
      if (f.priority && f.priority.length > 0) {
        if (!f.priority.includes(repair.priority)) {
          return false;
        }
      }
      
      // 負責人過濾
      if (f.owner) {
        if (repair.ownerUid !== f.owner) {
          return false;
        }
      }
      
      // 日期範圍過濾
      if (f.dateFrom) {
        if (repair.createdDate < f.dateFrom) {
          return false;
        }
      }
      
      if (f.dateTo) {
        if (repair.createdDate > f.dateTo) {
          return false;
        }
      }

      
      // 完成日期範圍過濾（歷史模式：以 completedAt/updatedAt/createdAt 推導日期）
      if (f.completedFrom || f.completedTo) {
        const base = (repair.completedAt || repair.updatedAt || repair.createdAt || '').toString();
        const completedDate = base ? base.slice(0, 10) : (repair.createdDate || '');

        if (f.completedFrom) {
          if (completedDate < f.completedFrom) {
            return false;
          }
        }

        if (f.completedTo) {
          if (completedDate > f.completedTo) {
            return false;
          }
        }
      }
      
      // 是否需要零件
      if (f.needParts !== undefined) {
        if (repair.needParts !== f.needParts) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * 排序
   */
  static sort(repairs, sortBy, sortOrder = 'desc') {
    const sorted = [...repairs].sort((a, b) => {
      // completedAt：舊資料可能缺欄位，退回 updatedAt/createdAt，避免排序不穩
      let aValue = (sortBy === 'completedAt') ? (a.completedAt || a.updatedAt || a.createdAt) : a[sortBy];
      let bValue = (sortBy === 'completedAt') ? (b.completedAt || b.updatedAt || b.createdAt) : b[sortBy];
      
      // 處理字串比較
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }
  
  /**
   * 統計資料
   */
  static getStats(repairs) {
    const stats = {
      total: repairs.length,
      byStatus: {},
      byPriority: {},
      byOwner: {},
      needParts: 0,
      avgAge: 0
    };
    
    // 按狀態統計
    AppConfig.business.repairStatus.forEach(status => {
      stats.byStatus[status.value] = repairs.filter(r => r.status === status.value).length;
    });
    
    // 按優先級統計
    AppConfig.business.priority.forEach(priority => {
      stats.byPriority[priority.value] = repairs.filter(r => r.priority === priority.value).length;
    });
    
    // 按負責人統計
    repairs.forEach(repair => {
      if (repair.ownerName) {
        stats.byOwner[repair.ownerName] = (stats.byOwner[repair.ownerName] || 0) + 1;
      }
    });
    
    // 需要零件的數量
    stats.needParts = repairs.filter(r => r.needParts).length;
    
    // 平均年齡
    if (repairs.length > 0) {
      const totalAge = repairs.reduce((sum, r) => sum + this.calculateAgeByRepairDate(r), 0);
      stats.avgAge = Math.round(totalAge / repairs.length);
    }
    
    return stats;
  }
  
  /**
   * 匯出為 JSON
   */
  static toJSON(repair) {
    return JSON.stringify(repair, null, 2);
  }
  
  /**
   * 從 JSON 匯入
   */
  static fromJSON(json) {
    try {
      const repair = JSON.parse(json);
      return this.create(repair);
    } catch (error) {
      throw new Error('無效的 JSON 格式');
    }
  }
  
  /**
   * 複製維修單
   */
  static clone(repair) {
    const cloned = this.create({
      ...repair,
      id: this.generateRepairId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: AppConfig.business.defaults.repairStatus,
      progress: AppConfig.business.defaults.progress
    });
    
    return cloned;
  }
}

// 輸出到全域
if (typeof window !== 'undefined') {
  window.RepairModel = RepairModel;
}

console.log('✅ RepairModel loaded');
