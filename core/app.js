/**
 * Main Application Class
 * @file core/app.js
 * @description 主應用程式基礎類別，Desktop 和 Mobile 版本共用
 */

/**
 * 主應用程式基礎類別
 * @class MainApp
 * @description 管理應用程式的生命週期、初始化和用戶偏好設定
 */
class MainApp {
  /**
   * 創建 MainApp 實例
   */
  constructor() {
    this.isInitialized = false;
    this._prefBound = false;
    this._initStartTime = null;
  }

  /**
   * 重置所有服務（用於登入/登出時清理狀態）
   * @static
   * @returns {boolean} 是否成功重置服務
   */
  static resetAllServices() {
    try {
      if (typeof window.resetAllServices === 'function') {
        window.resetAllServices();
        console.debug('Services reset successfully');
        return true;
      } else {
        console.warn('resetAllServices function not found');
        return false;
      }
    } catch (e) {
      console.error('Reset services failed:', e);
      return false;
    }
  }

  /**
   * 清空應用容器
   * @static
   * @returns {boolean} 是否成功清空容器
   */
  static clearAppContainer() {
    try {
      const container = document.getElementById(APP_CONSTANTS.APP_CONTAINER_ID);
      if (container) {
        container.innerHTML = '';
        console.debug('App container cleared');
        return true;
      } else {
        console.warn(`Container with ID "${APP_CONSTANTS.APP_CONTAINER_ID}" not found`);
        return false;
      }
    } catch (e) {
      console.error('Clear app container failed:', e);
      return false;
    }
  }

  /**
   * 初始化主應用程式
   * @async
   * @returns {Promise<void>}
   * @throws {Error} 初始化失敗時拋出錯誤
   */
  async init() {
    if (this.isInitialized) {
      console.warn('MainApp already initialized');
      return;
    }

    this._initStartTime = performance.now();

    try {
      // 渲染主框架（由子類別實現）
      this.renderMainFrame();

      // 套用使用者 UI 偏好（例如列表密度）
      await this.applyUIPreferences();

      // 初始化 Router
      window.AppRouter = new _AppRouter(APP_CONSTANTS.CONTAINER_ID);
      // 預設進入第一個路由
      await window.AppRouter.navigate(_AppRouter.getDefaultRoute());

      // 啟動通知中心（輕量，失敗不阻斷）
      try { if (window.NotificationCenter && typeof window.NotificationCenter.init === "function") window.NotificationCenter.init(); } catch (_) {}

      // 綁定 Header / 通知面板行為
      try { this.bindGlobalHeaderActions(); } catch (_) {}






      this.isInitialized = true;

      // Log initialization time
      const initTime = performance.now() - this._initStartTime;
      console.info(`MainApp initialized successfully in ${initTime.toFixed(2)}ms`);

    } catch (error) {
      const errorMsg = 'Main application initialization failed';
      console.error(errorMsg, error);
      window.ErrorHandler?.log?.(APP_CONSTANTS.ERROR_SEVERITY.HIGH, 'MainApp', errorMsg, {
        error,
        timestamp: new Date().toISOString(),
        initTime: this._initStartTime ? performance.now() - this._initStartTime : null
      });

      // Show user-friendly error message
      const container = document.getElementById(APP_CONSTANTS.APP_CONTAINER_ID);
      if (container) {
        container.innerHTML = `<div class="msg-error" style="margin:24px">
          <strong>應用程式啟動失敗</strong><br>
          請重新整理頁面或聯繫技術支援<br>
          <small>錯誤：${error?.message || '未知錯誤'}</small>
        </div>`;
      }
    }
  }

  /**
   * 渲染主應用程式框架
   * @abstract
   * @description 此方法必須由子類別實現（Desktop 或 Mobile）
   * @returns {boolean} 是否成功渲染
   */
  renderMainFrame() {
    throw new Error('renderMainFrame() must be implemented by subclass');
  }

  /**
   * 設定 UI 密度（舒適/緊湊）
   * @param {string} value - 密度值：'comfortable' 或 'compact'
   */
  setDensity(value) {
    const v = (value === 'compact') ? 'compact' : 'comfortable';
    try { document.body.dataset.density = v; } catch (_) {}
  }

  /**
   * 套用用戶的 UI 偏好設定
   * @async
   * @returns {Promise<void>}
   */
  async applyUIPreferences() {
    let density = APP_CONSTANTS.DEFAULT_DENSITY;
    try {
      const ss = _AppRouter.getService('SettingsService');
      if (ss?.getSettings) {
        const s = await ss.getSettings();
        density = s?.uiDensity || 'comfortable';
      }
    } catch (e) {
      console.warn('applyUIPreferences failed:', e);
    }
    this.setDensity(density);

    // 即時更新（設定儲存後立即生效）
    if (!this._prefBound) {
      this._prefBound = true;
      window.addEventListener('settings:updated', (ev) => {
        this.setDensity(ev?.detail?.uiDensity);
      });
    }
  }


  /**
   * 綁定 Header 互動（通知面板、登出）
   * - 只綁一次
   * - 桌機與行動裝置共用（若無元件會自動略過）
   */
  bindGlobalHeaderActions() {
    if (this._globalHeaderBound) return;
    this._globalHeaderBound = true;

    // Panel state (persist per browser)
    var FILTER_KEY = 'notif_panel_filter';
    var filterMode = 'all';
    try {
      var saved = localStorage.getItem(FILTER_KEY);
      if (saved === 'unread' || saved === 'all') filterMode = saved;
    } catch (_) {}

    var closePanel = function () {
      var panel = document.getElementById('notif-panel');
      if (panel) panel.classList.add('hidden');
    };

    var updateFilterUI = function () {
      var panel = document.getElementById('notif-panel');
      if (!panel) return;
      var btnAll = panel.querySelector('[data-action="notif-filter-all"]');
      var btnUnread = panel.querySelector('[data-action="notif-filter-unread"]');
      if (btnAll) btnAll.classList.toggle('active', filterMode === 'all');
      if (btnUnread) btnUnread.classList.toggle('active', filterMode === 'unread');
      try { localStorage.setItem(FILTER_KEY, filterMode); } catch (_) {}
    };

    var renderPanel = function () {
      var listEl = document.getElementById('notif-panel-list');
      if (!listEl) return;

      var nc = window.NotificationCenter;
      var items = (nc && typeof nc.getAll === 'function') ? (nc.getAll() || []) : [];

      // Filter
      if (filterMode === 'unread') {
        items = items.filter(function (n) { return n && !n.read; });
      }

      updateFilterUI();

      listEl.innerHTML = '';

      if (!items.length) {
        var empty = document.createElement('div');
        empty.className = 'notif-empty';
        empty.textContent = (filterMode === 'unread') ? '目前沒有未讀通知' : '目前沒有通知';
        listEl.appendChild(empty);
        return;
      }

      var max = Math.min(items.length, 10);
      for (var i = 0; i < max; i++) {
        var n = items[i];
        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'notif-item' + (n.read ? '' : ' unread');
        row.setAttribute('data-action', 'notif-open');
        row.setAttribute('data-notif-id', n.id);

        var icon = document.createElement('div');
        icon.className = 'notif-icon';
        icon.textContent = n.icon || '🔔';

        var body = document.createElement('div');
        body.className = 'notif-body';

        var text = document.createElement('div');
        text.className = 'notif-text';
        text.textContent = n.text || '';

        var meta = document.createElement('div');
        meta.className = 'notif-meta';
        meta.textContent = n.timeLabel || '';

        body.appendChild(text);
        body.appendChild(meta);

        row.appendChild(icon);
        row.appendChild(body);

        listEl.appendChild(row);
      }

      if (items.length > max) {
        var more = document.createElement('div');
        more.className = 'notif-more';
        more.textContent = '... 其餘 ' + (items.length - max) + ' 筆請至儀表板查看';
        listEl.appendChild(more);
      }
    };

    document.addEventListener('click', function (ev) {
      var t = ev.target;
      var actionEl = t && t.closest ? t.closest('[data-action]') : null;

      // Click outside closes panel
      if (!actionEl) {
        var wrap = document.querySelector('.notif-wrap');
        var panel = document.getElementById('notif-panel');
        if (panel && !panel.classList.contains('hidden')) {
          if (wrap && !wrap.contains(t)) closePanel();
        }
        return;
      }

      var action = actionEl.getAttribute('data-action');
      if (!action) return;

      switch (action) {
        case 'notif-filter-all': {
          filterMode = 'all';
          renderPanel();
          break;
        }
        case 'notif-filter-unread': {
          filterMode = 'unread';
          renderPanel();
          break;
        }
        case 'toggle-notif': {
          var panel = document.getElementById('notif-panel');
          if (!panel) return;
          var isHidden = panel.classList.contains('hidden');
          if (isHidden) {
            renderPanel();
            panel.classList.remove('hidden');
          } else {
            closePanel();
          }
          break;
        }
        case 'notif-refresh': {
          try { window.NotificationCenter && window.NotificationCenter.refresh && window.NotificationCenter.refresh(); } catch (_) {}
          renderPanel();
          break;
        }
        case 'notif-mark-all': {
          try { window.NotificationCenter && window.NotificationCenter.markAllRead && window.NotificationCenter.markAllRead(); } catch (_) {}
          renderPanel();
          break;
        }
        case 'goto-dashboard': {
          closePanel();
          try { window.AppRouter && window.AppRouter.navigate('dashboard'); } catch (_) {}
          break;
        }
        case 'notif-open': {
          var id = actionEl.getAttribute('data-notif-id');
          closePanel();
          try { window.NotificationCenter && window.NotificationCenter.handleClick && window.NotificationCenter.handleClick(id); } catch (_) {}
          break;
        }
        case 'logout': {
          closePanel();
          try { window.logout && window.logout(); } catch (_) {}
          break;
        }
      }
    });
  }
}


/**
 * Desktop 版本主應用程式
 * @class DesktopApp
 * @extends MainApp
 */
class DesktopApp extends MainApp {
  /**
   * 渲染 Desktop 主應用程式框架（側邊欄、標題欄、內容區域）
   * @returns {boolean} 是否成功渲染
   */
  renderMainFrame() {
    const container = document.getElementById(APP_CONSTANTS.APP_CONTAINER_ID);
    if (!container) {
      console.error(`Container with ID "${APP_CONSTANTS.APP_CONTAINER_ID}" not found`);
      return false;
    }

    const defaultRoute = _AppRouter.ROUTE_CONFIG[_AppRouter.getDefaultRoute()];
    container.innerHTML = `
      <div class="app">
        <aside>
          <div class="sidebar-header">
            <div class="sidebar-title">維修追蹤系統 <span class="brand-badge">${AppConfig.VERSION}.${AppConfig.BUILD_NUMBER}</span></div>
            <div class="muted sidebar-sub">${AppConfig.VERSION_NAME}</div>
            <div class="spacer"></div>
            <div class="user-pill" title="登入使用者">
              <div class="user-avatar">${_AppRouter.getUserAvatar(window.currentUser)}</div>
              <div class="user-name">${_AppRouter.getUserDisplayName(window.currentUser)}</div>
            </div>
          </div>

          <!-- 導航選單 -->
          <nav class="sidebar-nav">
            <div class="nav-title">功能選單</div>
            ${_AppRouter.generateNavItems()}
          </nav>

          <div class="sidebar-footer">
            <div class="muted">${AppConfig.getFullVersion()}</div>
          </div>
        </aside>

        <main>
          <header>
            <div class="header-left">
              <div id="header-title" class="header-title">${defaultRoute.icon} ${defaultRoute.title}</div>
              <div id="header-subtitle" class="header-subtitle">${AppConfig.getFullVersion()}</div>
            </div>
            <div class="header-right">
              <div class="notif-wrap">
                <button class="btn ghost notif-btn" data-action="toggle-notif" aria-label="通知" style="position:relative;">
                  🔔 <span id="notif-badge" class="notif-badge" style="display:none;"></span>
                </button>
                <div id="notif-panel" class="notif-panel hidden" role="dialog" aria-label="通知面板">
                  <div class="notif-panel-hd">
                    <div class="notif-panel-left">
                      <div class="notif-panel-title">通知</div>
                      <div class="notif-filter" role="tablist" aria-label="通知篩選">
                        <button class="btn ghost xs" data-action="notif-filter-unread" type="button">未讀</button>
                        <button class="btn ghost xs" data-action="notif-filter-all" type="button">全部</button>
                      </div>
                    </div>
                    <div class="notif-panel-actions">
                      <button class="btn ghost sm" data-action="notif-mark-all">全部已讀</button>
                      <button class="btn ghost sm" data-action="notif-refresh">刷新</button>
                    </div>
                  </div>
                  <div id="notif-panel-list" class="notif-panel-list"></div>
                  <div class="notif-panel-ft">
                    <button class="btn ghost sm" data-action="goto-dashboard">前往儀表板</button>
                  </div>
                </div>
              </div>
              <button class="btn ghost" data-action="logout">登出</button>
            </div>
          </header>

          <div id="main-content" class="main-content">
            <!-- 模組將在這裡渲染 -->
          </div>
        </main>
      </div>
    `;

    console.debug('Desktop main frame rendered successfully');
    return true;
  }
}

/**
 * Mobile 版本主應用程式
 * @class MobileApp
 * @extends MainApp
 */
class MobileApp extends MainApp {
  /**
   * 渲染 Mobile 主應用程式框架（頂部標題欄、內容區域、底部標籤欄）
   * @returns {boolean} 是否成功渲染
   */
  renderMainFrame() {
    const container = document.getElementById(APP_CONSTANTS.APP_CONTAINER_ID);
    if (!container) {
      console.error(`Container with ID "${APP_CONSTANTS.APP_CONTAINER_ID}" not found`);
      return false;
    }

    const defaultRoute = _AppRouter.ROUTE_CONFIG[_AppRouter.getDefaultRoute()];
    container.innerHTML = `
      <div class="app">
        <header>
          <div class="header-content">
            <div id="mobile-header-title" class="header-title">${defaultRoute.icon} ${defaultRoute.title}</div>
            <div id="mobile-header-subtitle" class="header-subtitle">${AppConfig.getFullVersion()}</div>
          </div>
          <div class="ml-auto header-right">
            <div class="notif-wrap">
              <button class="btn ghost notif-btn" data-action="toggle-notif" aria-label="通知" style="position:relative;">
                🔔 <span id="notif-badge" class="notif-badge" style="display:none;"></span>
              </button>
              <div id="notif-panel" class="notif-panel hidden" role="dialog" aria-label="通知面板">
                <div class="notif-panel-hd">
                  <div class="notif-panel-left">
                    <div class="notif-panel-title">通知</div>
                    <div class="notif-filter" role="tablist" aria-label="通知篩選">
                      <button class="btn ghost xs" data-action="notif-filter-unread" type="button">未讀</button>
                      <button class="btn ghost xs" data-action="notif-filter-all" type="button">全部</button>
                    </div>
                  </div>
                  <div class="notif-panel-actions">
                    <button class="btn ghost sm" data-action="notif-mark-all" type="button">全部已讀</button>
                    <button class="btn ghost sm" data-action="notif-refresh" type="button">刷新</button>
                  </div>
                </div>
                <div id="notif-panel-list" class="notif-panel-list"></div>
                <div class="notif-panel-ft">
                  <button class="btn ghost sm" data-action="goto-dashboard" type="button">前往儀表板</button>
                </div>
              </div>
            </div>
            <div class="user-pill">
              <div class="user-avatar">${_AppRouter.getUserAvatar(window.currentUser)}</div>
            </div>
          </div>
        </header>

        <main id="main-content">
          <!-- 模組將在這裡渲染 -->
        </main>

        <nav class="tabbar">
          ${_AppRouter.generateTabItems()}
        </nav>
      </div>
    `;

    console.debug('Mobile main frame rendered successfully');
    return true;
  }
}

/**
 * 初始化應用程式實例並綁定事件監聽器
 * @function initializeApp
 * @param {typeof MainApp} AppClass - 應用程式類別（DesktopApp 或 MobileApp）
 * @param {Object} [options] - 可選配置
 * @param {Object} [options.constantOverrides] - 需要覆寫的 APP_CONSTANTS 屬性
 * @returns {MainApp} 應用程式實例
 */
function initializeApp(AppClass, options = {}) {
  // 覆寫常數（如 Mobile 的 header ID）
  if (options.constantOverrides) {
    Object.assign(APP_CONSTANTS, options.constantOverrides);
  }

  // 建立應用實例
  const mainApp = new AppClass();
  window.MainApp = mainApp;

  // 監聽登入成功事件
  window.addEventListener('auth:login', () => {
    AppClass.resetAllServices();
    mainApp.init();
  });

  // 監聽登出事件
  window.addEventListener('auth:logout', () => {
    AppClass.resetAllServices();
    AppClass.clearAppContainer();
    mainApp.isInitialized = false;
  });

  console.debug(`${AppClass.name} initialized and event listeners registered`);
  return mainApp;
}
