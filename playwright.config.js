// Playwright E2E 設定（最小可跑）
// 用法：
//   1) 先用任意靜態伺服器啟動專案根目錄（例如 python -m http.server 8080）
//   2) 設定 BASE_URL（預設 http://localhost:8080）
//   3) npm run e2e

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: 'tests/e2e',
  timeout: 60 * 1000,
  expect: { timeout: 15 * 1000 },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    trace: 'retain-on-failure'
  },
  reporter: [['list']]
};

module.exports = config;
