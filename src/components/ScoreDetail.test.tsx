import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScoreDetail } from './ScoreDetail'
import type { GroupScore } from '@/types'

// Group A の team id を流用 (data/groups.ts)
const prediction = ['mexico', 'south_korea', 'czechia', 'south_africa']
const result = ['mexico', 'south_korea', 'south_africa', 'czechia']
const advancingTeams = ['mexico', 'south_korea']
const score: GroupScore = { points: 3, reason: 'advancing' }

describe('ScoreDetail — 予想ヘッダーラベル (Issue #78)', () => {
  it('isOwnPrediction=true のときは「あなたの予想」と表示する', () => {
    render(
      <ScoreDetail
        groupId="A"
        prediction={prediction}
        result={result}
        advancingTeams={advancingTeams}
        score={score}
        isOwnPrediction
        ownerName="自分の名前"
      />,
    )
    expect(screen.getByRole('columnheader', { name: 'あなたの予想' })).toBeInTheDocument()
    expect(screen.queryByText(/さんの予想/)).toBeNull()
  })

  it('isOwnPrediction=false かつ ownerName あり: 「〇〇さんの予想」と表示する', () => {
    render(
      <ScoreDetail
        groupId="A"
        prediction={prediction}
        result={result}
        advancingTeams={advancingTeams}
        score={score}
        isOwnPrediction={false}
        ownerName="田中太郎"
      />,
    )
    expect(
      screen.getByRole('columnheader', { name: '田中太郎さんの予想' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'あなたの予想' })).toBeNull()
  })

  it('isOwnPrediction=false で ownerName 未指定のときは汎用ラベル「この人の予想」にフォールバックする', () => {
    render(
      <ScoreDetail
        groupId="A"
        prediction={prediction}
        result={result}
        advancingTeams={advancingTeams}
        score={score}
        isOwnPrediction={false}
      />,
    )
    expect(screen.getByRole('columnheader', { name: 'この人の予想' })).toBeInTheDocument()
  })
})
