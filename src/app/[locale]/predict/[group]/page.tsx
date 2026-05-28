'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { useAuth } from '@/hooks/useAuth'
import { usePredictions } from '@/hooks/usePredictions'
import { SortableTeamItem } from '@/components/SortableTeamItem'
import { Toast } from '@/components/Toast'
import { PitchLoader } from '@/components/PitchLoader'
import { AuthRedirecting } from '@/components/AuthRedirecting'
import { TEAMS_BY_GROUP, GROUPS } from '@/data/groups'
import { AUTH_REDIRECT_DELAY_MS } from '@/lib/constants'
import type { GroupId } from '@/types'

// 締切: 2026-06-11 23:59 JST
const DEADLINE = new Date('2026-06-11T14:59:00Z')

export default function PredictPage() {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const groupId = (params.group as string).toUpperCase() as GroupId
  const t = useTranslations('predict')
  const tCommon = useTranslations('common')

  const { user, loading: authLoading } = useAuth()
  const { predictions, savePrediction, loading } = usePredictions()

  const isValidGroup = GROUPS.includes(groupId)
  const teams = isValidGroup ? TEAMS_BY_GROUP[groupId] : []

  const [ranking, setRanking] = useState<string[]>(teams.map((t) => t.id))
  const [initialRanking, setInitialRanking] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [hasSaved, setHasSaved] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const isDeadlinePassed = new Date() >= DEADLINE
  const isDirty = ranking.join(',') !== initialRanking.join(',')

  useEffect(() => {
    if (loading) return
    const existing = predictions.find((p) => p.groupId === groupId)
    if (existing) {
      setRanking(existing.ranking)
      setInitialRanking(existing.ranking)
      setHasSaved(true)
    } else {
      setInitialRanking(teams.map((t) => t.id))
    }
  }, [predictions, groupId, loading, teams])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  useEffect(() => {
    if (authLoading || user) return
    const id = window.setTimeout(() => router.replace(`/${locale}`), AUTH_REDIRECT_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [authLoading, user, router, locale])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setRanking((prev) => {
        const oldIndex = prev.indexOf(active.id as string)
        const newIndex = prev.indexOf(over.id as string)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  const handleSave = async () => {
    if (!user || isDeadlinePassed) return
    setSaving(true)
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 10000)
      )
      await Promise.race([savePrediction(groupId, ranking), timeout])
      setSaving(false)
      router.push(`/${locale}`)
    } catch (err) {
      const isTimeout = err instanceof Error && err.message === 'timeout'
      setToast({
        message: isTimeout
          ? (locale === 'en'
            ? 'Network error: check your connection and try again.'
            : 'ネットワークエラー: 接続を確認して再度お試しください。')
          : (locale === 'en' ? 'Failed to save. Please try again.' : '保存に失敗しました。再度お試しください。'),
        type: 'error',
      })
      setSaving(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <PitchLoader label={t('loadingAuth')} />
      </div>
    )
  }

  if (!user) {
    return <AuthRedirecting label={tCommon('authRedirecting')} />
  }

  if (!isValidGroup) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-red-500">{t('invalidGroup', { group: String(params.group) })}</p>
      </div>
    )
  }

  const orderedTeams = ranking
    .map((id) => teams.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined)

  const saveLabel = saving
    ? t('saving')
    : !hasSaved && !isDirty
      ? t('saveDefault')
      : t('saveButton')

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <button
          onClick={() => {
            if (isDirty && !window.confirm(t('confirmLeave'))) return
            router.back()
          }}
          className="text-sm text-blue-600 hover:underline mb-2"
        >
          {t('backToList')}
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{t('groupTitle', { group: groupId })}</h1>
        {isDeadlinePassed ? (
          <p className="text-sm text-orange-600 mt-1 font-medium">{t('deadlinePassed')}</p>
        ) : (
          <p className="text-sm text-gray-500 mt-1">
            {t('dragHint')}
          </p>
        )}
      </div>

      {loading ? (
        <PitchLoader inline label={t('loadingPredictions')} />
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={ranking} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {orderedTeams.map((team, index) => (
                  <SortableTeamItem
                    key={team.id}
                    team={team}
                    rank={index}
                    disabled={isDeadlinePassed}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {!hasSaved && !loading && !isDeadlinePassed && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {t('firstSaveHint')}
            </p>
          )}
        </>
      )}

      {!isDeadlinePassed && (
        <div className="sticky bottom-4 space-y-1">
          {isDirty && hasSaved && (
            <p className="text-center text-xs text-blue-600 font-medium">{t('unsavedWarning')}</p>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl py-3 text-white font-semibold transition-colors shadow-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveLabel}
          </button>
        </div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
