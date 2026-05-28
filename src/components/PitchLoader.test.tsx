import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PitchLoader } from './PitchLoader'

describe('PitchLoader', () => {
  it('デフォルトラベル「キックオフ準備中…」を表示する', () => {
    render(<PitchLoader />)
    expect(screen.getByText('キックオフ準備中…')).toBeInTheDocument()
  })

  it('指定した label を可視テキストとして表示する', () => {
    render(<PitchLoader label="試合結果を集計中…" />)
    expect(screen.getByText('試合結果を集計中…')).toBeInTheDocument()
    // aria-label は可視テキストと二重読み上げになるため付与しない
    expect(screen.getByRole('status')).not.toHaveAttribute('aria-label')
  })

  it('role="status" と aria-live="polite" でスクリーンリーダーに通知する', () => {
    render(<PitchLoader />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('inline=false (デフォルト) はフルサイズレイアウト (py-16, text-5xl) を適用する', () => {
    const { container } = render(<PitchLoader />)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('py-16')
    expect(wrapper.className).toContain('flex-col')
    const ball = wrapper.querySelector('span[aria-hidden="true"]') as HTMLElement
    expect(ball.className).toContain('text-5xl')
  })

  it('inline=true はコンパクトレイアウト (py-4, text-2xl) を適用する', () => {
    const { container } = render(<PitchLoader inline />)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('py-4')
    expect(wrapper.className).not.toContain('flex-col')
    const ball = wrapper.querySelector('span[aria-hidden="true"]') as HTMLElement
    expect(ball.className).toContain('text-2xl')
  })

  it('サッカーボール絵文字は aria-hidden で支援技術から隠す', () => {
    const { container } = render(<PitchLoader />)
    const ball = container.querySelector('span[aria-hidden="true"]')
    expect(ball).not.toBeNull()
    expect(ball?.textContent).toBe('⚽')
  })

  it('prefers-reduced-motion 用に motion-reduce:animate-pulse を含む', () => {
    const { container } = render(<PitchLoader />)
    const ball = container.querySelector('span[aria-hidden="true"]') as HTMLElement
    expect(ball.className).toContain('motion-reduce:animate-pulse')
  })

  it('@keyframes pruning 問題の再発を防ぐため arbitrary value animation を使わない', () => {
    // 旧実装は arbitrary value (animate-[soccer-bounce_...]) を使っていたが、
    // Lightning CSS が未参照と判定して @keyframes を pruning し、
    // ボールが静止する不具合が発生していた (PR #64 で修正)。
    // @theme で --animate-soccer-bounce を登録し、animate-soccer-bounce ユーティリティで参照する。
    const { container } = render(<PitchLoader />)
    const ball = container.querySelector('span[aria-hidden="true"]') as HTMLElement
    expect(ball.className).toContain('animate-soccer-bounce')
    expect(ball.className).not.toContain('animate-[')
  })
})
