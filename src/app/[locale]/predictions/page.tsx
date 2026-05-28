'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import { getAllPredictions, getPredictions, getUserProfiles } from '@/lib/firestore'
import { GROUPS, TEAMS_BY_GROUP } from '@/data/groups'
import { FlagImage } from '@/components/FlagImage'
import { PitchLoader } from '@/components/PitchLoader'
import { AuthRedirecting } from '@/components/AuthRedirecting'
import { AUTH_REDIRECT_DELAY_MS, REVEAL } from '@/lib/constants'
import type { GroupId, GroupPrediction } from '@/types'

interface UserPredictionRow {
  userId: string
  displayName: string
  prediction: GroupPrediction | null
}

export default function PredictionsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('predictions')
  const tCommon = useTranslations('common')

  const [selectedGroup, setSelectedGroup] = useState<GroupId>('A')
  const [allPredictions, setAllPredictions] = useState<GroupPrediction[]>([])
  const [userRows, setUserRows] = useState<UserPredictionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isRevealed, setIsRevealed] = useState(() => Date.now() >= REVEAL.getTime())

  useEffect(() => {
    const diff = REVEAL.getTime() - Date.now()
    if (diff <= 0) return
    const id = window.setTimeout(() => setIsRevealed(true), diff)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (authLoading || user) return
    const id = window.setTimeout(() => router.replace(`/${locale}`), AUTH_REDIRECT_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [authLoading, user, router, locale])

  useEffect(() => {
    if (authLoading || !user) return

    async function load() {
      try {
        const [allPreds, myPreds] = await Promise.all([
          getAllPredictions().catch(() => [] as GroupPrediction[]),
          getPredictions(user!.uid),
        ])

        const merged = [...allPreds]
        for (const mine of myPreds) {
          const exists = merged.some(
            (p) => p.userId === mine.userId && p.groupId === mine.groupId
          )
          if (!exists) merged.push(mine)
        }

        const predictions = merged
        setAllPredictions(predictions)

        const userIds = [...new Set(predictions.map((p) => p.userId))]
        const profiles = await getUserProfiles(userIds)

        const rows: UserPredictionRow[] = userIds
          .sort((a, b) => {
            if (a === user?.uid) return -1
            if (b === user?.uid) return 1
            const nameA = profiles[a]?.displayName ?? a
            const nameB = profiles[b]?.displayName ?? b
            return nameA.localeCompare(nameB, 'ja')
          })
          .map((uid) => ({
            userId: uid,
            displayName: profiles[uid]?.displayName ?? uid,
            prediction: null,
          }))

        setUserRows(rows)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [authLoading, user])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <PitchLoader label={tCommon('loading')} />
      </div>
    )
  }

  if (!user) {
    return <AuthRedirecting label={tCommon('authRedirecting')} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <PitchLoader label={t('loadingAggregating')} />
      </div>
    )
  }

  if (!isRevealed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 text-center">
          {t('hiddenUntilDeadline')}
        </p>
      </div>
    )
  }

  const teams = TEAMS_BY_GROUP[selectedGroup]

  const predByUser: Record<string, GroupPrediction> = {}
  for (const p of allPredictions) {
    if (p.groupId === selectedGroup) predByUser[p.userId] = p
  }

  const rows = userRows.map((row) => ({
    ...row,
    prediction: predByUser[row.userId] ?? null,
  }))

  const submittedCount = rows.filter((r) => r.prediction !== null).length

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{t('title')}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* グループ選択タブ */}
      <div className="flex flex-wrap gap-2">
        {GROUPS.map((g) => {
          const count = allPredictions.filter((p) => p.groupId === g).length
          return (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                selectedGroup === g
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {g}
              <span
                className={`ml-1.5 text-xs ${
                  selectedGroup === g ? 'text-blue-100' : 'text-gray-400'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* グループ情報 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-700">{t('groupLabel', { group: selectedGroup })}</h2>
          <div className="flex gap-1">
            {teams.map((t_) => (
              <FlagImage key={t_.id} iso={t_.iso} name={t_.name} size={20} />
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-500">
          {t('submittedCount', { submitted: submittedCount, total: userRows.length })}
        </p>
      </div>

      {/* 予想テーブル */}
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500 w-32">{t('userColumn')}</th>
              {[1, 2, 3, 4].map((rank) => (
                <th key={rank} className="px-3 py-3 text-center font-medium text-gray-500">
                  {locale === 'en' ? `#${rank}` : `${rank}位`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  {t('noPredictions')}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.userId}
                  className={row.userId === user?.uid ? 'bg-blue-50' : 'hover:bg-gray-50'}
                >
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                    {row.displayName}
                    {row.userId === user?.uid && (
                      <span className="ml-1.5 text-xs text-blue-500">{t('myLabel')}</span>
                    )}
                  </td>
                  {row.prediction ? (
                    row.prediction.ranking.map((teamId, i) => {
                      const team = teams.find((t_) => t_.id === teamId)
                      return (
                        <td key={i} className="px-3 py-3 text-center">
                          {team ? (
                            <span className="inline-flex items-center gap-1">
                              <FlagImage iso={team.iso} name={team.name} size={20} />
                              <span className="hidden sm:inline text-gray-700">{team.name}</span>
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      )
                    })
                  ) : (
                    <td colSpan={4} className="px-3 py-3 text-center text-gray-300">
                      {t('unpredicted')}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* チーム凡例 */}
      <div className="rounded-xl border bg-gray-50 px-4 py-3">
        <p className="text-xs font-medium text-gray-500 mb-2">{t('teamsLegend', { group: selectedGroup })}</p>
        <div className="flex flex-wrap gap-3">
          {teams.map((t_) => (
            <span key={t_.id} className="inline-flex items-center gap-1 text-sm text-gray-700">
              <FlagImage iso={t_.iso} name={t_.name} size={20} />
              {t_.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
