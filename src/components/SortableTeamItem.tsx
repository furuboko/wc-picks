'use client'

import { useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FlagImage } from '@/components/FlagImage'
import type { Team } from '@/types'

/** TouchSensorのactivationConstraint.delayと合わせる */
const LONG_PRESS_DELAY_MS = 200

const RANK_BADGES = ['🥇', '🥈', '🥉', '4位']

/**
 * 管理者向け突破トグルのプロパティ。
 * onToggleAdvancing を省略すると固定表示（ロック）になる。
 * 1位・2位は常に突破確定のためロック表示、3位のみトグル可能。
 */
interface AdvancingProps {
  isAdvancing: boolean
  /** 省略時はトグル不可の固定表示 */
  onToggleAdvancing?: () => void
}

interface SortableTeamItemProps {
  team: Team
  rank: number
  disabled?: boolean
  /** 管理者向け突破トグル。未指定時はトグル非表示 */
  advancing?: AdvancingProps
}

export function SortableTeamItem({
  team,
  rank,
  disabled = false,
  advancing,
}: SortableTeamItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: team.id,
    disabled,
  })

  // ドラッグ確定時に触覚フィードバック（false→true の立ち上がりのみ）
  const wasDragging = useRef(false)
  useEffect(() => {
    if (isDragging && !wasDragging.current) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10)
      }
    }
    wasDragging.current = isDragging
  }, [isDragging])

  // 長押し認識中（200ms待機中）の視覚フィードバック用フラグ
  const [isPressing, setIsPressing] = useState(false)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handlePressStart = () => {
    // 連打時に前のタイマーが残らないよう先にキャンセルする
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current)
    pressTimerRef.current = setTimeout(() => {
      setIsPressing(false)
    }, LONG_PRESS_DELAY_MS)
    setIsPressing(true)
  }

  const handlePressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
    setIsPressing(false)
  }

  // ドラッグ確定後はisPressing不要なので解除
  useEffect(() => {
    if (isDragging) setIsPressing(false)
  }, [isDragging])

  // アンマウント時に残存タイマーをクリアして setState 漏れを防ぐ
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current)
    }
  }, [])

  /**
   * dnd-kit の PointerSensor は listeners.onPointerDown でドラッグを起動する。
   * onPointerDown を後から上書きすると PointerSensor が起動しなくなるため、
   * 長押しフィードバック用ハンドラと dnd-kit ハンドラを合成して渡す。
   * 型は SyntheticListenerMap の値型 (Function) に合わせる。
   */
  const handlePointerDown = !disabled
    ? (e: React.PointerEvent) => {
        handlePressStart()
        ;(listeners?.onPointerDown as Function)?.(e)
      }
    : undefined
  const handlePointerUp = !disabled ? handlePressEnd : undefined
  const handlePointerCancel = !disabled ? handlePressEnd : undefined

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: disabled ? undefined : 'none' as const,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!disabled ? { ...attributes, ...listeners } : {})}
      aria-label={!disabled ? `${team.name}（ドラッグして並び替え）` : undefined}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      data-pressing={(!disabled && isPressing) || undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-white px-4 py-3 select-none',
        !disabled && 'cursor-grab active:cursor-grabbing',
        isDragging
          ? 'shadow-2xl ring-2 ring-blue-400 opacity-90 z-50'
          : isPressing
            ? 'shadow-md ring-1 ring-blue-200'
            : 'shadow-sm',
        disabled && 'opacity-60'
      )}
    >
      <span className="w-8 text-lg text-center" aria-label={`${rank + 1}位`}>
        {RANK_BADGES[rank] ?? `${rank + 1}位`}
      </span>
      <FlagImage iso={team.iso} name={team.name} size={24} />
      <span className="flex-1 font-medium text-gray-800">{team.name}</span>
      {advancing && (
        advancing.onToggleAdvancing ? (
          /* 3位: トグル可能ボタン */
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              advancing.onToggleAdvancing?.()
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              'min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded text-xs font-semibold transition-colors',
              advancing.isAdvancing
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            )}
            aria-label={`${team.name}のR32突破を${advancing.isAdvancing ? 'オフ' : 'オン'}にする`}
            aria-pressed={advancing.isAdvancing}
          >
            <span className="text-sm leading-none">{advancing.isAdvancing ? '✓' : '+'}</span>
            <span className="text-[10px] leading-none">突破</span>
          </button>
        ) : (
          /* 1位・2位: 突破確定の固定バッジ（非インタラクティブ） */
          <div
            className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded text-xs font-semibold bg-green-100 text-green-700"
            aria-label={`${team.name}はR32突破確定`}
          >
            <span className="text-sm leading-none">✓</span>
            <span className="text-[10px] leading-none">確定</span>
          </div>
        )
      )}
      {!disabled && (
        <div
          role="img"
          aria-label={`${team.name}のドラッグハンドル`}
          className={cn(
            'min-w-[44px] min-h-[44px] flex items-center justify-center rounded transition-colors',
            isDragging
              ? 'bg-blue-100 text-blue-600'
              : isPressing
                ? 'bg-blue-50 text-blue-400'
                : 'bg-gray-100 text-gray-500'
          )}
        >
          <GripVertical size={22} strokeWidth={2.5} aria-hidden="true" />
        </div>
      )}
    </div>
  )
}
