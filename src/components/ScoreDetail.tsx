'use client'

import { cn } from '@/lib/utils'
import type { GroupId, GroupScore } from '@/types'
import { TEAMS_BY_GROUP } from '@/data/groups'

interface ScoreDetailProps {
  groupId: GroupId
  prediction: string[]
  result: string[]
  advancingTeams: string[]
  score: GroupScore
  /** 予想の所有者表示名。自分の予想を見ているときは省略可。 */
  ownerName?: string
  /** 表示中の予想が現在のユーザー自身のものか */
  isOwnPrediction: boolean
  /** スコア理由のラベル（翻訳済み）。省略時は日本語フォールバック。 */
  scoreLabels?: Record<GroupScore['reason'], string>
}

const RANK_LABELS = ['1位', '2位', '3位', '4位']

const SCORE_REASON_LABELS_DEFAULT: Record<GroupScore['reason'], string> = {
  perfect: '完全的中',
  advancing: '突破的中',
  partial: '部分的中',
  penalty: '1位敗退',
  none: 'ポイントなし',
}

const SCORE_REASON_COLORS: Record<GroupScore['reason'], string> = {
  perfect: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  advancing: 'text-green-700 bg-green-50 border-green-200',
  partial: 'text-blue-700 bg-blue-50 border-blue-200',
  penalty: 'text-red-700 bg-red-50 border-red-200',
  none: 'text-gray-600 bg-gray-50 border-gray-200',
}

function formatPoints(points: number): string {
  if (points > 0) return `+${points}点`
  if (points < 0) return `${points}点`
  return '0点'
}

export function ScoreDetail({
  groupId,
  prediction,
  result,
  advancingTeams,
  score,
  ownerName,
  isOwnPrediction,
  scoreLabels,
}: ScoreDetailProps) {
  const teams = TEAMS_BY_GROUP[groupId]
  const teamNameMap = Object.fromEntries(teams.map((t) => [t.id, t.name]))
  const advancingSet = new Set(advancingTeams)
  const SCORE_REASON_LABELS = scoreLabels ?? SCORE_REASON_LABELS_DEFAULT
  const predictionHeader = isOwnPrediction
    ? 'あなたの予想'
    : ownerName
      ? `${ownerName}さんの予想`
      : 'この人の予想'

  return (
    <div className="space-y-3">
      {/* 採点内訳 */}
      <div
        className={cn(
          'rounded-lg border px-4 py-2 text-sm font-medium',
          SCORE_REASON_COLORS[score.reason]
        )}
      >
        {SCORE_REASON_LABELS[score.reason]}　{formatPoints(score.points)}
      </div>

      {/* 予想 vs 実際比較テーブル */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">順位</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">{predictionHeader}</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">実際</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.map((resultTeamId, i) => {
              const predictedTeamId = prediction[i]
              const isMatch = predictedTeamId === resultTeamId
              const isAdvancing = advancingSet.has(resultTeamId)

              return (
                <tr key={i} className={cn(isMatch ? 'bg-green-50' : 'bg-red-50/40')}>
                  <td className="px-3 py-2 text-gray-500">{RANK_LABELS[i]}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'font-medium',
                        predictedTeamId
                          ? isMatch
                            ? 'text-green-700'
                            : 'text-red-600'
                          : 'text-gray-400'
                      )}
                    >
                      {predictedTeamId ? (teamNameMap[predictedTeamId] ?? predictedTeamId) : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-700">
                        {teamNameMap[resultTeamId] ?? resultTeamId}
                      </span>
                      {isAdvancing && (
                        <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                          突破
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
