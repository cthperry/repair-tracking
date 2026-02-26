/**
 * Application Constants
 * @file core/constants.js
 * @description 應用程式共用常數定義
 */

/**
 * 應用程式常數配置
 * @constant {Object} APP_CONSTANTS
 */
const APP_CONSTANTS = {
  /** 主要內容容器 ID */
  CONTAINER_ID: 'main-content',

  /** 應用程式容器 ID */
  APP_CONTAINER_ID: 'app-container',

  /** 標題元素 ID（可被覆寫） */
  HEADER_TITLE_ID: 'header-title',

  /** 副標題元素 ID（可被覆寫） */
  HEADER_SUBTITLE_ID: 'header-subtitle',

  /** 預設 UI 密度 */
  DEFAULT_DENSITY: 'comfortable',

  /** 導航逾時時間（毫秒） */
  NAVIGATION_TIMEOUT: 5000,

  /** 錯誤嚴重程度級別 */
  ERROR_SEVERITY: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH'
  }
};
