const { defineConfig } = require('vitest/config');

// 目標：在不改動既有前端架構（IIFE / global）前提下，建立最小可跑的單元測試保護網。
// - 使用 jsdom 提供 window/document
// - tests/helpers/loadScript 以 VM 方式載入既有前端檔案

module.exports = defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.spec.js'],
    setupFiles: ['tests/setup/vitest.setup.js'],
    testTimeout: 15000
  }
});
