'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { TEAMS_BY_GROUP } from '@/data/groups'
import { FlagImage } from '@/components/FlagImage'
import type { GroupId, GroupScore } from '@/types'

interface GroupCardProps {
  groupId: GroupId
  isPredicted: boolean
  ranking?: string[]
  score?: GroupScore
  isDeadlinePassed: boolean
  isRevealed: boolean
  /** ファーストビュー内のカードはtrueを指定してLCP最適化を有効にする */
  priority?: boolean
}

const SCORE_COLORS: Record<GroupScore['reason'], string> = {
  perfect: 'text-yellow-600',
  advancing: 'text-green-600',
  partial: 'text-blue-500',
  penalty: 'text-red-600',
  none: 'text-gray-500',
}

export function GroupCard({
  groupId,
  isPredicted,
  ranking,
  score,
  isDeadlinePassed,
  isRevealed,
  priority = false,
}: GroupCardProps) {
  const params = useParams()
  const locale = (params?.locale as string) ?? 'ja'
  const t = useTranslations('groupCard')
  const tScores = useTranslations('scores')

  const SCORE_LABELS: Record<GroupScore['reason'], string> = {
    perfect: tScores('scoreLabels.perfect'),
    advancing: tScores('scoreLabels.advancing'),
    partial: tScores('scoreLabels.partial'),
    penalty: tScores('scoreLabels.penalty'),
    none: tScores('scoreLabels.none'),
  }

  const RANK_LABELS = [
    t('rankLabels.0'),
    t('rankLabels.1'),
    t('rankLabels.2'),
    t('rankLabels.3'),
  ]

  const ptsLabel = locale === 'en' ? ' pts' : '点'

  const teams = TEAMS_BY_GROUP[groupId]
  const teamById = Object.fromEntries(teams.map((t_) => [t_.id, t_]))

  const rankedTeams = ranking
    ? ranking.map((id) => teamById[id]).filter(Boolean)
    : null

  const cardInner = (
    <div
      className={cn(
        'rounded-xl border bg-white overflow-hidden shadow-sm',
        !isDeadlinePassed && 'transition-all duration-300 ease-out group-hover:shadow-xl group-hover:-translate-y-0.5'
      )}
    >
      {/* ヘッダー */}
      <div className="bg-blue-600 px-4 py-2 flex items-center justify-between gap-2">
        <h2 className="text-white font-bold text-lg shrink-0">{t('groupLabel', { group: groupId })}</h2>
        {/* スコア表示（結果確定後） */}
        {isRevealed && score && (
          <span className="text-sm font-bold text-white/90 bg-white/20 rounded px-2 py-0.5 shrink-0">
            {score.points > 0 ? `+${score.points}` : score.points}{ptsLabel}
            （<span className={SCORE_COLORS[score.reason]}>{SCORE_LABELS[score.reason]}</span>）
          </span>
        )}
      </div>

      {/* ランキング本体 */}
      <div className="px-4 py-3">
        {rankedTeams && rankedTeams.length > 0 ? (
          <ol className="space-y-1.5">
            {rankedTeams.map((team, i) => (
              <li
                key={team.id}
                className={cn(
                  'flex items-center gap-2 text-sm',
                  i < 2 ? 'text-gray-800' : 'text-gray-400'
                )}
              >
                <span className="w-6 shrink-0 text-[11px] font-medium text-gray-400 text-right">
                  {RANK_LABELS[i]}
                </span>
                <FlagImage iso={team.iso} name={team.name} size={20} priority={priority} />
                <span className={cn('truncate', i < 2 && 'font-medium')}>
                  {team.name}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 w-fit',
              isDeadlinePassed
                ? 'bg-gray-100 text-gray-500 ring-gray-200'
                : 'bg-amber-100 text-amber-700 ring-amber-300'
            )}
          >
            {t('unpredicted')}
          </span>
        )}
      </div>

      {/* CTA（締切前のみ） */}
      {!isDeadlinePassed && (
        <div className="border-t px-4 py-2.5 flex items-center justify-end gap-1">
          <span
            className={cn(
              'text-xs font-medium',
              isPredicted ? 'text-gray-400' : 'text-blue-600'
            )}
          >
            {isPredicted ? t('edit') : t('predict')}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              'text-xs transition-transform duration-200 ease-out group-hover:translate-x-0.5',
              isPredicted ? 'text-gray-400' : 'text-blue-600'
            )}
          >
            →
          </span>
        </div>
      )}
    </div>
  )

  if (!isDeadlinePassed) {
    return (
      <Link href={`/${locale}/predict/${groupId}`} className="group block">
        {cardInner}
      </Link>
    )
  }

  return cardInner
}
