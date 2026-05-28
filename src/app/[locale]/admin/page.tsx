'use client'

import { useState, useEffect, useCallback } from 'react'
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
import {
  saveGroupResult,
  getAllowlistEntries,
  addToAllowlist,
  removeFromAllowlist,
  getScoringPattern,
  setScoringPattern,
  type AllowlistEntry,
} from '@/lib/firestore'
import { SCORING_PATTERNS, DEADLINE } from '@/lib/constants'
import type { ScoringPattern } from '@/lib/constants'
import { GROUPS, TEAMS_BY_GROUP } from '@/data/groups'
import { SortableTeamItem } from '@/components/SortableTeamItem'
import { Toast } from '@/components/Toast'
import { PitchLoader } from '@/components/PitchLoader'
import type { GroupId } from '@/types'

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('admin')

  // グループ結果
  const [selectedGroup, setSelectedGroup] = useState<GroupId>('A')
  const [ranking, setRanking] = useState<string[]>(
    TEAMS_BY_GROUP['A'].map((t) => t.id)
  )
  const [thirdAdvancing, setThirdAdvancing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // 採点パターン
  const [scoringPattern, setScoringPatternState] = useState<ScoringPattern>('classic')
  const [patternSaving, setPatternSaving] = useState(false)
  const [isDeadlinePassed, setIsDeadlinePassed] = useState(() => Date.now() >= DEADLINE.getTime())

  useEffect(() => {
    const diff = DEADLINE.getTime() - Date.now()
    if (diff <= 0) return
    const id = window.setTimeout(() => setIsDeadlinePassed(true), diff)
    return () => window.clearTimeout(id)
  }, [])

  // ユーザー管理
  const [allowlist, setAllowlist] = useState<AllowlistEntry[]>([])
  const [allowlistLoading, setAllowlistLoading] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user')
  const [addingUser, setAddingUser] = useState(false)
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  )

  const loadAllowlist = useCallback(async () => {
    setAllowlistLoading(true)
    try {
      const entries = await getAllowlistEntries()
      entries.sort((a, b) => a.email.localeCompare(b.email))
      setAllowlist(entries)
    } finally {
      setAllowlistLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace(`/${locale}`)
    }
  }, [loading, user, isAdmin, router, locale])

  useEffect(() => {
    if (!loading && user && isAdmin) {
      loadAllowlist()
      getScoringPattern().then(setScoringPatternState).catch(() => {})
    }
  }, [loading, user, isAdmin, loadAllowlist])

  const handleSavePattern = async () => {
    setPatternSaving(true)
    try {
      await setScoringPattern(scoringPattern)
      setToast({ message: t('toastPatternSaved'), type: 'success' })
    } catch {
      setToast({ message: t('toastPatternFailed'), type: 'error' })
    } finally {
      setPatternSaving(false)
    }
  }

  const handleAddUser = async () => {
    const email = newEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      setToast({ message: t('toastInvalidEmail'), type: 'error' })
      return
    }
    setAddingUser(true)
    try {
      await addToAllowlist(email, newRole)
      setToast({ message: t('toastAdded', { email }), type: 'success' })
      setNewEmail('')
      await loadAllowlist()
    } catch {
      setToast({ message: t('toastAddFailed'), type: 'error' })
    } finally {
      setAddingUser(false)
    }
  }

  const handleRemoveUser = async (email: string) => {
    if (!window.confirm(t('confirmRemove', { email }))) return
    setRemovingEmail(email)
    try {
      await removeFromAllowlist(email)
      setToast({ message: t('toastRemoved', { email }), type: 'success' })
      await loadAllowlist()
    } catch {
      setToast({ message: t('toastRemoveFailed'), type: 'error' })
    } finally {
      setRemovingEmail(null)
    }
  }

  const handleGroupChange = (g: GroupId) => {
    setSelectedGroup(g)
    setRanking(TEAMS_BY_GROUP[g].map((t) => t.id))
    setThirdAdvancing(false)
  }

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
    setSaving(true)
    try {
      await saveGroupResult(selectedGroup, ranking, advancingTeams)
      setToast({ message: t('toastSaved'), type: 'success' })
    } catch {
      setToast({ message: t('toastSaveFailed'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <PitchLoader />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  const teams = TEAMS_BY_GROUP[selectedGroup]
  const orderedTeams = ranking
    .map((id) => teams.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined)

  const advancingTeams = [
    ranking[0],
    ranking[1],
    ...(thirdAdvancing ? [ranking[2]] : []),
  ]

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">{t('title')}</h1>

      {/* グループ選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('groupLabel')}</label>
        <div className="flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => handleGroupChange(g)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedGroup === g
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* 確定順位 + 突破トグル（DnD） */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-gray-700">
            {t('finalStandings', { group: selectedGroup })}
          </h2>
          <p className="text-xs text-gray-400">
            {t('advancingCount', { count: advancingTeams.length })}
          </p>
        </div>
        <p className="text-xs text-gray-500">
          {t('dragHint')}<strong>{t('thirdHint')}</strong>
        </p>

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
                  advancing={
                    index === 0 || index === 1
                      ? { isAdvancing: true }
                      : index === 2
                        ? { isAdvancing: thirdAdvancing, onToggleAdvancing: () => setThirdAdvancing((p) => !p) }
                        : undefined
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? t('saving') : t('saveResults')}
      </button>

      {/* 採点パターン */}
      <div className="border-t pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">{t('scoringPattern')}</h2>
          {isDeadlinePassed && (
            <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
              {t('deadlineLocked')}
            </span>
          )}
        </div>
        <div className="space-y-2">
          {(Object.entries(SCORING_PATTERNS) as [ScoringPattern, typeof SCORING_PATTERNS[ScoringPattern]][]).map(([key, meta]) => (
            <label
              key={key}
              className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                scoringPattern === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              } ${isDeadlinePassed ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name="scoringPattern"
                value={key}
                checked={scoringPattern === key}
                disabled={isDeadlinePassed}
                onChange={() => setScoringPatternState(key)}
                className="mt-0.5 accent-blue-600"
              />
              <div>
                <p className="font-semibold text-gray-800 text-sm">{meta.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
              </div>
            </label>
          ))}
        </div>
        <button
          onClick={handleSavePattern}
          disabled={patternSaving || isDeadlinePassed}
          className="w-full rounded-xl bg-green-600 py-2.5 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {patternSaving ? t('savingPattern') : t('savePattern')}
        </button>
      </div>

      {/* 管理者管理 */}
      <div className="border-t pt-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-800">{t('adminManagement')}</h2>

        {/* 追加フォーム */}
        <div className="bg-gray-50 rounded-xl border p-4 space-y-3">
          <p className="text-sm text-gray-600">{t('adminAddDesc')}</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
              placeholder={t('emailPlaceholder')}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="user">{t('roleUser')}</option>
              <option value="admin">{t('roleAdmin')}</option>
            </select>
          </div>
          <button
            onClick={handleAddUser}
            disabled={addingUser || !newEmail}
            className="w-full rounded-lg bg-blue-600 py-2 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {addingUser ? t('adding') : t('addButton')}
          </button>
        </div>

        {/* 登録済み一覧 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">
              {t('registered', { count: allowlist.length })}
            </p>
            <button
              onClick={loadAllowlist}
              className="text-xs text-blue-600 hover:underline"
            >
              {t('refresh')}
            </button>
          </div>
          {allowlistLoading ? (
            <PitchLoader inline label={t('loading')} />
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {allowlist.map((entry) => (
                <div
                  key={entry.email}
                  className="flex items-center justify-between rounded-lg border bg-white px-3 py-2"
                >
                  <div>
                    <span className="text-sm text-gray-800">{entry.email}</span>
                    <span className={`ml-2 text-xs rounded-full px-1.5 py-0.5 ${
                      entry.role === 'admin'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {entry.role === 'admin' ? t('roleAdmin') : t('roleUser')}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveUser(entry.email)}
                    disabled={removingEmail === entry.email || entry.email === user?.email}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {removingEmail === entry.email ? t('removing') : t('remove')}
                  </button>
                </div>
              ))}
              {allowlist.length === 0 && (
                <p className="text-sm text-gray-400">{t('noRegistered')}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
