/**
 * 核心配置模組
 * V161 - 所有配置的單一來源
 */

const AppConfig = {
  // ========================================
  // 版本資訊
  // ========================================
  VERSION: 'V162',
  VERSION_DATE: '2026-03-16',
  VERSION_NAME: 'Modular Phoenix',
  BUILD_NUMBER: '373',
  
  // ========================================
  // Firebase 配置
  // ========================================
  firebase: {
    apiKey: "AIzaSyAs_w60l0g2UgN69VPu0HvIwhS1BHE44IQ",
    authDomain: "repair-tracking-d3de4.firebaseapp.com",
    databaseURL: "https://repair-tracking-d3de4-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "repair-tracking-d3de4",
    storageBucket: "repair-tracking-d3de4.firebasestorage.app",
    messagingSenderId: "385691075337",
    appId: "1:385691075337:web:66ee8dcce00c5b4ee9b46f"
  },

  // ========================================
  // 認證配置
  // ========================================
  auth: {
    /**
     * 管理員 Email 清單（作為 Firebase DB role 欄位缺失時的緊急 fallback）
     * 正式的角色設定以 Firebase Database /users/$uid/role 為準。
     * 當 DB 已有 role 欄位時，此列表不會覆蓋既有設定。
     */
    adminEmails: [
      'perry_chuang@premtek.com.tw'
    ],
    /** DB role 欄位缺失且 email 不在 adminEmails 時的預設角色 */
    defaultRole: 'engineer',
    /** Firebase Auth 持久化：local / session / none */
    persistence: 'local',
    /** 僅在明確需要 demo / 離線模式時才允許降級本地登入 */
    allowLocalFallback: false
  },

  // ========================================
  // 外部整合（SOP Hub / Apps Script 上傳）
  // ========================================
  integration: {
    gas: {
      // Apps Script Web App URL（POST JSON: {token,path,filename,mimeType,base64}）
      // 例："https://script.google.com/macros/s/xxxx/exec"
      uploadUrl: "",
      // CORS 代理（建議）：本機或伺服器端 proxy 轉送到 Apps Script，再由 proxy 回傳 JSON
      // 本機工具：tools/sop_upload_proxy/server.js（預設 http://localhost:8787/upload）
      // 例："http://localhost:8787/upload" 或 "https://<your-domain>/upload"
      proxyUrl: "",
      // ⚠️ 請自行填入 TOKEN（勿上傳到公開倉庫）
      token: ""
    }
  },

  // ========================================
  // 系統配置
  // ========================================
  system: {
    timezone: 'Asia/Taipei',
    timezoneOffset: 8, // UTC+8
    locale: 'zh-Hant',
    
    // 效能配置
    performance: {
      virtualListItemHeight: 60,
      virtualListBufferSize: 5,
      incrementalRenderBatchSize: 50,
      incrementalRenderDelay: 16,
      debounceDelay: 300,
      throttleDelay: 100
    },
    
    // 儲存配置
    storage: {
      prefix: 'repair_tracking_v161_',
      enableLocalBackup: true,
      enableFirebaseSync: true,
      syncInterval: 30000 // 30 秒
    }
  },
  
  // ========================================
  // 業務配置
  // ========================================
  business: {
    // 維修狀態選項
    repairStatus: [
      { value: '進行中', label: '進行中', color: '#3b82f6', progress: 10 },
      { value: '需要零件', label: '需要零件', color: '#f59e0b', progress: 50 },
      { value: '已完成', label: '已完成', color: '#16a34a', progress: 100 }
    ],

    // 優先級選項
    priority: [
      { value: 'low', label: '低', color: '#6b7280' },
      { value: 'normal', label: '一般', color: '#3b82f6' },
      { value: 'high', label: '高', color: '#f59e0b' },
      { value: 'urgent', label: '緊急', color: '#ef4444' }
    ],
    
    // 使用者角色
    roles: [
      { value: 'admin', label: '管理員', permissions: ['all'] },
      { value: 'engineer', label: '工程師', permissions: ['read', 'write', 'update'] }
    ],
    
    // 維修單號格式
    repairIdFormat: 'R{YYYYMMDD}-{SEQ}', // 例如：R20241215-001

    // 零件追蹤狀態（repairParts）
    // 說明：此陣列同時作為選單來源與狀態語意的唯一真實來源，避免 UI 模組各自維護 badge / 顏色 / 終態規則。
    partStatus: [
      { value: '需求提出', label: '需求提出', semanticKey: 'request_open', stageKind: 'flow', rank: 1, terminal: false, badgeClass: 'badge-primary', accent: '#7c3aed', soft: 'rgba(124,58,237,.12)' },
      { value: '已報價', label: '已報價', semanticKey: 'quoted', stageKind: 'flow', rank: 2, terminal: false, badgeClass: 'badge-info', accent: '#2563eb', soft: 'rgba(37,99,235,.12)' },
      { value: '已下單', label: '已下單', semanticKey: 'ordered', stageKind: 'flow', rank: 3, terminal: false, badgeClass: 'badge-info', accent: '#0ea5e9', soft: 'rgba(14,165,233,.14)' },
      { value: '已到貨', label: '已到貨', semanticKey: 'arrived', stageKind: 'flow', rank: 4, terminal: false, badgeClass: 'badge-warning', accent: '#d97706', soft: 'rgba(217,119,6,.15)' },
      { value: '已更換', label: '已更換', semanticKey: 'replaced', stageKind: 'result', rank: 5, terminal: true, badgeClass: 'badge-success', accent: '#16a34a', soft: 'rgba(22,163,74,.14)' },
      { value: '取消', label: '取消', semanticKey: 'cancelled', stageKind: 'result', rank: 90, terminal: true, badgeClass: 'badge-error', accent: '#dc2626', soft: 'rgba(220,38,38,.12)' }
    ],

    // 報價狀態（quotes）
    quoteStatus: [
      { value: '草稿', label: '草稿', semanticKey: 'draft', stageKind: 'flow', rank: 1, terminal: false, badgeClass: 'badge-primary', accent: '#2563eb', soft: 'rgba(37,99,235,.12)' },
      { value: '已送出', label: '已送出', semanticKey: 'submitted', stageKind: 'flow', rank: 2, terminal: false, badgeClass: 'badge-info', accent: '#0ea5e9', soft: 'rgba(14,165,233,.14)' },
      { value: '已核准', label: '已核准', semanticKey: 'approved', stageKind: 'result', rank: 3, terminal: true, badgeClass: 'badge-success', accent: '#16a34a', soft: 'rgba(22,163,74,.14)' },
      { value: '已取消', label: '已取消', semanticKey: 'cancelled', stageKind: 'result', rank: 90, terminal: true, badgeClass: 'badge-error', accent: '#dc2626', soft: 'rgba(220,38,38,.12)' }
    ],

    // 訂單狀態（orders）
    orderStatus: [
      { value: '建立', label: '建立', semanticKey: 'created', stageKind: 'flow', rank: 1, terminal: false, badgeClass: 'badge-primary', accent: '#2563eb', soft: 'rgba(37,99,235,.12)' },
      { value: '已下單', label: '已下單', semanticKey: 'ordered', stageKind: 'flow', rank: 2, terminal: false, badgeClass: 'badge-info', accent: '#0ea5e9', soft: 'rgba(14,165,233,.14)' },
      { value: '已到貨', label: '已到貨', semanticKey: 'arrived', stageKind: 'flow', rank: 3, terminal: false, badgeClass: 'badge-warning', accent: '#d97706', soft: 'rgba(217,119,6,.15)' },
      { value: '已結案', label: '已結案', semanticKey: 'closed', stageKind: 'result', rank: 4, terminal: true, badgeClass: 'badge-success', accent: '#16a34a', soft: 'rgba(22,163,74,.14)' },
      { value: '已取消', label: '已取消', semanticKey: 'cancelled', stageKind: 'result', rank: 90, terminal: true, badgeClass: 'badge-error', accent: '#dc2626', soft: 'rgba(220,38,38,.12)' }
    ],

    // 收費判定（repair.billing.chargeable）
    billingChargeable: [
      { value: 'undecided', label: '尚未決定', semanticKey: 'undecided', stageKind: 'decision', rank: 1, terminal: false, badgeClass: 'badge', accent: '#64748b', soft: 'rgba(100,116,139,.12)' },
      { value: 'free', label: '不需收費', semanticKey: 'free', stageKind: 'result', rank: 2, terminal: true, badgeClass: 'badge-success', accent: '#16a34a', soft: 'rgba(22,163,74,.14)' },
      { value: 'chargeable', label: '需收費', semanticKey: 'chargeable', stageKind: 'decision', rank: 3, terminal: false, badgeClass: 'badge-primary', accent: '#2563eb', soft: 'rgba(37,99,235,.12)' }
    ],

    // 收費案件的下單判定（repair.billing.orderStatus）
    billingOrderDecision: [
      { value: 'unknown', label: '尚未確認', semanticKey: 'unknown', stageKind: 'decision', rank: 1, terminal: false, badgeClass: 'badge', accent: '#64748b', soft: 'rgba(100,116,139,.12)' },
      { value: 'ordered', label: '已下單', semanticKey: 'ordered', stageKind: 'result', rank: 2, terminal: true, badgeClass: 'badge-info', accent: '#0ea5e9', soft: 'rgba(14,165,233,.14)' },
      { value: 'not_ordered', label: '未下單', semanticKey: 'not_ordered', stageKind: 'result', rank: 3, terminal: true, badgeClass: 'badge-warning', accent: '#d97706', soft: 'rgba(217,119,6,.15)' }
    ],

    // 維修單內『未下單』追蹤狀態（billing.notOrdered.stageCode）
    billingNotOrderedStage: [
      { value: 'quote_pending', label: '待報價', semanticKey: 'quote_pending', stageKind: 'flow', rank: 1, terminal: false, badgeClass: 'badge-warning', accent: '#d97706', soft: 'rgba(217,119,6,.15)' },
      { value: 'procurement', label: '請購中', semanticKey: 'procurement', stageKind: 'flow', rank: 2, terminal: false, badgeClass: 'badge-info', accent: '#0ea5e9', soft: 'rgba(14,165,233,.14)' },
      { value: 'reviewing', label: '客戶評估中', semanticKey: 'reviewing', stageKind: 'flow', rank: 3, terminal: false, badgeClass: 'badge-primary', accent: '#2563eb', soft: 'rgba(37,99,235,.12)' },
      { value: 'budget_review', label: '預算確認中', semanticKey: 'budget_review', stageKind: 'flow', rank: 4, terminal: false, badgeClass: 'badge-primary', accent: '#4f46e5', soft: 'rgba(79,70,229,.12)' },
      { value: 'on_hold', label: '暫緩', semanticKey: 'on_hold', stageKind: 'flow', rank: 5, terminal: false, badgeClass: 'badge-warning', accent: '#b45309', soft: 'rgba(180,83,9,.14)' },
      { value: 'other', label: '其他', semanticKey: 'other', stageKind: 'flow', rank: 90, terminal: false, badgeClass: 'badge', accent: '#64748b', soft: 'rgba(100,116,139,.12)' }
    ],

    // 維修單內『未下單』原因（billing.notOrdered.reasonCode）
    billingNotOrderedReason: [
      { value: 'price', label: '價格過高', semanticKey: 'price', stageKind: 'reason', rank: 1, terminal: false, badgeClass: 'badge-warning', accent: '#d97706', soft: 'rgba(217,119,6,.15)' },
      { value: 'budget', label: '客戶預算不足', semanticKey: 'budget', stageKind: 'reason', rank: 2, terminal: false, badgeClass: 'badge-warning', accent: '#d97706', soft: 'rgba(217,119,6,.15)' },
      { value: 'internal', label: '客戶內部流程/延後', semanticKey: 'internal', stageKind: 'reason', rank: 3, terminal: false, badgeClass: 'badge-info', accent: '#0ea5e9', soft: 'rgba(14,165,233,.14)' },
      { value: 'spec', label: '規格/內容待確認', semanticKey: 'spec', stageKind: 'reason', rank: 4, terminal: false, badgeClass: 'badge-primary', accent: '#2563eb', soft: 'rgba(37,99,235,.12)' },
      { value: 'other', label: '其他', semanticKey: 'other', stageKind: 'reason', rank: 90, terminal: false, badgeClass: 'badge', accent: '#64748b', soft: 'rgba(100,116,139,.12)' }
    ],
    
    // 預設值
    defaults: {
      repairStatus: '進行中',
      priority: 'normal',
      progress: 0
    },

    // 設備產品線 / 機型對照（用於維修建單的快速選擇）
    // 規則：選擇「產品線」後，設備名稱清單會自動套用對應機型。
    // 可依公司實際機種持續擴充。
    machineCatalog: {
      MAR: [
        'FlexTRAK-SH',
        'FlexTRAK-F3',
        'FlexTRAK-S',
        'AP-600',
        'AP-1000',
        'ExoSPHERE',
        'StratoSPHERE'
      ],
      MAP: [
        '2400',
        '2800',
        'MaxVIA',
        'ProVIA'
      ]
    }
  },
  
  // ========================================
  // 週報配置
  // ========================================
  weekly: {
    // 文字排版
    textLayout: {
      font: 'Consolas, monospace',
      fontSize: 12,
      lineWidth: 80,
      indent: 2
    },

    // 週報固定契約（不可漂移）
    caseDisplay: {
      fallbackLabel: '未命名案件',
      separator: ' – ',
      overviewTitle: '本週案件總覽',
      showSummarySection: false,
      showBasisDateLine: false,
      titleIncludeStatus: false,
      issueWrapWidth: 44,
      workSummaryWrapWidth: 44,
      completionWrapWidth: 44,
      billingWrapWidth: 44,
      issueLabel: '問題描述',
      workSummaryLabel: '工作內容',
      completionLabel: '完成狀態',
      billingLabel: '收費',
      mergePartsIntoWorkContent: true
    },

    // 下週計畫固定契約（與週報案件契約分開管理，避免欄位漂移）
    planDisplay: {
      fallbackLabel: '未命名計畫',
      planLabel: '計畫內容',
      wrapWidth: 44,
      customerPlaceholder: '客戶',
      projectPlaceholder: '專案/機型',
      planPlaceholder: '計畫內容'
    },
    
    // 週報模式
    modes: [
      { value: 'engineer', label: '工程完整版' },
      { value: 'manager', label: '管理摘要版' }
    ],
    
    // 必填欄位
    requiredFields: [
      'dept',
      'reporter',
      'items'
    ]
  },
  
  // ========================================
  // UI 配置
  // ========================================
  ui: {
    // 斷點
    breakpoints: {
      mobile: 768,
      tablet: 1024,
      desktop: 1280
    },
    
    // 顏色主題
    colors: {
  // 企業系統風（淺色、低彩度、三層背景）
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primarySoft: 'rgba(37, 99, 235, 0.10)',
  secondary: '#0ea5e9',
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',

  // 版面層次（稍深底色 + 白色卡片；提高層次、降低「灰白一片」的單調感）
  background: '#f4f6fb',
  surface: '#ffffff',
  surfaceMuted: '#f2f5fa',
  panel: '#ffffff',
  panelAlt: '#f7f9fd',

  text: '#0f172a',
  textSecondary: '#475569',
  border: '#dbe2ef',
  shadow: 'rgba(15, 23, 42, 0.08)',
  backdrop: 'rgba(15, 23, 42, 0.40)'
},


    // 動畫
    animation: {
      duration: 200,
      easing: 'ease-in-out'
    },
    
    // Toast 配置
    toast: {
      duration: 3000,
      position: 'top-right'
    },
    
    // Modal 配置
    modal: {
      closeOnBackdrop: true,
      closeOnEscape: true
    }
  },
  
  // ========================================
  // 功能開關（Feature Flags）
  // ========================================
  features: {
    enableOrders: true,           // 訂單追蹤功能
    enableQuotes: true,           // 報價功能
    enableParts: true,            // 零件管理/追蹤
    enableNotifications: false,   // 推送通知
    enableOfflineMode: true,      // 離線模式
    enableAutoBackup: true,       // 自動備份
    enableAuditLog: true,         // 審計日誌
    enableAdvancedSearch: false,  // 進階搜尋
    enableExport: true,           // 匯出功能
    enableImport: false           // 匯入功能
  },
  
  // ========================================
  // 錯誤處理配置
  // ========================================
  error: {
    showStackTrace: false,        // 生產環境關閉
    enableSentry: false,          // 第三方錯誤追蹤
    maxErrorLogs: 100,            // 最多保留錯誤日誌數
    
    // 錯誤等級
    levels: {
      CRITICAL: 1,  // 系統無法運行
      HIGH: 2,      // 核心功能失效
      MEDIUM: 3,    // 部分功能失效
      LOW: 4        // UI 小問題
    }
  },
  
  // ========================================
  // 開發模式
  // ========================================
  isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1';
  },
  
  // ========================================
  // 裝置檢測
  // ========================================
  device: {
    isMobile() {
      return window.innerWidth < AppConfig.ui.breakpoints.mobile;
    },
    
    isTablet() {
      const width = window.innerWidth;
      return width >= AppConfig.ui.breakpoints.mobile && 
             width < AppConfig.ui.breakpoints.desktop;
    },
    
    isDesktop() {
      return window.innerWidth >= AppConfig.ui.breakpoints.desktop;
    },
    
    getDeviceType() {
      if (this.isMobile()) return 'mobile';
      if (this.isTablet()) return 'tablet';
      return 'desktop';
    }
  },
  
  // ========================================
  // 輔助方法
  // ========================================
  getVersion() {
    return `${this.VERSION} (${this.VERSION_DATE})`;
  },
  
  getFullVersion() {
    return `${this.VERSION}.${this.BUILD_NUMBER} - ${this.VERSION_NAME}`;
  },

  /**
   * 取得「設備產品線 / 機型」對照表（合併預設 + 使用者設定）
   *
   * 合併規則：
   * - 若使用者設定有某個產品線（key 存在），則該產品線以使用者設定為準（可新增/刪除/調整順序）。
   * - 若使用者設定未包含該產品線，則沿用預設。
   */
  getMachineCatalog() {
    const base = (this.business && this.business.machineCatalog && typeof this.business.machineCatalog === 'object')
      ? this.business.machineCatalog
      : {};

    let custom = {};
    try {
      const ss = (typeof window !== 'undefined' && window.AppRegistry && typeof window.AppRegistry.get === 'function')
        ? window.AppRegistry.get('SettingsService')
        : ((typeof window !== 'undefined' && typeof window._svc === 'function') ? window._svc('SettingsService') : null);
      const s = (ss && ss.settings) ? ss.settings : null;
      const c = s && s.machineCatalog && typeof s.machineCatalog === 'object' ? s.machineCatalog : null;
      if (c) custom = c;
    } catch (_) {
      custom = {};
    }

    const keys = new Set([
      ...Object.keys(base || {}),
      ...Object.keys(custom || {})
    ]);

    const out = {};
    for (const k of keys) {
      const source = (custom && Object.prototype.hasOwnProperty.call(custom, k)) ? custom[k] : base[k];
      out[k] = Array.isArray(source) ? source.map(v => String(v || '').trim()).filter(Boolean) : [];
    }
    return out;
  },
  
  getStatusByValue(value) {
    return this.business.repairStatus.find(s => s.value === value);
  },

  _resolveBusinessStatusCollection(type) {
    const normalized = (type || '').toString().trim().toLowerCase();
    const map = {
      quote: 'quoteStatus',
      quotes: 'quoteStatus',
      order: 'orderStatus',
      orders: 'orderStatus',
      part: 'partStatus',
      parts: 'partStatus',
      repairpart: 'partStatus',
      repairparts: 'partStatus',
      billing_chargeable: 'billingChargeable',
      billingchargeable: 'billingChargeable',
      billing_charge: 'billingChargeable',
      billing_order: 'billingOrderDecision',
      billingorder: 'billingOrderDecision',
      billing_order_status: 'billingOrderDecision',
      billing_stage: 'billingNotOrderedStage',
      billingstage: 'billingNotOrderedStage',
      billing_not_ordered_stage: 'billingNotOrderedStage',
      billing_reason: 'billingNotOrderedReason',
      billingreason: 'billingNotOrderedReason',
      billing_not_ordered_reason: 'billingNotOrderedReason'
    };
    return map[normalized] || '';
  },

  getBusinessStatusOptions(type) {
    const key = this._resolveBusinessStatusCollection(type);
    const list = key ? this.business?.[key] : null;
    return Array.isArray(list) ? list.map(item => ({ ...item })) : [];
  },

  getBusinessStatusMeta(type, value) {
    const status = (value || '').toString().trim();
    if (!status) return null;
    return this.getBusinessStatusOptions(type).find(item => item.value === status) || null;
  },

  isTerminalBusinessStatus(type, value) {
    const meta = this.getBusinessStatusMeta(type, value);
    return !!(meta && meta.terminal === true);
  },

  getBusinessStatusRank(type, value) {
    const meta = this.getBusinessStatusMeta(type, value);
    return Number.isFinite(Number(meta?.rank)) ? Number(meta.rank) : 999;
  },

  getStatusPresentation(type, value) {
    const entityType = (type || '').toString().trim().toLowerCase();

    if (entityType === 'repair') {
      const repairMaps = {
        '進行中':   { badgeClass: 'badge-primary', accent: '#2563eb', soft: 'rgba(37,99,235,.12)' },
        '需要零件': { badgeClass: 'badge-warning', accent: '#d97706', soft: 'rgba(217,119,6,.15)' },
        '已完成':   { badgeClass: 'badge-success', accent: '#16a34a', soft: 'rgba(22,163,74,.14)' }
      };
      return repairMaps[(value || '').toString().trim()] || {
        badgeClass: '',
        accent: 'var(--module-accent)',
        soft: 'var(--module-accent-soft)'
      };
    }

    const meta = this.getBusinessStatusMeta(entityType, value);
    if (meta) {
      return {
        badgeClass: meta.badgeClass || '',
        accent: meta.accent || 'var(--module-accent)',
        soft: meta.soft || 'var(--module-accent-soft)'
      };
    }

    return {
      badgeClass: '',
      accent: 'var(--module-accent)',
      soft: 'var(--module-accent-soft)'
    };
  },

  getStatusBadgeClass(type, value) {
    return this.getStatusPresentation(type, value).badgeClass || '';
  },

  getStatusAccent(type, value) {
    const found = this.getStatusPresentation(type, value);
    return {
      accent: found.accent || 'var(--module-accent)',
      soft: found.soft || 'var(--module-accent-soft)'
    };
  },
  
  getBillingFlowMeta(billing) {
    const b = (billing && typeof billing === 'object') ? billing : {};
    const chargeableValue = (b.chargeable === true)
      ? 'chargeable'
      : (b.chargeable === false ? 'free' : 'undecided');
    const chargeableMeta = this.getBusinessStatusMeta('billing_chargeable', chargeableValue);

    const orderDecisionValue = (b.chargeable === true)
      ? ((b.orderStatus === 'ordered') ? 'ordered' : (b.orderStatus === 'not_ordered' ? 'not_ordered' : 'unknown'))
      : '';
    const orderDecisionMeta = orderDecisionValue
      ? this.getBusinessStatusMeta('billing_order', orderDecisionValue)
      : null;

    const stageCode = (b.notOrdered && typeof b.notOrdered === 'object')
      ? (b.notOrdered.stageCode || '')
      : '';
    const reasonCode = (b.notOrdered && typeof b.notOrdered === 'object')
      ? (b.notOrdered.reasonCode || '')
      : (b.notOrderedReason || '');
    const note = (b.notOrdered && typeof b.notOrdered === 'object')
      ? (b.notOrdered.note || '')
      : '';
    const stageMeta = stageCode ? this.getBusinessStatusMeta('billing_stage', String(stageCode).toLowerCase()) : null;
    const reasonMeta = reasonCode ? this.getBusinessStatusMeta('billing_reason', String(reasonCode).toLowerCase()) : null;

    const summaryLabel = [
      chargeableMeta?.label || '',
      orderDecisionMeta?.label || ''
    ].filter(Boolean).join(' / ') || '尚未決定';

    return {
      chargeableValue,
      chargeableMeta,
      orderDecisionValue,
      orderDecisionMeta,
      stageCode: stageCode || '',
      stageMeta,
      reasonCode: reasonCode || '',
      reasonMeta,
      note: note || '',
      summaryLabel,
      isChargeable: b.chargeable === true,
      isFree: b.chargeable === false,
      isUndecided: b.chargeable !== true && b.chargeable !== false,
      isOrdered: b.chargeable === true && b.orderStatus === 'ordered',
      isNotOrdered: b.chargeable === true && b.orderStatus === 'not_ordered',
      isOrderUnknown: b.chargeable === true && b.orderStatus !== 'ordered' && b.orderStatus !== 'not_ordered'
    };
  },

  getBillingNotOrderedStageOptions() {
    return Array.isArray(this.business?.billingNotOrderedStage)
      ? this.business.billingNotOrderedStage.map(item => ({ ...item }))
      : [];
  },

  getBillingNotOrderedReasonOptions() {
    return Array.isArray(this.business?.billingNotOrderedReason)
      ? this.business.billingNotOrderedReason.map(item => ({ ...item }))
      : [];
  },

  getRoleByValue(value) {
    return this.business.roles.find(r => r.value === value);
  },
  
  hasPermission(userRole, permission) {
    const role = this.getRoleByValue(userRole);
    if (!role) return false;
    
    if (role.permissions.includes('all')) return true;
    return role.permissions.includes(permission);
  }
};

// 凍結配置物件，防止意外修改
Object.freeze(AppConfig);
Object.freeze(AppConfig.auth);
Object.freeze(AppConfig.firebase);
Object.freeze(AppConfig.system);
Object.freeze(AppConfig.business);
Object.freeze(AppConfig.weekly);
Object.freeze(AppConfig.ui);
Object.freeze(AppConfig.features);
Object.freeze(AppConfig.error);
Object.freeze(AppConfig.integration);
Object.freeze(AppConfig.integration.gas);

// 輸出到全域
if (typeof window !== 'undefined') {
  window.AppConfig = AppConfig;
}

// 也支援 ES6 模組匯出（未來可能用到）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppConfig;
}

console.log(`✅ Config loaded: ${AppConfig.getFullVersion()}`);
