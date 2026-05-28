/**
 * PredictionsContext のユニットテスト
 *
 * Issue #92: 予想データをアプリ全体で共有するコンテキストの動作を検証する。
 */
import React from 'react'
import { render, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PredictionsProvider, usePredictionsContext } from './PredictionsContext'
import type { GroupPrediction } from '@/types'

// ---- firestore モック --------------------------------------------------------

const mockGetPredictions = vi.fn()
const mockSavePrediction = vi.fn()

vi.mock('@/lib/firestore', () => ({
  getPredictions: (...args: unknown[]) => mockGetPredictions(...args),
  savePrediction: (...args: unknown[]) => mockSavePrediction(...args),
}))

// ---- AuthContext モック ------------------------------------------------------

const mockUseAuthContext = vi.fn()

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => mockUseAuthContext(),
}))

// ---- テスト用ヘルパー -------------------------------------------------------

/** usePredictionsContext の値を描画して取り出すためのコンポーネント */
function PredictionsConsumer({
  onValue,
}: {
  onValue: (v: ReturnType<typeof usePredictionsContext>) => void
}) {
  const value = usePredictionsContext()
  onValue(value)
  return null
}

/** PredictionsProvider をレンダリングし、最新の context 値と rerender を取得するためのセットアップ */
async function setup() {
  let capturedValue: ReturnType<typeof usePredictionsContext> | null = null
  const onValue = (v: ReturnType<typeof usePredictionsContext>) => {
    capturedValue = v
  }
  let rerenderFn!: (ui: React.ReactElement) => void
  await act(async () => {
    const result = render(
      <PredictionsProvider>
        <PredictionsConsumer onValue={onValue} />
      </PredictionsProvider>
    )
    rerenderFn = result.rerender
  })
  const rerender = async () => {
    await act(async () => {
      rerenderFn(
        <PredictionsProvider>
          <PredictionsConsumer onValue={onValue} />
        </PredictionsProvider>
      )
    })
  }
  return { getValue: () => capturedValue!, rerender }
}

// ---- 共通セットアップ -------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  mockSavePrediction.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

// ===========================================================================

describe('PredictionsContext', () => {
  // ── ユーザーログイン後に予想を取得する ─────────────────────────────────

  describe('ユーザーログイン後に予想を取得する', () => {
    it('getPredictions が呼ばれ、predictions と loading が正しく更新される', async () => {
      const mockPredictions: GroupPrediction[] = [
        {
          userId: 'user-1',
          groupId: 'A',
          ranking: ['team1', 'team2', 'team3', 'team4'],
          updatedAt: new Date('2026-01-01'),
        },
      ]
      mockGetPredictions.mockResolvedValue(mockPredictions)
      mockUseAuthContext.mockReturnValue({
        user: { uid: 'user-1' },
        loading: false,
      })

      const { getValue } = await setup()

      await waitFor(() => {
        expect(getValue().loading).toBe(false)
      })

      expect(mockGetPredictions).toHaveBeenCalledWith('user-1')
      expect(getValue().predictions).toEqual(mockPredictions)
    })
  })

  // ── 未ログイン時は空の predictions を返す ──────────────────────────────

  describe('未ログイン時は空の predictions を返す', () => {
    it('getPredictions が呼ばれず predictions=[], loading=false になる', async () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        loading: false,
      })

      const { getValue } = await setup()

      await waitFor(() => {
        expect(getValue().loading).toBe(false)
      })

      expect(mockGetPredictions).not.toHaveBeenCalled()
      expect(getValue().predictions).toEqual([])
    })
  })

  // ── authLoading 中は getPredictions を呼ばない ─────────────────────────

  describe('authLoading 中は getPredictions を呼ばない', () => {
    it('authLoading=true のときは getPredictions が呼ばれない', async () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        loading: true,
      })

      await setup()

      expect(mockGetPredictions).not.toHaveBeenCalled()
    })
  })

  // ── savePrediction が Firestore を呼び出し、楽観的更新する ──────────────

  describe('savePrediction が Firestore を呼び出し、ローカルキャッシュを楽観的更新する', () => {
    it('savePrediction 呼び出し後、predictions が即座に更新され firestoreSavePrediction が正しい引数で呼ばれる', async () => {
      const initialPredictions: GroupPrediction[] = [
        {
          userId: 'user-2',
          groupId: 'B',
          ranking: ['team5', 'team6', 'team7', 'team8'],
          updatedAt: new Date('2026-01-01'),
        },
      ]
      mockGetPredictions.mockResolvedValue(initialPredictions)
      mockUseAuthContext.mockReturnValue({
        user: { uid: 'user-2' },
        loading: false,
      })

      const { getValue } = await setup()

      await waitFor(() => {
        expect(getValue().loading).toBe(false)
      })

      // グループ A の新しい予想を保存
      const newRanking = ['teamX', 'teamY', 'teamZ', 'teamW']
      await act(async () => {
        await getValue().savePrediction('A', newRanking)
      })

      // firestoreSavePrediction が正しい引数で呼ばれたことを確認
      expect(mockSavePrediction).toHaveBeenCalledWith('user-2', 'A', newRanking)

      // ローカルキャッシュが楽観的更新されていることを確認
      const updatedPredictions = getValue().predictions
      const groupAPrediction = updatedPredictions.find((p) => p.groupId === 'A')
      expect(groupAPrediction).toBeDefined()
      expect(groupAPrediction?.ranking).toEqual(newRanking)
      expect(groupAPrediction?.userId).toBe('user-2')

      // 既存のグループ B の予想は残っていることを確認
      const groupBPrediction = updatedPredictions.find((p) => p.groupId === 'B')
      expect(groupBPrediction).toEqual(initialPredictions[0])
    })

    it('同じグループの予想を上書き保存すると、古いエントリが削除されて新しいものに置き換わる', async () => {
      const initialPredictions: GroupPrediction[] = [
        {
          userId: 'user-3',
          groupId: 'C',
          ranking: ['team1', 'team2', 'team3', 'team4'],
          updatedAt: new Date('2026-01-01'),
        },
      ]
      mockGetPredictions.mockResolvedValue(initialPredictions)
      mockUseAuthContext.mockReturnValue({
        user: { uid: 'user-3' },
        loading: false,
      })

      const { getValue } = await setup()

      await waitFor(() => {
        expect(getValue().loading).toBe(false)
      })

      const newRanking = ['team4', 'team3', 'team2', 'team1']
      await act(async () => {
        await getValue().savePrediction('C', newRanking)
      })

      // グループ C の予想が1件だけで、新しい ranking になっていることを確認
      const groupCPredictions = getValue().predictions.filter((p) => p.groupId === 'C')
      expect(groupCPredictions).toHaveLength(1)
      expect(groupCPredictions[0].ranking).toEqual(newRanking)
    })
  })

  // ── usePredictionsContext が Provider 外で使われるとエラーを投げる ────────

  describe('usePredictionsContext が Provider 外で使われるとエラーを投げる', () => {
    it('Provider 外で使うと "usePredictionsContext must be used within PredictionsProvider" エラーを投げる', () => {
      function ComponentWithoutProvider() {
        usePredictionsContext()
        return null
      }

      // コンソールエラーを抑制
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<ComponentWithoutProvider />)
      }).toThrow('usePredictionsContext must be used within PredictionsProvider')

      consoleSpy.mockRestore()
    })
  })

  // ── ユーザー変更時（ログアウト→ログイン）に predictions をリセットして再取得する ──

  describe('ユーザー変更時（ログアウト→ログイン）に predictions をリセットして再取得する', () => {
    it('同一プロバイダーインスタンスでユーザーが変わると getPredictions が新しい userId で再呼び出しされる', async () => {
      const user1Predictions: GroupPrediction[] = [
        {
          userId: 'user-4',
          groupId: 'D',
          ranking: ['t1', 't2', 't3', 't4'],
          updatedAt: new Date('2026-01-01'),
        },
      ]
      const user2Predictions: GroupPrediction[] = [
        {
          userId: 'user-5',
          groupId: 'E',
          ranking: ['t5', 't6', 't7', 't8'],
          updatedAt: new Date('2026-01-02'),
        },
      ]

      // 最初はユーザー4でログイン中
      mockGetPredictions.mockResolvedValueOnce(user1Predictions)
      mockUseAuthContext.mockReturnValue({
        user: { uid: 'user-4' },
        loading: false,
      })

      const { getValue, rerender } = await setup()

      await waitFor(() => {
        expect(getValue().loading).toBe(false)
      })
      expect(getValue().predictions).toEqual(user1Predictions)

      // 同一プロバイダーインスタンスのまま useAuthContext の戻り値を変えてユーザー切り替えをシミュレート
      mockGetPredictions.mockResolvedValueOnce(user2Predictions)
      mockUseAuthContext.mockReturnValue({
        user: { uid: 'user-5' },
        loading: false,
      })
      await rerender()

      // getPredictions が2回呼ばれていることを確認（user-4 と user-5）
      expect(mockGetPredictions).toHaveBeenCalledWith('user-4')
      expect(mockGetPredictions).toHaveBeenCalledWith('user-5')

      // user-5 の予想が反映されている
      await waitFor(() => {
        expect(getValue().predictions).toEqual(user2Predictions)
      })
    })

    it('同一プロバイダーインスタンスでログアウトすると predictions が空になる', async () => {
      const userPredictions: GroupPrediction[] = [
        {
          userId: 'user-6',
          groupId: 'F',
          ranking: ['t1', 't2', 't3', 't4'],
          updatedAt: new Date('2026-01-01'),
        },
      ]
      mockGetPredictions.mockResolvedValue(userPredictions)
      mockUseAuthContext.mockReturnValue({
        user: { uid: 'user-6' },
        loading: false,
      })

      const { getValue, rerender } = await setup()

      await waitFor(() => {
        expect(getValue().loading).toBe(false)
      })
      expect(getValue().predictions).toEqual(userPredictions)

      // 同一プロバイダーインスタンスのままログアウトをシミュレート
      mockUseAuthContext.mockReturnValue({
        user: null,
        loading: false,
      })
      await rerender()

      await waitFor(() => {
        expect(getValue().predictions).toEqual([])
      })
      expect(getValue().loading).toBe(false)
    })
  })
})
