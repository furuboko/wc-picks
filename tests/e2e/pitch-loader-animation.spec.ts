/**
 * PitchLoader CSS animation E2E テスト
 *
 * 背景:
 *   PR #63 で導入した PitchLoader のバウンドアニメーションが、
 *   Tailwind v4 + Lightning CSS の @keyframes pruning により
 *   実際には動いていなかった (PR #64 で hotfix)。
 *   jsdom 環境では @keyframes が実行されないため Unit Test では検出できず、
 *   本テストで「実ブラウザでアニメーションが動作しているか」を保証する。
 *
 * アプローチ:
 *   page.setContent() で最小 HTML+CSS を注入し、サーバー起動なしで
 *   Chromium が CSS animation を実行することを利用して検証する。
 *
 *   フィクスチャ CSS のうち @keyframes soccer-bounce は globals.css から
 *   動的に抽出するため、ソースを変更しても自動追従する。
 *   @keyframes pulse は Tailwind v4 の組み込みアニメーションであり
 *   globals.css には存在しないためフィクスチャにのみ定義する。
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { test, expect } from '@playwright/test'

// ─── @keyframes soccer-bounce を globals.css から動的抽出 ──────────────────
// globals.css の @theme inline ブロック内にネストされた @keyframes を取得する。
// 抽出関数はネストした {} を深さカウントで処理するため、
// globals.css のフォーマット変更に対しても堅牢。

function extractKeyframes(css: string, name: string): string {
  const startRegex = new RegExp(`@keyframes\\s+${name}\\s*\\{`)
  const match = startRegex.exec(css)
  if (!match) throw new Error(`@keyframes ${name} が globals.css に見つかりません`)

  let depth = 0
  let i = match.index
  for (; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') {
      depth--
      if (depth === 0) break
    }
  }
  return css.slice(match.index, i + 1)
}

const globalsCss = readFileSync(
  join(__dirname, '../../src/app/globals.css'),
  'utf-8',
)

// globals.css が変更されても自動追従する
const soccerBounceKeyframes = extractKeyframes(globalsCss, 'soccer-bounce')

// Tailwind v4 組み込みアニメーション pulse の @keyframes。
// globals.css には含まれないためフィクスチャにのみ定義する。
const PULSE_KEYFRAMES = `
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}`

// ─── フィクスチャ HTML ────────────────────────────────────────────────────────
// .animate-soccer-bounce / motion-reduce:animate-pulse は
// Tailwind v4 が globals.css から生成するユーティリティと等価。
// Tailwind はバリアント CSS をユーティリティより後に出力するため、
// prefers-reduced-motion: reduce 時は pulse が soccer-bounce を上書きする。
const FIXTURE_HTML = `<!DOCTYPE html>
<html>
<head>
<style>
  ${soccerBounceKeyframes}
  ${PULSE_KEYFRAMES}

  .animate-soccer-bounce {
    animation: soccer-bounce 1.2s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .motion-reduce\\:animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
  }
</style>
</head>
<body>
  <!--
    PitchLoader の <span aria-hidden="true"> と同じクラス構成。
    inline-block が無いと transform が機能しないため style で付与。
  -->
  <span
    id="ball"
    aria-hidden="true"
    class="animate-soccer-bounce motion-reduce:animate-pulse"
    style="display: inline-block; font-size: 3rem;"
  >⚽</span>
</body>
</html>`

// soccer-bounce は 1.2s サイクル。半サイクル分（~600ms）をサンプリングするフレーム数。
// @60fps で 36 フレーム ≈ 600ms。CI の低速環境でも十分な変化を観測できる。
const SAMPLE_FRAMES = 36

// Y 方向の移動量がこの値（px）を超えたら「バウンドあり」と判定するしきい値
const BOUNCE_THRESHOLD_PX = 0.5

/**
 * CSS `transform` 文字列から Y 方向の移動量（px）を抽出する。
 * matrix(a,b,c,d,tx,ty) および matrix3d(...) の両形式に対応。
 */
function getTranslateY(transform: string): number {
  if (transform === 'none') return 0

  // 2D: matrix(a, b, c, d, tx, ty)
  const m2d = transform.match(
    /^matrix\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([^)]+)\)/,
  )
  if (m2d) return parseFloat(m2d[1])

  // 3D: matrix3d(a,b,c,d, e,f,g,h, i,j,k,l, tx,ty,tz,1)
  // ty は 14 番目の値（0-indexed: 13）
  const m3d = transform.match(/^matrix3d\(([^)]+)\)/)
  if (m3d) {
    const values = m3d[1].split(',').map((v) => parseFloat(v.trim()))
    return values[13] ?? 0
  }

  return 0
}

test.describe('PitchLoader アニメーション (実ブラウザ E2E)', () => {
  // ────────────────────────────────────────────────
  // 1. soccer-bounce アニメーションが再生されているか
  // ────────────────────────────────────────────────
  test('ボールが soccer-bounce アニメーションを再生している', async ({ page }) => {
    await page.setContent(FIXTURE_HTML)

    const ball = page.locator('#ball')

    // Web Animations API でアニメーション情報を取得
    const animInfo = await ball.evaluate((el) => {
      const animations = el.getAnimations()
      return animations.map((a) => ({
        playState: a.playState,
        animationName: (a as CSSAnimation).animationName,
      }))
    })

    // アニメーションが 1 つ存在し、再生中かつ正しい名前であること
    expect(animInfo).toHaveLength(1)
    expect(animInfo[0].playState).toBe('running')
    expect(animInfo[0].animationName).toBe('soccer-bounce')
  })

  // ────────────────────────────────────────────────
  // 2. transform 値が時間経過で変化するか
  //    @keyframes pruning 問題の再発を直接検出するテスト
  // ────────────────────────────────────────────────
  test('ボールの transform が時間経過で変化する（@keyframes pruning 再発防止）', async ({
    page,
  }) => {
    await page.setContent(FIXTURE_HTML)

    const ball = page.locator('#ball')

    // SAMPLE_FRAMES を evaluate に引数として渡す（browser context では外部変数は不可）
    const transforms = await ball.evaluate(
      async (el, frames): Promise<string[]> =>
        new Promise((resolve) => {
          const samples: string[] = []
          let frameCount = 0

          const sample = () => {
            samples.push(window.getComputedStyle(el).transform)
            frameCount++
            if (frameCount < frames) {
              requestAnimationFrame(sample)
            } else {
              resolve(samples)
            }
          }

          requestAnimationFrame(sample)
        }),
      SAMPLE_FRAMES,
    )

    // @keyframes が正しく動作していれば複数の異なる transform 行列が記録される
    // pruning されて animation が無効なら全フレーム "none" または同一値になる
    const uniqueTransforms = new Set(transforms)
    expect(
      uniqueTransforms.size,
      `全 ${transforms.length} フレームが同一 transform (${[...uniqueTransforms][0]}) — ` +
        '@keyframes が pruning されている可能性があります',
    ).toBeGreaterThan(1)
  })

  // ────────────────────────────────────────────────
  // 3. prefers-reduced-motion: reduce 時に pulse へ切り替わること
  // ────────────────────────────────────────────────
  test('prefers-reduced-motion: reduce 時に bounce が止まり pulse に切り替わる', async ({
    page,
  }) => {
    // Playwright の emulateMedia で reduced-motion を強制
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setContent(FIXTURE_HTML)

    const ball = page.locator('#ball')

    const animInfo = await ball.evaluate((el) => {
      const animations = el.getAnimations()
      return animations.map((a) => ({
        playState: a.playState,
        animationName: (a as CSSAnimation).animationName,
      }))
    })

    const animationNames = animInfo.map((a) => a.animationName)

    // reduced-motion 時は pulse アニメーションが適用される
    expect(animationNames).toContain('pulse')
    // soccer-bounce は適用されていないこと
    expect(animationNames).not.toContain('soccer-bounce')
  })

  // ────────────────────────────────────────────────
  // 4. prefers-reduced-motion: reduce 時に Y 方向の移動が発生しないこと
  //    pulse は opacity のみ変化させるため translateY は常に 0 のはず
  // ────────────────────────────────────────────────
  test('prefers-reduced-motion: reduce 時に Y 方向の移動が発生しない', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setContent(FIXTURE_HTML)

    const ball = page.locator('#ball')

    const transforms = await ball.evaluate(
      async (el, frames): Promise<string[]> =>
        new Promise((resolve) => {
          const samples: string[] = []
          let frameCount = 0

          const sample = () => {
            samples.push(window.getComputedStyle(el).transform)
            frameCount++
            if (frameCount < frames) {
              requestAnimationFrame(sample)
            } else {
              resolve(samples)
            }
          }

          requestAnimationFrame(sample)
        }),
      SAMPLE_FRAMES,
    )

    // soccer-bounce が動いていれば最大 -14px の Y 移動が現れる
    // matrix() / matrix3d() の両形式を getTranslateY で統一処理
    const hasVerticalTranslation = transforms.some(
      (t) => Math.abs(getTranslateY(t)) > BOUNCE_THRESHOLD_PX,
    )

    expect(
      hasVerticalTranslation,
      'reduce-motion 時に Y 方向の移動が検出された — bounce が止まっていません',
    ).toBe(false)
  })
})
