/**
 * 全域錯誤處理器
 * V160 - 確保任何錯誤都不會讓系統完全停擺
 */

class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = AppConfig.error.maxErrorLogs;
    this.listeners = [];
    this.isInitialized = false;

    // 保存原始 console 方法，避免遞迴與污染全域
    this._originalConsoleError = console.error;
  }
  
  /**
   * 初始化錯誤處理器
   */
  init() {
    if (this.isInitialized) {
      console.debug('ErrorHandler already initialized');
      return;
    }

    
    // 攔截全域錯誤
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
    
    // 攔截 Promise 拒絕
    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError(event.reason, {
        type: 'unhandledRejection',
        promise: event.promise
      });
    });
    
    // 覆寫 console.error 以記錄錯誤（僅限開發模式）
    // 目的：開發診斷方便；正式使用避免大量 log 造成效能/雜訊問題
    if (AppConfig.isDevelopment()) {
      const originalError = console.error;
      this._originalConsoleError = originalError;
      console.error = (...args) => {
        // 先輸出原始錯誤
        try { originalError.apply(console, args); } catch (_) {}
        // 再記錄（避免遞迴：logToConsole 不使用 console.error）
        try { this.log('MEDIUM', 'Console Error', args[0], { args }); } catch (_) {}
      };
    }
    
    this.isInitialized = true;
    console.log('✅ ErrorHandler initialized');
  }


  /**
   * 單一錯誤處理入口（P2-1）
   * 用於：各模組 async 流程 catch(err) 後統一交給 ErrorHandler
   */
  handle(error, moduleName = 'APP', level = 'MEDIUM', context = {}) {
    try {
      const message = (error && error.message) ? error.message : String(error);
      this.log(level, moduleName, message, Object.assign({ error }, context));
    } catch (e) {
      // 最後保險：避免 ErrorHandler 自己炸掉
      try { this._originalConsoleError && this._originalConsoleError('[ErrorHandler.handle fallback]', e, error); } catch (_) {}
    }
  }
  
  /**
   * 處理全域錯誤
   */
  handleGlobalError(error, context = {}) {
    const errorInfo = {
      level: 'CRITICAL',
      module: 'Global',
      message: error?.message || String(error),
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString()
    };
    
    this.log(errorInfo.level, errorInfo.module, errorInfo.message, errorInfo);
    
    // 顯示錯誤 UI（只在嚴重錯誤時）
    if (errorInfo.level === 'CRITICAL') {
      this.showCriticalErrorUI(errorInfo);
    }
  }
  
  /**
   * 記錄錯誤
   */
  log(level, module, message, details = {}) {
    const error = {
      id: this.generateErrorId(),
      level: level || 'MEDIUM',
      module: module || 'Unknown',
      message: message || 'No message',
      details: details,
      timestamp: new Date().toISOString(),
      version: AppConfig.VERSION
    };
    
    // 加入錯誤佇列
    this.errors.unshift(error);
    
    // 限制錯誤數量
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }
    
    // 儲存到本地（供後續診斷）
    this.saveToLocalStorage();
    
    // 觸發監聽器
    this.notifyListeners(error);
    
    // 控制台輸出
    this.logToConsole(error);
    
    return error;
  }
  
  /**
   * 包裹函式，自動捕捉錯誤
   */
  wrap(fn, moduleName, fallback = null) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.log('MEDIUM', moduleName, error.message, {
          error,
          functionName: fn.name,
          args
        });
        
        if (fallback) {
          return typeof fallback === 'function' ? fallback(error) : fallback;
        }
        
        throw error;
      }
    };
  }
  
  /**
   * 包裹模組（錯誤邊界）
   */
  createBoundary(moduleName, fallbackUI = null) {
    return {
      execute: async (fn) => {
        try {
          return await fn();
        } catch (error) {
          this.log('HIGH', moduleName, error.message, { error });
          
          // 顯示降級 UI
          if (fallbackUI) {
            this.showFallbackUI(moduleName, error, fallbackUI);
          }
          
          return null;
        }
      },
      
      render: (containerId, fn) => {
        const container = document.getElementById(containerId);
        if (!container) {
          this.log('MEDIUM', moduleName, `Container #${containerId} not found`);
          return;
        }
        
        try {
          fn(container);
        } catch (error) {
          this.log('MEDIUM', moduleName, error.message, { error, containerId });
          
          // 顯示錯誤卡片
          container.innerHTML = this.getErrorCardHTML(moduleName, error);
        }
      }
    };
  }
  
  /**
   * 顯示嚴重錯誤 UI（全螢幕紅色）
   */
  showCriticalErrorUI(error) {
    // 避免重複顯示
    if (document.getElementById('critical-error-overlay')) {
      return;
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'critical-error-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
      color: #fef2f2;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      padding: 20px;
    `;
    
    overlay.innerHTML = `
      <div style="max-width: 600px; text-align: center;">
        <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
        <h1 style="font-size: 28px; font-weight: 600; margin-bottom: 10px;">
          系統遇到嚴重錯誤
        </h1>
        <p style="font-size: 16px; color: #fecaca; margin-bottom: 30px;">
          很抱歉，系統無法繼續運行。請重新整理頁面或聯繫技術支援。
        </p>
        <div style="background: rgba(0,0,0,0.2); border-radius: 8px; padding: 15px; margin-bottom: 20px; text-align: left;">
          <div style="font-size: 12px; color: #fca5a5; margin-bottom: 8px;">錯誤資訊：</div>
          <div style="font-family: monospace; font-size: 13px; color: #fef2f2; word-break: break-all;">
            <strong>模組：</strong> ${error.module}<br>
            <strong>訊息：</strong> ${error.message}<br>
            <strong>時間：</strong> ${error.timestamp}<br>
            <strong>錯誤碼：</strong> ${error.id}
          </div>
        </div>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button onclick="location.reload()" style="
            padding: 12px 24px;
            background: #fef2f2;
            color: #991b1b;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          ">
            🔄 重新整理頁面
          </button>
          <button onclick="window.ErrorHandler.copyErrorInfo('${error.id}')" style="
            padding: 12px 24px;
            background: rgba(255,255,255,0.1);
            color: #fef2f2;
            border: 1px solid #fca5a5;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          ">
            📋 複製錯誤資訊
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
  }
  
  /**
   * 顯示降級 UI（模組錯誤）
   */
  showFallbackUI(moduleName, error, fallbackHTML) {
    const container = document.querySelector(`[data-module="${moduleName}"]`);
    if (container) {
      container.innerHTML = fallbackHTML;
    }
  }
  
  /**
   * 取得錯誤卡片 HTML
   */
  getErrorCardHTML(moduleName, error) {
    return `
      <div style="
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid #ef4444;
        border-radius: 8px;
        padding: 16px;
        color: #fecaca;
      ">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 24px; margin-right: 10px;">⚠️</span>
          <strong style="font-size: 16px;">${moduleName} 模組載入失敗</strong>
        </div>
        <p style="font-size: 13px; margin: 8px 0; color: #fca5a5;">
          ${error.message || '未知錯誤'}
        </p>
        <button onclick="location.reload()" style="
          margin-top: 12px;
          padding: 6px 12px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
        ">
          重新載入
        </button>
      </div>
    `;
  }
  
  /**
   * 複製錯誤資訊
   */
  copyErrorInfo(errorId) {
    const error = this.errors.find(e => e.id === errorId);
    if (!error) {
      console.warn('Error not found:', errorId);
      return;
    }
    
    const info = `
系統錯誤報告
=====================================
錯誤碼: ${error.id}
版本: ${error.version}
時間: ${error.timestamp}
等級: ${error.level}
模組: ${error.module}
訊息: ${error.message}
=====================================
詳細資訊:
${JSON.stringify(error.details, null, 2)}
    `.trim();
    
    navigator.clipboard.writeText(info).then(() => {
      if (window.UI && typeof window.UI.toast === 'function') {
        window.UI.toast('錯誤資訊已複製到剪貼簿', { type: 'success' });
      } else {
        alert('錯誤資訊已複製到剪貼簿');
      }
    });
  }
  
  /**
   * 生成錯誤 ID
   */
  generateErrorId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `ERR-${timestamp}-${random}`.toUpperCase();
  }
  
  /**
   * 儲存到本地
   */
  saveToLocalStorage() {
    try {
      const key = AppConfig.system.storage.prefix + 'errors';
      localStorage.setItem(key, JSON.stringify(this.errors.slice(0, 20)));
    } catch (e) {
      console.warn('Failed to save errors to localStorage:', e);
    }
  }
  
  /**
   * 從本地載入
   */
  loadFromLocalStorage() {
    try {
      const key = AppConfig.system.storage.prefix + 'errors';
      const data = localStorage.getItem(key);
      if (data) {
        this.errors = JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load errors from localStorage:', e);
    }
  }
  
  /**
   * 監聽錯誤
   */
  onError(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }
  
  /**
   * 通知監聽器
   */
  notifyListeners(error) {
    this.listeners.forEach(callback => {
      try {
        callback(error);
      } catch (e) {
        // 避免 console.error 被覆寫後導致遞迴記錄
        try {
          (this._originalConsoleError || console.warn).call(console, 'Error in listener:', e);
        } catch (_) {
          // ignore
        }
      }
    });
  }
  
  /**
   * 控制台輸出
   */
  logToConsole(error) {
    const styles = {
      CRITICAL: 'background: #991b1b; color: #fef2f2; padding: 2px 6px; border-radius: 3px;',
      HIGH: 'background: #c2410c; color: #fff7ed; padding: 2px 6px; border-radius: 3px;',
      MEDIUM: 'background: #ca8a04; color: #fefce8; padding: 2px 6px; border-radius: 3px;',
      LOW: 'background: #4b5563; color: #f3f4f6; padding: 2px 6px; border-radius: 3px;'
    };
    
    console.groupCollapsed(
      `%c${error.level}%c [${error.module}] ${error.message}`,
      styles[error.level] || styles.MEDIUM,
      'color: inherit; padding-left: 5px;'
    );
    console.log('Error ID:', error.id);
    console.log('Timestamp:', error.timestamp);
    console.log('Details:', error.details);
    console.groupEnd();
  }
  
  /**
   * 取得所有錯誤
   */
  getErrors(level = null) {
    if (!level) return this.errors;
    return this.errors.filter(e => e.level === level);
  }
  
  /**
   * 清除錯誤
   */
  clear() {
    this.errors = [];
    this.saveToLocalStorage();
  }
  
  /**
   * 取得錯誤統計
   */
  getStats() {
    const stats = {
      total: this.errors.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    this.errors.forEach(error => {
      const level = error.level.toLowerCase();
      if (stats[level] !== undefined) {
        stats[level]++;
      }
    });
    
    return stats;
  }
}

// 建立全域實例
const errorHandler = new ErrorHandler();

// 輸出到全域
if (typeof window !== 'undefined') {
  window.ErrorHandler = errorHandler;
}

console.log('✅ ErrorHandler loaded');

/**
 * 全域 guard（P2-1）
 * 用法：
 *   const onClick = guard(async () => { ... }, 'RepairsUI');
 *   btn.addEventListener('click', onClick);
 */
if (typeof window !== 'undefined') {
  window.guard = function guard(fn, moduleName = 'APP', fallback = null) {
    if (window.ErrorHandler && typeof window.ErrorHandler.wrap === 'function') {
      return window.ErrorHandler.wrap(fn, moduleName, fallback);
    }
    // fallback：最小保護
    return async (...args) => {
      try { return await fn(...args); }
      catch (e) { console.error(e); if (fallback) return typeof fallback === 'function' ? fallback(e) : fallback; throw e; }
    };
  };
}
