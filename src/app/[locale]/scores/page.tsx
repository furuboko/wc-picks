'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import { getAllPredictions, getPredictions, getGroupResult, getUserProfiles, getScoringPattern } from '@/lib/firestore'
import { scoreGroup } from '@/lib/scoring'
import { ScoreDetail } from '@/components/ScoreDetail'
import { PitchLoader } from '@/components/PitchLoader'
import { AuthRedirecting } from '@/components/AuthRedirecting'
import { ChevronDown } from 'lucide-react'
import { GROUPS } from '@/data/groups'
import { AUTH_REDIRECT_DELAY_MS, REVEAL, SCORING_PATTERNS } from '@/lib/constants'
import type { ScoringPattern } from '@/lib/constants'
import type { GroupId, GroupPrediction, GroupResult, GroupScore } from '@/types'

function ScoringRules({ pattern, t }: { pattern: ScoringPattern; t: ReturnType<typeof useTranslations<'scores'>> }) {
  if (pattern === 'classic') {
    return (
      <>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 font-bold text-xs">①</span>
          <div>
            <p className="font-semibold text-yellow-700">{t('classic.perfectTitle')}</p>
            <p className="text-gray-500 text-xs mt-0.5">{t('classic.perfectDesc')}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold text-xs">②</span>
          <div>
            <p className="font-semibold text-green-700">{t('classic.advancingTitle')}</p>
            <p className="text-gray-500 text-xs mt-0.5">{t('classic.advancingDesc')}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 font-bold text-xs">③</span>
          <div>
            <p className="font-semibold text-red-700">{t('classic.penaltyTitle')}</p>
            <p className="text-gray-500 text-xs mt-0.5">{t('classic.penaltyDesc')}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 border-t pt-2">{t('classic.noneDesc')}</p>
      </>
    )
  }
  if (pattern === 'no-penalty') {
    return (
      <>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 font-bold text-xs">①</span>
          <div>
            <p className="font-semibold text-yellow-700">{t('no-penalty.perfectTitle')}</p>
            <p className="text-gray-500 text-xs mt-0.5">{t('no-penalty.perfectDesc')}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold text-xs">②</span>
          <div>
            <p className="font-semibold text-green-700">{t('no-penalty.advancingTitle')}</p>
            <p className="text-gray-500 text-xs mt-0.5">{t('no-penalty.advancingDesc')}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 border-t pt-2">{t('no-penalty.noneDesc')}</p>
      </>
    )
  }
  if (pattern === 'per-position') {
    return (
      <>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 font-bold text-xs">①</span>
          <div>
            <p className="font-semibold text-yellow-700">{t('per-position.perfectTitle')}</p>
            <p className="text-gray-500 text-xs mt-0.5">{t('per-position.perfectDesc')}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">②</span>
          <div>
            <p className="font-semibold text-blue-700">{t('per-position.partialTitle')}</p>
            <p className="text-gray-500 text-xs mt-0.5">{t('per-position.partialDesc')}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 border-t pt-2">{t('per-position.noneDesc')}</p>
      </>
    )
  }
  // top-heavy
  return (
    <>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 font-bold text-xs">①</span>
        <div>
          <p className="font-semibold text-yellow-700">{t('top-heavy.firstTitle')}</p>
          <p className="text-gray-500 text-xs mt-0.5">{t('top-heavy.firstDesc')}</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold text-xs">②</span>
        <div>
          <p className="font-semibold text-green-700">{t('top-heavy.secondTitle')}</p>
          <p className="text-gray-500 text-xs mt-0.5">{t('top-heavy.secondDesc')}</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">③</span>
        <div>
          <p className="font-semibold text-blue-700">{t('top-heavy.thirdTitle')}</p>
          <p className="text-gray-500 text-xs mt-0.5">{t('top-heavy.thirdDesc')}</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 border-t pt-2">{t('top-heavy.noneDesc')}</p>
    </>
  )
}

interface UserScoreData {
  userId: string
  displayName: string
  predictions: GroupPrediction[]
  groupScores: Partial<Record<GroupId, GroupScore>>
  total: number
}

const HINT_STORAGE_KEY = 'scoreboard-row-hint-dismissed'

export default function ScoresPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('scores')
  const tCommon = useTranslations('common')

  const [userScores, setUserScores] = useState<UserScoreData[]>([])
  const [results, setResults] = useState<Partial<Record<GroupId, GroupResult>>>({})
  const [scoringPattern, setScoringPattern] = useState<ScoringPattern>('classic')
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [showHint, setShowHint] = useState<boolean>(
    () => typeof window !== 'undefined' && !localStorage.getItem(HINT_STORAGE_KEY)
  )

  const SCORE_LABELS: Record<GroupScore['reason'], string> = {
    perfect: t('scoreLabels.perfect'),
    advancing: t('scoreLabels.advancing'),
    partial: t('scoreLabels.partial'),
    penalty: t('scoreLabels.penalty'),
    none: t('scoreLabels.none'),
  }

  const dismissHint = () => {
    setShowHint(false)
    localStorage.setItem(HINT_STORAGE_KEY, '1')
  }

  const handleRowClick = (userId: string) => {
    if (showHint) dismissHint()
    setExpandedRow(expandedRow === userId ? null : userId)
  }

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
        const [allPredictions, myPredictions, pattern, ...groupResults] = await Promise.all([
          getAllPredictions().catch(() => [] as GroupPrediction[]),
          getPredictions(user!.uid),
          getScoringPattern().catch(() => 'classic' as ScoringPattern),
          ...GROUPS.map((g) => getGroupResult(g)),
        ])
        setScoringPattern(pattern)

        const merged = [...allPredictions]
        for (const mine of myPredictions) {
          const exists = merged.some(
            (p) => p.userId === mine.userId && p.groupId === mine.groupId
          )
          if (!exists) merged.push(mine)
        }

        const resultsMap: Partial<Record<GroupId, GroupResult>> = {}
        GROUPS.forEach((g, i) => {
          const r = groupResults[i]
          if (r) resultsMap[g] = r
        })
        setResults(resultsMap)

        const byUser: Record<string, GroupPrediction[]> = {}
        for (const p of merged) {
          if (!byUser[p.userId]) byUser[p.userId] = []
          byUser[p.userId].push(p)
        }

        const userIds = Object.keys(byUser)
        const profiles = await getUserProfiles(userIds).catch(() => ({} as Record<string, { uid: string; displayName: string; photoURL: string | null }>))

        const scores: UserScoreData[] = Object.entries(byUser).map(([userId, preds]) => {
          const groupScores: Partial<Record<GroupId, GroupScore>> = {}
          let total = 0
          for (const pred of preds) {
            const result = resultsMap[pred.groupId]
            if (result) {
              const s = scoreGroup(pred.ranking, result.ranking, new Set(result.advancingTeams), pattern)
              groupScores[pred.groupId] = s
              total += s.points
            }
          }
          return {
            userId,
            displayName: profiles[userId]?.displayName ?? userId,
            predictions: preds,
            groupScores,
            total,
          }
        })

        scores.sort((a, b) => b.total - a.total)
        setUserScores(scores)
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
        <PitchLoader label={t('loading')} />
      </div>
    )
  }

  const SCORE_COLORS: Record<GroupScore['reason'], string> = {
    perfect: 'text-yellow-600',
    advancing: 'text-green-600',
    partial: 'text-blue-500',
    penalty: 'text-red-600',
    none: 'text-gray-400',
  }

  const myScoreIndex = userScores.findIndex((us) => us.userId === user?.uid)
  const myScore = myScoreIndex >= 0 ? userScores[myScoreIndex] : null
  const myRank = myScoreIndex >= 0 ? myScoreIndex + 1 : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">{t('title')}</h1>

      {/* 採点ルール */}
      <details className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50 select-none list-none flex items-center justify-between">
          <span>{t('scoringRulesLabel', { pattern: SCORING_PATTERNS[scoringPattern].label })}</span>
          <span className="text-gray-400 text-xs">{t('tapToOpen')}</span>
        </summary>
        <div className="border-t px-4 py-4 space-y-3 text-sm text-gray-700">
          <ScoringRules pattern={scoringPattern} t={t} />
        </div>
      </details>

      {/* 自分のスコアカード */}
      {myScore && myRank !== null ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-6 py-4">
          <p className="text-blue-800 font-semibold text-lg">
            {t('myRank', { rank: myRank, score: myScore.total > 0 ? `+${myScore.total}` : myScore.total })}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-4">
          <p className="text-gray-500">{t('noScore')}</p>
        </div>
      )}

      {/* 初回訪問ヒント */}
      {showHint && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          <span>{t('tapHint')}</span>
          <button
            onClick={dismissHint}
            className="text-blue-400 hover:text-blue-600 text-xs shrink-0"
            aria-label={locale === 'en' ? 'Dismiss hint' : 'ヒントを閉じる'}
          >
            ✕
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">{t('rankColumn')}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">{t('userColumn')}</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">{t('totalColumn')}</th>
              {GROUPS.map((g) => (
                <th key={g} className="hidden sm:table-cell px-2 py-3 text-center font-medium text-gray-500">
                  {g}
                </th>
              ))}
              <th className="w-8" scope="col">
                <span className="sr-only">{t('expandLabel')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {userScores.map((us, rank) => (
              <React.Fragment key={us.userId}>
                <tr
                  onClick={() => handleRowClick(us.userId)}
                  className={`cursor-pointer transition-colors active:bg-gray-100 ${us.userId === user?.uid ? 'bg-blue-50 hover:bg-blue-100 active:bg-blue-100' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-3 font-bold text-gray-700">{rank + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {us.displayName}
                    {us.userId === user?.uid && (
                      <span className="ml-2 text-xs text-blue-500">{t('myLabel')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-lg text-blue-700">
                    {us.total > 0 ? `+${us.total}` : us.total}
                  </td>
                  {GROUPS.map((g) => {
                    const s = us.groupScores[g]
                    return (
                      <td key={g} className="hidden sm:table-cell px-2 py-3 text-center">
                        {s ? (
                          <span className={SCORE_COLORS[s.reason]}>
                            {s.points > 0 ? `+${s.points}` : s.points}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-2 py-3 text-center">
                    <ChevronDown
                      size={20}
                      className={`transition-transform duration-200 text-blue-400 ${expandedRow === us.userId ? 'rotate-180' : 'rotate-0'}`}
                      aria-hidden="true"
                    />
                  </td>
                </tr>
                {expandedRow === us.userId && (
                  <tr>
                    <td colSpan={4 + GROUPS.length} className="px-4 py-4 bg-gray-50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {us.predictions.map((pred) => {
                          const result = results[pred.groupId]
                          const score = us.groupScores[pred.groupId]
                          if (!result || !score) return null
                          return (
                            <div key={pred.groupId} className="bg-white rounded-lg border p-3">
                              <h3 className="font-bold text-gray-700 mb-2">
                                {t('groupLabel', { group: pred.groupId })}
                              </h3>
                              <ScoreDetail
                                groupId={pred.groupId}
                                prediction={pred.ranking}
                                result={result.ranking}
                                advancingTeams={result.advancingTeams}
                                score={score}
                                ownerName={us.displayName}
                                isOwnPrediction={us.userId === user?.uid}
                                scoreLabels={SCORE_LABELS}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
