import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSortable } from '@dnd-kit/sortable'
import { SortableTeamItem } from './SortableTeamItem'
import type { Team } from '@/types'

// ---- dnd-kit モック --------------------------------------------------------
// DndContext なしで単体テスト可能にする。
// disabled=true のとき listeners を undefined にして実装に近い挙動を再現する。

const mockOnPointerDown = vi.fn()

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: vi.fn(({ disabled = false }: { id: string; disabled?: boolean }) => ({
    attributes: disabled ? {} : { role: 'button', tabIndex: 0 },
    listeners: disabled ? undefined : { onPointerDown: mockOnPointerDown },
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
}))

// ---------------------------------------------------------------------------

const mockTeam: Team = {
  id: 'japan',
  name: '日本',
  flag: '🇯🇵',
  iso: 'jp',
  groupId: 'F',
}

/** disabled=false のドラッグ可能アイテムを name で取得するヘルパー */
const getDraggableItem = () =>
  screen.getByRole('button', { name: `${mockTeam.name}（ドラッグして並び替え）` })

describe('SortableTeamItem', () => {
  beforeEach(() => {
    mockOnPointerDown.mockReset()
  })

  // ── 表示 ──────────────────────────────────────────────────────────────────

  describe('表示', () => {
    it('チーム名を表示する', () => {
      render(<SortableTeamItem team={mockTeam} rank={0} />)
      expect(screen.getByText('日本')).toBeInTheDocument()
    })

    it('rank=0 → 🥇、rank=1 → 🥈、rank=2 → 🥉、rank=3 → 4位 のバッジを表示する', () => {
      const badges = ['🥇', '🥈', '🥉', '4位']
      badges.forEach((badge, rank) => {
        const { unmount } = render(<SortableTeamItem team={mockTeam} rank={rank} />)
        expect(screen.getByText(badge)).toBeInTheDocument()
        unmount()
      })
    })

    it('disabled=false のとき、ドラッグハンドルアイコンを表示する', () => {
      render(<SortableTeamItem team={mockTeam} rank={0} />)
      expect(
        screen.getByRole('img', { name: `${mockTeam.name}のドラッグハンドル` }),
      ).toBeInTheDocument()
    })

    it('disabled=true のとき、ドラッグハンドルアイコンを非表示にする', () => {
      render(<SortableTeamItem team={mockTeam} rank={0} disabled />)
      expect(
        screen.queryByRole('img', { name: `${mockTeam.name}のドラッグハンドル` }),
      ).not.toBeInTheDocument()
    })

    it('disabled=false のとき aria-label でドラッグ操作を案内する', () => {
      render(<SortableTeamItem team={mockTeam} rank={0} />)
      expect(getDraggableItem()).toBeInTheDocument()
    })

    it('disabled=true のとき aria-label が付かない', () => {
      render(<SortableTeamItem team={mockTeam} rank={0} disabled />)
      expect(
        screen.queryByRole('button', { name: `${mockTeam.name}（ドラッグして並び替え）` }),
      ).not.toBeInTheDocument()
    })
  })

  // ── pointerdown イベント伝播（バグ修正の回帰防止）────────────────────────

  describe('pointerdown イベント伝播', () => {
    it('disabled=false のとき、pointerdown で dnd-kit の onPointerDown が呼ばれる', () => {
      // 修正前はこのアサーションが失敗していた（PointerSensor が起動しなかった）
      render(<SortableTeamItem team={mockTeam} rank={0} />)
      fireEvent.pointerDown(getDraggableItem())
      expect(mockOnPointerDown).toHaveBeenCalledTimes(1)
    })

    it('disabled=false のとき、pointerdown で長押しフィードバック（isPressing）が開始される', () => {
      render(<SortableTeamItem team={mockTeam} rank={0} />)
      const item = getDraggableItem()

      fireEvent.pointerDown(item)

      // data-pressing 属性で isPressing 状態を検証（Tailwind クラス名に依存しない）
      expect(item).toHaveAttribute('data-pressing', 'true')
    })

    it('disabled=true のとき、pointerdown で dnd-kit のハンドラが呼ばれない', () => {
      render(<SortableTeamItem team={mockTeam} rank={0} disabled />)
      // disabled=true の要素は role="button" を持たないため親 div を対象にする
      fireEvent.pointerDown(screen.getByText('日本').closest('div')!)
      expect(mockOnPointerDown).not.toHaveBeenCalled()
    })

    it('listeners.onPointerDown が未定義でも pointerdown でクラッシュしない', () => {
      // DndContext 外や SSR など listeners が空のケースでも安全であることを保証する
      vi.mocked(useSortable).mockReturnValueOnce({
        attributes: { role: 'button', tabIndex: 0 },
        listeners: {},  // onPointerDown なし
        setNodeRef: vi.fn(),
        transform: null,
        transition: undefined,
        isDragging: false,
      } as unknown as ReturnType<typeof useSortable>)

      render(<SortableTeamItem team={mockTeam} rank={0} />)
      expect(() =>
        fireEvent.pointerDown(getDraggableItem()),
      ).not.toThrow()
    })
  })

  // ── pointerup / pointercancel（isPressing 解除）──────────────────────────

  describe('pointerup / pointercancel で isPressing が解除される', () => {
    it('pointerup で isPressing が解除される', () => {
      render(<SortableTeamItem team={mockTeam} rank={0} />)
      const item = getDraggableItem()

      fireEvent.pointerDown(item)
      expect(item).toHaveAttribute('data-pressing', 'true')

      fireEvent.pointerUp(item)
      expect(item).not.toHaveAttribute('data-pressing')
    })

    it('pointercancel で isPressing が解除される', () => {
      render(<SortableTeamItem team={mockTeam} rank={0} />)
      const item = getDraggableItem()

      fireEvent.pointerDown(item)
      expect(item).toHaveAttribute('data-pressing', 'true')

      fireEvent.pointerCancel(item)
      expect(item).not.toHaveAttribute('data-pressing')
    })
  })

  // ── タイマー管理 ──────────────────────────────────────────────────────────

  describe('タイマー管理', () => {
    it('連打時に前の isPressing タイマーをキャンセルして新しいタイマーを起動する', () => {
      // 検証方法:
      // 1回目 press 開始 → 100ms 後に 2回目 press（前タイマーをキャンセルし新タイマー起動）
      // さらに 100ms 経過時点（1回目タイマーなら 200ms 到達し発火するタイミング）でも
      // data-pressing が true のまま → 1回目タイマーが確実にキャンセルされている証明
      // その後さらに 100ms 経過（2回目タイマーが 200ms 到達）で data-pressing が消える
      vi.useFakeTimers()
      render(<SortableTeamItem team={mockTeam} rank={0} />)
      const item = getDraggableItem()

      fireEvent.pointerDown(item) // タイマー1 開始 (t=0)
      expect(item).toHaveAttribute('data-pressing', 'true')

      act(() => { vi.advanceTimersByTime(100) }) // t=100ms: タイマー1 未発火
      expect(item).toHaveAttribute('data-pressing', 'true')

      fireEvent.pointerDown(item) // タイマー1 キャンセル → タイマー2 開始 (t=100ms)

      act(() => { vi.advanceTimersByTime(100) }) // t=200ms: タイマー1 が生きていれば発火するタイミング
      // タイマー1 がキャンセルされていれば、まだ isPressing のまま
      expect(item).toHaveAttribute('data-pressing', 'true')

      act(() => { vi.advanceTimersByTime(100) }) // t=300ms: タイマー2 が 200ms 到達して発火
      expect(item).not.toHaveAttribute('data-pressing')

      vi.useRealTimers()
    })

    it('アンマウント時に残存タイマーを clearTimeout でキャンセルする', () => {
      // React 18 以降はアンマウント後の setState が例外ではなく警告のみになったため、
      // タイマーが残っていても not.toThrow() は通ってしまう。
      // clearTimeout の呼び出し自体をスパイして、クリーンアップが実行されることを直接検証する。
      vi.useFakeTimers()
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

      const { unmount } = render(<SortableTeamItem team={mockTeam} rank={0} />)
      fireEvent.pointerDown(getDraggableItem()) // タイマー起動

      clearTimeoutSpy.mockClear() // pointerDown 内の clearTimeout 呼び出しをリセット

      unmount() // クリーンアップ useEffect が実行される

      // アンマウント時に clearTimeout が呼ばれていること
      expect(clearTimeoutSpy).toHaveBeenCalled()

      clearTimeoutSpy.mockRestore()
      vi.useRealTimers()
    })
  })
})
