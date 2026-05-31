/**
 * AuthContext — isAdmin 判定ロジックのユニットテスト
 *
 * Issue #90: タイムアウト誤判定と sessionStorage キャッシュの動作を検証する。
 */
import React from 'react'
import { render, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuthProvider, useAuthContext, isIosSafari } from './AuthContext'

// ---- Firebase モック --------------------------------------------------------

const mockOnAuthStateChanged = vi.fn()
const mockGetRedirectResult = vi.fn().mockResolvedValue(null)
const mockSignInWithPopup = vi.fn()
const mockSignInWithRedirect = vi.fn()
const mockFirebaseSignOut = vi.fn()

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {},
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  signInWithRedirect: (...args: unknown[]) => mockSignInWithRedirect(...args),
  getRedirectResult: (...args: unknown[]) => mockGetRedirectResult(...args),
  signOut: (...args: unknown[]) => mockFirebaseSignOut(...args),
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}))

vi.mock('@/lib/firebase', () => ({ auth: {} }))

const mockCheckIsAdmin = vi.fn()
const mockSaveUserProfile = vi.fn().mockResolvedValue(undefined)

vi.mock('@/lib/firestore', () => ({
  isAdmin: (...args: unknown[]) => mockCheckIsAdmin(...args),
  saveUserProfile: (...args: unknown[]) => mockSaveUserProfile(...args),
}))

// ---- テスト用ヘルパー -------------------------------------------------------

/** useAuthContext の値を描画して取り出すためのコンポーネント */
function AuthConsumer({ onValue }: { onValue: (v: ReturnType<typeof useAuthContext>) => void }) {
  const value = useAuthContext()
  onValue(value)
  return null
}

/** AuthProvider をレンダリングし、最新の context 値を取得するためのセットアップ */
async function setup() {
  let capturedValue: ReturnType<typeof useAuthContext> | null = null
  const onValue = (v: ReturnType<typeof useAuthContext>) => { capturedValue = v }
  await act(async () => {
    render(
      <AuthProvider>
        <AuthConsumer onValue={onValue} />
      </AuthProvider>,
    )
  })
  return { getValue: () => capturedValue! }
}

/** onAuthStateChanged コールバックを取り出して任意のユーザーで呼び出す */
async function triggerAuthStateChange(user: { uid: string; email: string } | null) {
  const callback = mockOnAuthStateChanged.mock.calls[0]?.[1]
  if (!callback) throw new Error('onAuthStateChanged コールバックが登録されていません')
  await callback(user)
}

// ---- 共通セットアップ -------------------------------------------------------

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  mockOnAuthStateChanged.mockReturnValue(vi.fn())
  mockGetRedirectResult.mockResolvedValue(null)
})

afterEach(() => {
  sessionStorage.clear()
  vi.useRealTimers() // fake timers を使ったテストで漏れないようにリセット
})

// ===========================================================================

describe('AuthContext — isAdmin 判定（Issue #90 修正の検証）', () => {
  // ── キャッシュなし、Firestore が素早く応答する場合 ──────────────────

  describe('キャッシュなし、Firestore が素早く応答', () => {
    it('isAdmin=true を返し、sessionStorage にキャッシュする', async () => {
      mockCheckIsAdmin.mockResolvedValue(true)

      const { getValue } = await setup()

      await act(async () => {
        await triggerAuthStateChange({ uid: 'uid-1', email: 'admin@test.com' })
      })

      expect(getValue().loading).toBe(false)
      expect(getValue().isAdmin).toBe(true)
      expect(sessionStorage.getItem('isAdmin:v1:uid-1')).toBe('true')
    })

    it('isAdmin=false を返し、sessionStorage にはキャッシュしない', async () => {
      mockCheckIsAdmin.mockResolvedValue(false)

      const { getValue } = await setup()

      await act(async () => {
        await triggerAuthStateChange({ uid: 'uid-2', email: 'user@test.com' })
      })

      expect(getValue().loading).toBe(false)
      expect(getValue().isAdmin).toBe(false)
      expect(sessionStorage.getItem('isAdmin:v1:uid-2')).toBeNull()
    })
  })

  // ── sessionStorage キャッシュヒット ──────────────────────────────────

  describe('sessionStorage キャッシュヒット（isAdmin=true がキャッシュ済み）', () => {
    it('Firestore 呼び出しを待たずに即座に isAdmin=true で loading=false になる', async () => {
      sessionStorage.setItem('isAdmin:v1:uid-admin', 'true')

      // Firestore は遅延して応答する（キャッシュがあれば待たないはず）
      let firestoreResolve: (v: boolean) => void
      mockCheckIsAdmin.mockReturnValue(
        new Promise<boolean>((resolve) => { firestoreResolve = resolve }),
      )

      const { getValue } = await setup()

      // キャッシュ経由では Firestore を await しないため、act は不要
      await act(async () => {
        await triggerAuthStateChange({ uid: 'uid-admin', email: 'admin@test.com' })
      })

      // キャッシュヒットにより即座に確定している
      expect(getValue().loading).toBe(false)
      expect(getValue().isAdmin).toBe(true)

      // バックグラウンドで Firestore が false を返したらキャッシュをクリアして更新
      await act(async () => { firestoreResolve!(false) })
      await waitFor(() => expect(getValue().isAdmin).toBe(false))
      expect(sessionStorage.getItem('isAdmin:v1:uid-admin')).toBeNull()
    })

    it('バックグラウンドで Firestore が true を返した場合、キャッシュと isAdmin を維持する', async () => {
      sessionStorage.setItem('isAdmin:v1:uid-admin2', 'true')

      let firestoreResolve: (v: boolean) => void
      mockCheckIsAdmin.mockReturnValue(
        new Promise<boolean>((resolve) => { firestoreResolve = resolve }),
      )

      const { getValue } = await setup()

      await act(async () => {
        await triggerAuthStateChange({ uid: 'uid-admin2', email: 'admin2@test.com' })
      })

      expect(getValue().loading).toBe(false)
      expect(getValue().isAdmin).toBe(true)

      await act(async () => { firestoreResolve!(true) })
      await waitFor(() => expect(getValue().isAdmin).toBe(true))
      expect(sessionStorage.getItem('isAdmin:v1:uid-admin2')).toBe('true')
    })
  })

  // ── タイムアウト後も Firestore の応答を待ち続ける ────────────────────

  describe('タイムアウト後の Firestore 遅延応答', () => {
    it('タイムアウト後に Firestore が true を返したら isAdmin=true に更新しキャッシュする', async () => {
      vi.useFakeTimers()

      let firestoreResolve!: (v: boolean) => void
      mockCheckIsAdmin.mockReturnValue(
        new Promise<boolean>((resolve) => { firestoreResolve = resolve }),
      )

      const { getValue } = await setup()

      // auth state change を開始（Firestore は未解決のままにする）
      act(() => { void triggerAuthStateChange({ uid: 'uid-slow', email: 'slow-admin@test.com' }) })

      // タイムアウトを発火（本番 10000ms、エミュレーター 15000ms — 最大値で進める）
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      // タイムアウト時点では isAdmin=false, loading=false（ロード完了）
      expect(getValue().loading).toBe(false)
      expect(getValue().isAdmin).toBe(false)
      expect(sessionStorage.getItem('isAdmin:v1:uid-slow')).toBeNull()

      // その後 Firestore が管理者を確認
      await act(async () => {
        firestoreResolve(true)
        // マイクロタスクキューを flush
        await Promise.resolve()
        await Promise.resolve()
      })

      // isAdmin が true に更新され、次のナビゲーション用にキャッシュされる
      expect(getValue().isAdmin).toBe(true)
      expect(sessionStorage.getItem('isAdmin:v1:uid-slow')).toBe('true')
    })

    it('タイムアウト後に Firestore が false を返しても isAdmin=false のまま、キャッシュなし', async () => {
      vi.useFakeTimers()

      let firestoreResolve!: (v: boolean) => void
      mockCheckIsAdmin.mockReturnValue(
        new Promise<boolean>((resolve) => { firestoreResolve = resolve }),
      )

      const { getValue } = await setup()

      act(() => { void triggerAuthStateChange({ uid: 'uid-notadmin', email: 'notadmin@test.com' }) })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(getValue().loading).toBe(false)
      expect(getValue().isAdmin).toBe(false)

      await act(async () => {
        firestoreResolve(false)
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(getValue().isAdmin).toBe(false)
      expect(sessionStorage.getItem('isAdmin:v1:uid-notadmin')).toBeNull()
    })
  })

  // ── ログアウト ─────────────────────────────────────────────────────────

  describe('ログアウト（user=null）', () => {
    it('isAdmin=false, loading=false になる', async () => {
      const { getValue } = await setup()

      await act(async () => {
        await triggerAuthStateChange(null)
      })

      expect(getValue().loading).toBe(false)
      expect(getValue().isAdmin).toBe(false)
    })
  })
})

// ===========================================================================

describe('isIosSafari — iOS Safari 判定', () => {
  const originalNavigator = global.navigator

  afterEach(() => {
    Object.defineProperty(global, 'navigator', { value: originalNavigator, configurable: true })
  })

  function setUA(ua: string) {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: ua },
      configurable: true,
    })
  }

  it('iPhone Safari を iOS Safari と判定する', () => {
    setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
    expect(isIosSafari()).toBe(true)
  })

  it('iPad Safari を iOS Safari と判定する', () => {
    setUA('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
    expect(isIosSafari()).toBe(true)
  })

  it('iPhone Chrome（CriOS）は iOS Safari と判定しない', () => {
    setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1')
    expect(isIosSafari()).toBe(false)
  })

  it('iPhone Firefox（FxiOS）は iOS Safari と判定しない', () => {
    setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/604.1')
    expect(isIosSafari()).toBe(false)
  })

  it('iPhone Edge（EdgiOS）は iOS Safari と判定しない', () => {
    setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/120.0.0.0 Mobile/15E148 Safari/604.1')
    expect(isIosSafari()).toBe(false)
  })

  it('macOS Safari は iOS Safari と判定しない', () => {
    setUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15')
    expect(isIosSafari()).toBe(false)
  })

  it('Android Chrome は iOS Safari と判定しない', () => {
    setUA('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36')
    expect(isIosSafari()).toBe(false)
  })
})

// ===========================================================================

describe('signIn — iOS Safari ITP 対応（Issue #8）', () => {
  const originalNavigator = global.navigator

  beforeEach(() => {
    mockOnAuthStateChanged.mockReturnValue(vi.fn())
    mockGetRedirectResult.mockResolvedValue(null)
    mockSignInWithPopup.mockResolvedValue({ user: { uid: 'u1', displayName: 'Test', email: 't@test.com', photoURL: null } })
    mockSignInWithRedirect.mockResolvedValue(undefined)
  })

  afterEach(() => {
    Object.defineProperty(global, 'navigator', { value: originalNavigator, configurable: true })
    vi.clearAllMocks()
  })

  function setUA(ua: string) {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: ua },
      configurable: true,
    })
  }

  it('iOS Safari では signInWithRedirect を呼び signInWithPopup を呼ばない', async () => {
    setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')

    const { getValue } = await setup()
    await act(async () => { await getValue().signIn() })

    expect(mockSignInWithRedirect).toHaveBeenCalledOnce()
    expect(mockSignInWithPopup).not.toHaveBeenCalled()
  })

  it('通常ブラウザでは signInWithPopup を呼び signInWithRedirect を呼ばない', async () => {
    setUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    const { getValue } = await setup()
    await act(async () => { await getValue().signIn() })

    expect(mockSignInWithPopup).toHaveBeenCalledOnce()
    expect(mockSignInWithRedirect).not.toHaveBeenCalled()
  })
})
