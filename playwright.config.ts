import { defineConfig } from '@playwright/test';
import path from 'node:path';

const chrome = process.env.PLAYWRIGHT_CHROME_PATH ?? (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  use: { baseURL: 'http://127.0.0.1:4175', headless: true, storageState: { cookies: [], origins: [{ origin: 'http://127.0.0.1:4175', localStorage: [{ name: 'btb.intro.seen', value: '1' }] }] }, ...(chrome ? { launchOptions: { executablePath: chrome } } : {}) },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4175', url: 'http://127.0.0.1:4175', reuseExistingServer: !process.env.CI },
  reporter: 'line'
});
