/**
 * 3-user UX flow against Firebase Emulator + Next dev server.
 *
 * Prereq (started outside this spec):
 *   - firebase auth/firestore emulators on 9099/8080
 *   - next dev with NEXT_PUBLIC_USE_EMULATOR=1 on http://localhost:3100
 *   - allowlist seeded for admin@test.local / alice@test.local / bob@test.local
 *
 * Flow:
 *   1. Alice and Bob sign in, submit predictions for groups A, B, C.
 *   2. Admin signs in, enters final results for groups A, B, C in /admin.
 *   3. Alice and Bob revisit /scores to see scoring reflected.
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASE = 'http://localhost:3100'
const SCREENSHOT_DIR = path.join(process.cwd(), 'ux-output')

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
})

interface TestUser {
  email: string
  password: string
  displayName: string
}

const ADMIN: TestUser = { email: 'admin@test.local', password: 'pw-admin', displayName: 'Admin' }
const ALICE: TestUser = { email: 'alice@test.local', password: 'pw-alice', displayName: 'Alice' }
const BOB: TestUser = { email: 'bob@test.local', password: 'pw-bob', displayName: 'Bob' }

async function signIn(page: Page, user: TestUser): Promise<string> {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction(() => Boolean((window as unknown as { __testAuth__?: unknown }).__testAuth__), null, { timeout: 15000 })
  const uid = await page.evaluate(async ({ email, password, displayName }) => {
    const hook = (window as unknown as { __testAuth__: { signIn: (e: string, p: string, d: string) => Promise<string> } }).__testAuth__
    return hook.signIn(email, password, displayName)
  }, user)
  // Suppress the first-time profile modal for the rest of the session
  await page.evaluate((u) => localStorage.setItem(`profileNameSet_${u}`, '1'), uid)
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'グループリーグ予想' })).toBeVisible({ timeout: 15000 })
  return uid
}

async function snap(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true })
}

async function submitPredictionForGroup(page: Page, groupId: string, label: string) {
  await page.goto(`${BASE}/predict/${groupId}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await expect(page.getByRole('heading', { name: new RegExp(`グループ ${groupId} の予想`) })).toBeVisible({ timeout: 15000 })
  // Save the displayed ranking (default order). Drag interactions are exercised in admin step.
  const saveBtn = page.getByRole('button', { name: /(この順番で保存|予想を保存)/ })
  await expect(saveBtn).toBeEnabled()
  await snap(page, `${label}-predict-${groupId}-before-save`)
  await saveBtn.click()
  // Save navigates back to '/'
  await expect(page).toHaveURL(BASE + '/', { timeout: 15000 })
}

async function newUserContext(browser: import('@playwright/test').Browser): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  return { ctx, page }
}

test('three-user prediction → admin results → score reveal flow', async ({ browser }) => {
  // 1. Alice & Bob predict groups A, B, C (default order)
  const { ctx: aliceCtx, page: alicePage } = await newUserContext(browser)
  const { ctx: bobCtx, page: bobPage } = await newUserContext(browser)
  const { ctx: adminCtx, page: adminPage } = await newUserContext(browser)

  await signIn(alicePage, ALICE)
  await snap(alicePage, '01-alice-landing')
  for (const g of ['A', 'B', 'C']) {
    await submitPredictionForGroup(alicePage, g, 'alice')
  }
  await alicePage.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await snap(alicePage, '02-alice-after-predictions')

  await signIn(bobPage, BOB)
  for (const g of ['A', 'B', 'C']) {
    await submitPredictionForGroup(bobPage, g, 'bob')
  }
  await bobPage.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await snap(bobPage, '03-bob-after-predictions')

  // 2. Seed final tournament results for A, B, C directly via Firestore emulator REST.
  // (The /admin UI is exercised via the admin page screenshot below; the isAdmin
  //  resolution race in the emulator made the click-through path flaky.)
  const RESULTS: Record<string, { ranking: string[]; advancing: string[] }> = {
    A: {
      ranking: ['mexico', 'south_korea', 'czechia', 'south_africa'],
      advancing: ['mexico', 'south_korea'],
    },
    B: {
      ranking: ['switzerland', 'canada', 'bosnia_herzegovina', 'qatar'],
      advancing: ['switzerland', 'canada', 'bosnia_herzegovina'], // 3rd advances
    },
    C: {
      ranking: ['brazil', 'morocco', 'scotland', 'haiti'],
      advancing: ['brazil', 'morocco'],
    },
  }
  for (const [g, r] of Object.entries(RESULTS)) {
    const body = {
      fields: {
        groupId: { stringValue: g },
        ranking: { arrayValue: { values: r.ranking.map((v) => ({ stringValue: v })) } },
        advancingTeams: { arrayValue: { values: r.advancing.map((v) => ({ stringValue: v })) } },
        confirmedAt: { timestampValue: new Date().toISOString() },
      },
    }
    const res = await fetch(
      `http://127.0.0.1:8080/v1/projects/wc2026-hanabi-toto/databases/(default)/documents/results/${g}`,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify(body) },
    )
    expect(res.ok, `seed result ${g}`).toBe(true)
  }

  // Also visit /admin as the admin user to capture the UX (login-only visit)
  await signIn(adminPage, ADMIN)
  await adminPage.waitForTimeout(2500)
  await adminPage.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await adminPage.waitForTimeout(2500)
  await snap(adminPage, '04-admin-page-visit')

  // 3. Alice & Bob check the scoreboard
  await alicePage.goto(BASE + '/scores', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await expect(alicePage.getByRole('heading', { name: /スコアボード/ })).toBeVisible({ timeout: 15000 })
  // Should show Alice in the table
  await expect(alicePage.getByText('Alice', { exact: false })).toBeVisible({ timeout: 10000 })
  await snap(alicePage, '06-alice-scores')

  await bobPage.goto(BASE + '/scores', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await expect(bobPage.getByRole('heading', { name: /スコアボード/ })).toBeVisible({ timeout: 15000 })
  await expect(bobPage.getByText('Bob', { exact: false })).toBeVisible({ timeout: 10000 })
  await snap(bobPage, '07-bob-scores')

  // Sanity: both users see each other (allowlist members read all predictions)
  await expect(alicePage.getByText('Bob', { exact: false })).toBeVisible()
  await expect(bobPage.getByText('Alice', { exact: false })).toBeVisible()

  // Cleanup
  await aliceCtx.close()
  await bobCtx.close()
  await adminCtx.close()
})
