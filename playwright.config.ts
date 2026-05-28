import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  // 各テストは独立した page.setContent() を使うためサーバー不要
  use: {
    browserName: 'chromium',
  },
  // CI では並列化によるフレームスキップを避けるため 1 ワーカーに固定。
  // ローカルではデフォルト（CPU コア数）で並列実行可。
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
})
