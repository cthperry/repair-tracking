/**
 * 共用列表分頁工具
 * V161 - List Paging Utility
 *
 * 目的：
 * - 統一 repairs / quotes / orders 的「顯示更多」行為
 * - 統一 pageSize 的預設（Desktop 60 / Mobile 40）
 *
 * 注意：
 * - 保持極小依賴：僅依賴 AppConfig.device.isMobile()（若存在）
 */
(function () {
  const ListPaging = {
    getDefaultPageSize(opts = {}) {
      const mobileSize = Number(opts.mobileSize || 40);
      const desktopSize = Number(opts.desktopSize || 60);

      const isMobile = (window.AppConfig && window.AppConfig.device && typeof window.AppConfig.device.isMobile === 'function')
        ? window.AppConfig.device.isMobile()
        : (window.innerWidth <= 640);

      return isMobile ? mobileSize : desktopSize;
    },

    normalizePageSize(pageSize, fallbackOpts = {}) {
      const n = Number(pageSize);
      if (Number.isFinite(n) && n > 0) return n;
      return this.getDefaultPageSize(fallbackOpts);
    },

    resetVisibleCount(pageSize, fallbackOpts = {}) {
      return this.normalizePageSize(pageSize, fallbackOpts);
    },

    nextVisibleCount(visibleCount, pageSize, fallbackOpts = {}) {
      const ps = this.normalizePageSize(pageSize, fallbackOpts);
      const cur = Number(visibleCount);
      const safeCur = (Number.isFinite(cur) && cur > 0) ? cur : ps;
      return safeCur + ps;
    }
  };

  if (typeof window !== 'undefined') {
    window.ListPaging = ListPaging;
  }
})();
