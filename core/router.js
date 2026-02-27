/**
 * Shared Application Router
 * @file core/router.js
 * @description 統一的應用程式路由管理系統，Desktop 和 Mobile 共用
 */

/**
 * 應用程式路由器
 * @class _AppRouter
 * @description 負責應用程式的路由管理、模組載入和導航控制
 */
class _AppRouter {
  /**
   * Unified route configuration - single source of truth
   * @static
   * @type {Object.<string, {icon: string, title: string, navLabel: string, tabLabel: string, subtitle: string, controller: string, moduleName: string}>}
   * @description 集中管理所有路由的配置信息，包括圖標、標題、控制器等
   */
  static ROUTE_CONFIG = {
    dashboard:   { icon: "🏠", title: "儀表板", navLabel: "儀表板", tabLabel: "首頁", subtitle: "總覽／待辦／通知", controller: "DashboardController", moduleName: "儀表板模組" },
    analytics:   { icon: '📈', title: '分析', navLabel: '分析', tabLabel: '分析', subtitle: '趨勢／統計／Top10', controller: 'AnalyticsController', moduleName: '分析模組' },
    repairs:     { icon: '📋', title: '維修管理', navLabel: '維修管理', tabLabel: '維修', subtitle: '維修單建立／進度追蹤／歷史紀錄', controller: 'RepairController', moduleName: '維修模組' },
    machines:    { icon: '🖥️', title: '機台歷史', navLabel: '機台歷史', tabLabel: '機台', subtitle: '依序號快速查詢維修歷史', controller: 'MachinesController', moduleName: '機台歷史模組' },
    maintenance: { icon: '🛠️', title: '機台保養', navLabel: '機台保養', tabLabel: '保養', subtitle: '設備管理／保養紀錄／提醒／報表', controller: 'MaintenanceController', moduleName: '機台保養模組' },
    customers:   { icon: '👥', title: '客戶管理', navLabel: '客戶管理', tabLabel: '客戶', subtitle: '公司／聯絡人資料維護與釘選', controller: 'CustomerController', moduleName: '客戶模組' },
    parts:       { icon: '🧩', title: '零件追蹤', navLabel: '零件追蹤', tabLabel: '零件', subtitle: '需求 → 報價 → 下單 → 到貨 → 更換', controller: 'PartsController', moduleName: '零件模組', featureFlag: 'enableParts' },
    quotes:      { icon: '🧾', title: '報價管理', navLabel: '報價', tabLabel: '報價', subtitle: '建立報價單並追蹤核准/送出狀態', controller: 'QuotesController', moduleName: '報價模組', featureFlag: 'enableQuotes' },
    orders:      { icon: '📦', title: '訂單追蹤', navLabel: '訂單', tabLabel: '訂單', subtitle: '採購與到貨進度、結案狀態管理', controller: 'OrdersController', moduleName: '訂單模組', featureFlag: 'enableOrders' },
    kb:          { icon: '📚', title: '知識庫', navLabel: '知識庫', tabLabel: '知識', subtitle: 'FAQ／故障模式／SOP／案例查詢', controller: 'KBController', moduleName: '知識庫模組' },
    sops:        { icon: '🧾', title: 'SOP Hub', navLabel: 'SOP Hub', tabLabel: 'SOP', subtitle: 'SOP 版本／附件（My Drive）／關聯維修單', controller: 'SOPController', moduleName: 'SOP Hub 模組' },
    weekly:      { icon: '📊', title: '週報', navLabel: '週報', tabLabel: '週報', subtitle: '本週工作彙整／下週計畫', controller: 'WeeklyController', moduleName: '週報模組' },
    guide:       { icon: '📘', title: '使用者指南', navLabel: '使用者指南', tabLabel: '指南', subtitle: '快速上手／重點流程／FAQ', controller: 'GuideController', moduleName: '操作指南模組' },
    settings:    { icon: '⚙️', title: '設定', navLabel: '設定', tabLabel: '設定', subtitle: '預設值、Top N 釘選、系統參數', controller: 'SettingsController', moduleName: '設定模組' }
  };

  /**
   * 判斷某路由是否因 Feature Flag 而應隱藏
   * @static
   * @param {Object} config - ROUTE_CONFIG 單一路由設定
   * @returns {boolean} 是否顯示（true = 顯示）
   */
  static _isRouteEnabled(config) {
    if (!config || !config.featureFlag) return true;
    try {
      const flags = window.AppConfig && window.AppConfig.features;
      if (!flags) return true;
      return flags[config.featureFlag] !== false;
    } catch (_) {
      return true;
    }
  }

  /**
   * 創建 Router 實例
   * @param {string} containerId - 模組容器的 DOM ID
   */
  constructor(containerId) {
    this.containerId = containerId;
    this.current = null;
    this.currentFeature = null;
    this.isNavigating = false;
    this._navigationTimeout = null;
  }

  /**
   * 獲取路由的元數據配置
   * @param {string} route - 路由名稱
   * @returns {Object} 路由配置對象，包含 icon, title, subtitle 等
   * @private
   */
  _routeMeta(route) {
    return _AppRouter.ROUTE_CONFIG[route] || _AppRouter.ROUTE_CONFIG[_AppRouter.getDefaultRoute()];
  }

  /**
   * 更新頁面標題區域
   * @param {string} route - 當前路由名稱
   * @private
   */
  _updateHeader(route) {
    const meta = this._routeMeta(route);
    const t = document.getElementById(APP_CONSTANTS.HEADER_TITLE_ID);
    const s = document.getElementById(APP_CONSTANTS.HEADER_SUBTITLE_ID);
    if (t) t.textContent = `${meta.icon} ${meta.title}`;
    if (s) s.textContent = `${meta.subtitle} · ${AppConfig.getFullVersion()}`;
  }

  /**
   * 設置導航項目的活動狀態
   * @param {string} route - 要激活的路由名稱
   */
  setActive(route) {
    document.querySelectorAll('[data-route]').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-route') === route);
    });
  }

  /**
   * 根據路由名稱獲取對應的控制器實例
   * @param {string} route - 路由名稱
   * @returns {Object|null} 控制器實例，如果不存在則返回 null
   * @private
   */
  _controllerByRoute(route) {
    const r = (route || '').toString().trim();
    const config = _AppRouter.ROUTE_CONFIG[r];
    return config?.controller ? window[config.controller] : null;
  }

  /**
   * 獲取路由對應的模組顯示名稱
   * @param {string} route - 路由名稱
   * @returns {string} 模組名稱
   * @private
   */
  _moduleNameByRoute(route) {
    const config = _AppRouter.ROUTE_CONFIG[route];
    return config?.moduleName || '模組';
  }

  /**
   * 在切換路由時銷毀當前模組控制器
   * @param {string} nextRoute - 即將導航到的路由
   * @private
   */
  _destroyCurrentIfNeeded(nextRoute) {
    try {
      const cur = (this.current || '').toString().trim();
      const next = (nextRoute || '').toString().trim();
      if (!cur || cur === next) return;
      const ctrl = this._controllerByRoute(cur);
      if (ctrl && typeof ctrl.destroy === 'function') {
        ctrl.destroy();
      }
    } catch (e) {
      console.warn('Router destroy current failed:', e);
    }
  }

  /**
   * 從路由配置動態生成側邊欄導航選單 HTML (Desktop)
   * @static
   * @returns {string} 導航選單的 HTML 字符串
   */
  static generateNavItems() {
    // P3-1: 移除 inline onclick → event delegation（bindGlobalHeaderActions 中處理）
    // P2-2: 依 Feature Flag 過濾隱藏模組
    return Object.entries(_AppRouter.ROUTE_CONFIG)
      .filter(([, config]) => _AppRouter._isRouteEnabled(config))
      .map(([route, config], index) => {
        const activeClass = index === 0 ? ' active' : '';
        return `<div class="nav-item${activeClass}" data-route="${route}">${config.icon} ${config.navLabel}</div>`;
      })
      .join('\n                ');
  }

  /**
   * 從路由配置動態生成底部標籤欄 HTML (Mobile)
   * @static
   * @returns {string} 標籤欄的 HTML 字符串
   */
  static generateTabItems() {
    // P3-1: 移除 inline onclick → event delegation（bindGlobalHeaderActions 中處理）
    // P2-2: 依 Feature Flag 過濾隱藏模組
    return Object.entries(_AppRouter.ROUTE_CONFIG)
      .filter(([, config]) => _AppRouter._isRouteEnabled(config))
      .map(([route, config], index) => {
        const activeClass = index === 0 ? ' active' : '';
        return `<div class="tab-item${activeClass}" data-route="${route}">
            <div class="tab-icon">${config.icon}</div>
            <div class="tab-label">${config.tabLabel}</div>
          </div>`;
      })
      .join('\n              ');
  }

  /**
   * 獲取默認路由（配置中的第一個路由）
   * @static
   * @returns {string} 默認路由名稱
   */
  static getDefaultRoute() {
    const routes = Object.keys(_AppRouter.ROUTE_CONFIG);
    return routes.length > 0 ? routes[0] : 'repairs';
  }

  /**
   * 從服務註冊表或全局對象獲取服務實例
   * @static
   * @param {string} serviceName - 服務名稱
   * @returns {Object|undefined} 服務實例
   */
  static getService(serviceName) {
    if (!serviceName || typeof serviceName !== 'string') {
      console.warn('Invalid service name:', serviceName);
      return undefined;
    }
    try {
      if (typeof window !== 'undefined' && typeof window._svc === 'function') return window._svc(serviceName);
      if (typeof window !== 'undefined' && window.AppRegistry && typeof window.AppRegistry.get === 'function') return window.AppRegistry.get(serviceName);
    } catch (e) {
      try { console.warn('getService failed:', e); } catch (_) {}
    }
    return undefined;
  }

  /**
   * 獲取用戶頭像首字母
   * @static
   * @param {Object} user - 用戶對象
   * @param {string} [user.displayName] - 用戶顯示名稱
   * @returns {string} 頭像首字母（大寫）
   */
  static getUserAvatar(user) {
    const displayName = user?.displayName || 'U';
    return displayName.trim().slice(0, 1).toUpperCase();
  }

  /**
   * 獲取用戶顯示名稱
   * @static
   * @param {Object} user - 用戶對象
   * @param {string} [user.displayName] - 用戶顯示名稱
   * @returns {string} 用戶顯示名稱或默認值
   */
  static getUserDisplayName(user) {
    return user?.displayName || '未知';
  }

  /**
   * 驗證路由名稱是否有效
   * @static
   * @param {string} route - 要驗證的路由名稱
   * @returns {boolean} 路由是否有效
   */
  static isValidRoute(route) {
    return route && typeof route === 'string' && route in _AppRouter.ROUTE_CONFIG;
  }

  /**
   * 導航到指定路由
   * @async
   * @param {string} route - 目標路由名稱
   * @returns {Promise<void>}
   * @throws {Error} 當模組容器未找到時拋出錯誤
   */
  async navigate(route) {
    // Prevent concurrent navigation
    if (this.isNavigating) {
      console.warn('Navigation already in progress, ignoring request for:', route);
      return;
    }

    // Validate and sanitize route
    if (!_AppRouter.isValidRoute(route)) {
      console.warn(`Invalid route "${route}", redirecting to default route`);
      route = _AppRouter.getDefaultRoute();
    }

    // 簡易模式：阻擋導向到被隱藏的模組（含 Sidebar 點擊/深連結）
    try {
      if (window.UIMode && typeof window.UIMode.isRouteAllowed === 'function') {
        if (!window.UIMode.isRouteAllowed(route)) {
          try { window.UI?.toast?.('簡易模式下此功能已隱藏，已返回「維修管理」。', { type: 'warning' }); } catch (_) {}
          route = 'repairs';
        }
      }
    } catch (_) {}

    // Skip if already on this route
    if (this.current === route) {
      console.debug('Already on route:', route);
      return;
    }

    this.isNavigating = true;

    // Set navigation timeout
    this._navigationTimeout = setTimeout(() => {
      if (this.isNavigating) {
        console.error('Navigation timeout exceeded for route:', route);
        this.isNavigating = false;
      }
    }, APP_CONSTANTS.NAVIGATION_TIMEOUT);

    try {
      // 依路由套用模組 Accent（避免全站視覺過度單調）
      try { window.AppTheme?.apply?.(route); } catch (_) {}

      // 更新頁首（標題/副標）
      this._updateHeader(route);

      // 效能/穩定性：離開舊模組時先釋放 UI（避免殘留 listener / 定時器）
      this._destroyCurrentIfNeeded(route);

      this.setActive(route);

      const host = document.getElementById(this.containerId);
      if (!host) {
        const errorMsg = `Module container with ID "${this.containerId}" not found in DOM`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      // 延遲載入：確保該模組的 UI/Controller/CSS 已載入
      try {
        if (window.ModuleLoader && typeof window.ModuleLoader.ensure === 'function') {
          const firstScript = window.ModuleLoader?.manifest?.[route]?.scripts?.[0] || '';
          const alreadyLoaded = !!(firstScript && window.ModuleLoader?._loadedScripts?.has?.(firstScript));
          if (!alreadyLoaded) {
            try { host.innerHTML = '<div class="msg-loading">載入中…</div>'; } catch (_) {}
          }
          await window.ModuleLoader.ensure(route);
        }
      } catch (e) {
        console.error('Module loading failed:', e);
        window.ErrorHandler?.log?.('HIGH', 'ModuleLoader', 'Module loading failed', { error: e, route });
        host.innerHTML = '<div class="msg-error">模組載入失敗：' + (e?.message || e) + '</div>';
        return;
      }

      // Use controller helper method to reduce code duplication
      const controller = this._controllerByRoute(route);
      if (controller?.reload) {
        await controller.reload(this.containerId);
      } else {
        const moduleName = this._moduleNameByRoute(route);
        host.innerHTML = `<div class="msg-info">${moduleName}尚未載入</div>`;
      }

      this.current = route;
      this.currentFeature = route;
    } catch (e) {
      const errorMsg = `Navigation to route "${route}" failed: ${e?.message || e}`;
      console.error('Router navigate error:', errorMsg, e);
      window.ErrorHandler?.log?.(APP_CONSTANTS.ERROR_SEVERITY.HIGH, 'Router', errorMsg, {
        error: e,
        route,
        currentRoute: this.current,
        timestamp: new Date().toISOString()
      });

      const host = document.getElementById(this.containerId);
      if (host) {
        host.innerHTML = `<div class="msg-error">
          <strong>導航失敗</strong><br>
          無法載入 "${route}" 模組<br>
          <small>${e?.message || '未知錯誤'}</small>
        </div>`;
      }
    } finally {
      // Clear navigation timeout
      if (this._navigationTimeout) {
        clearTimeout(this._navigationTimeout);
        this._navigationTimeout = null;
      }

      this.isNavigating = false;
      console.debug('Navigation completed:', route);
    }
  }
}
