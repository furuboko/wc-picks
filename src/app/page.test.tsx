import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import HomePage, { REVEAL } from './page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/',
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/hooks/usePredictions', () => ({
  usePredictions: () => ({ predictions: [], loading: false }),
}))

vi.mock('@/components/GroupCard', () => ({
  GroupCard: ({ groupId }: { groupId: string }) => <div data-testid={`group-${groupId}`} />,
}))

import { useAuth } from '@/hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

const loggedInAuth = {
  user: { uid: 'u1', displayName: 'Tester', email: 't@example.com', photoURL: null },
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  isAdmin: false,
  inAppBrowserType: null,
} as unknown as ReturnType<typeof useAuth>

// page.tsx の REVEAL を再 import して二重管理を避ける
const BEFORE_REVEAL = new Date(REVEAL.getTime() - 60_000)
const AFTER_REVEAL = new Date(REVEAL.getTime() + 1_000)

describe('HomePage — 締切後のスコアボード導線 (Issue #81)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockUseAuth.mockReturnValue(loggedInAuth)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('公開時刻前はスコアボードCTAを表示しない', () => {
    vi.setSystemTime(BEFORE_REVEAL)
    render(<HomePage />)
    expect(screen.queryByRole('link', { name: /スコアボードを見る/ })).toBeNull()
  })

  it('公開時刻後は /scores へのCTAリンクを表示する', () => {
    vi.setSystemTime(AFTER_REVEAL)
    render(<HomePage />)
    const link = screen.getByRole('link', { name: /スコアボードを見る/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/scores')
  })

  it('公開後はカウントダウンや締切バッジを表示しない (UI が CTA 中心に整理されている)', () => {
    vi.setSystemTime(AFTER_REVEAL)
    render(<HomePage />)
    // 締切表示と「まもなく公開」は非表示
    expect(screen.queryByText(/締切:/)).toBeNull()
    expect(screen.queryByText(/まもなく公開/)).toBeNull()
  })
})
