import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- firestore モック --------------------------------------------------------

vi.mock('@/lib/firestore', () => ({
  getUserProfile: vi.fn().mockResolvedValue(null),
  saveUserProfile: vi.fn().mockResolvedValue(undefined),
}))

// ---- import after mock -------------------------------------------------------

import { ProfileModal } from './ProfileModal'

// ---- デフォルト props --------------------------------------------------------

function renderModal(overrides: Partial<React.ComponentProps<typeof ProfileModal>> = {}) {
  const defaults = {
    uid: 'test-uid',
    photoURL: null,
    onClose: vi.fn(),
    onSignOut: vi.fn(),
  }
  return render(<ProfileModal {...defaults} {...overrides} />)
}

// ---- テスト ------------------------------------------------------------------

describe('ProfileModal — ログアウトボタン', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ログアウトボタンが表示される', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument()
  })

  it('ログアウトボタンをクリックすると onSignOut が呼ばれる', () => {
    const onSignOut = vi.fn()
    renderModal({ onSignOut })
    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('ログアウトボタンをクリックしても onClose は呼ばれない', () => {
    // signOut 後は useAuth がユーザーを null にし、Header の条件分岐でモーダルが
    // 自動的に非表示になるため、ProfileModal 側で onClose を呼ぶ必要はない。
    // この仕様を意図的に保護するためにテストしている。
    const onClose = vi.fn()
    const onSignOut = vi.fn()
    renderModal({ onClose, onSignOut })
    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('保存中はログアウトボタンが disabled になる', async () => {
    // saveUserProfile を pending のままにして saving 状態を維持する
    const { saveUserProfile } = await import('@/lib/firestore')
    vi.mocked(saveUserProfile).mockReturnValue(new Promise(() => {}))

    renderModal()

    // 名前を入力して保存ボタンをクリック → saving = true になる
    fireEvent.change(screen.getByPlaceholderText('ニックネームを入力'), {
      target: { value: 'テスト' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '保存' }))
    })

    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeDisabled()
  })
})
