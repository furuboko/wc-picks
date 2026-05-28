import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---- next/navigation モック --------------------------------------------------

vi.mock('next/navigation', () => ({
  usePathname: () => '/predictions',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

// ---- hooks モック ------------------------------------------------------------

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))

// ---- firestore モック --------------------------------------------------------

vi.mock('@/lib/firestore', () => ({
  getUserProfile: vi.fn().mockResolvedValue(null),
  saveUserProfile: vi.fn().mockResolvedValue(undefined),
}))

// ---- import after mock -------------------------------------------------------

import { useAuth } from '@/hooks/useAuth'
import { Header } from './Header'

const mockUseAuth = vi.mocked(useAuth)

const TEST_UID = 'user-1'

// ---- テスト ------------------------------------------------------------------

describe('Header — ログアウトボタン', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // プロフィール設定済みにして ProfileModal の自動表示を抑制する
    localStorage.setItem(`profileNameSet_${TEST_UID}`, '1')
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('ログインしている場合にヘッダーにログアウトボタンが表示されない', () => {
    mockUseAuth.mockReturnValue({
      user: {
        uid: TEST_UID,
        email: 'user@example.com',
        displayName: 'テストユーザー',
        photoURL: null,
      } as ReturnType<typeof useAuth>['user'],
      loading: false,
      isAdmin: false,
      inAppBrowserType: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    render(<Header />)

    // ログアウトボタンはヘッダーに存在せず ProfileModal 内のみにある
    expect(screen.queryByRole('button', { name: 'ログアウト' })).not.toBeInTheDocument()
  })
})
