import type { GroupScore } from '@/types'
import type { ScoringPattern } from '@/lib/constants'

// ─── Shared helpers ───────────────────────────────────────────────────────────

function isHalfMatch(prediction: string[], result: string[]): boolean {
  const predTop2 = new Set(prediction.slice(0, 2))
  const resultTop2 = new Set(result.slice(0, 2))
  const predBottom2 = new Set(prediction.slice(2, 4))
  const resultBottom2 = new Set(result.slice(2, 4))

  const top2Match =
    predTop2.size === 2 && resultTop2.size === 2 && [...resultTop2].every((t) => predTop2.has(t))
  const bottom2Match =
    predBottom2.size === 2 && resultBottom2.size === 2 && [...resultBottom2].every((t) => predBottom2.has(t))

  return top2Match && bottom2Match
}

function isPerfectMatch(prediction: string[], result: string[]): boolean {
  return (
    prediction.length === result.length && prediction.every((id, i) => id === result[i])
  )
}

// ─── Classic ──────────────────────────────────────────────────────────────────
// +5 exact / +3 top2+bottom2 set match / -3 predicted 1st eliminated

function scoreClassic(
  prediction: string[],
  result: string[],
  advancingTeams: Set<string>
): GroupScore {
  if (isPerfectMatch(prediction, result)) return { points: 5, reason: 'perfect' }
  if (isHalfMatch(prediction, result)) return { points: 3, reason: 'advancing' }

  const firstPick = prediction[0]
  if (firstPick !== undefined && advancingTeams.size > 0 && !advancingTeams.has(firstPick)) {
    return { points: -3, reason: 'penalty' }
  }

  return { points: 0, reason: 'none' }
}

// ─── No Penalty ───────────────────────────────────────────────────────────────
// Classic without the -3 penalty

function scoreNoPenalty(prediction: string[], result: string[]): GroupScore {
  if (isPerfectMatch(prediction, result)) return { points: 5, reason: 'perfect' }
  if (isHalfMatch(prediction, result)) return { points: 3, reason: 'advancing' }
  return { points: 0, reason: 'none' }
}

// ─── Per Position ─────────────────────────────────────────────────────────────
// +1 per exact-match position (max +4), +1 bonus for perfect (total +5)

function scorePerPosition(prediction: string[], result: string[]): GroupScore {
  const matches = result.filter((id, i) => prediction[i] === id).length
  if (matches === 4) return { points: 5, reason: 'perfect' }
  if (matches === 0) return { points: 0, reason: 'none' }
  return { points: matches, reason: 'partial' }
}

// ─── Top Heavy ────────────────────────────────────────────────────────────────
// 1st correct +3, 2nd correct +2, 3rd correct +1 — stacking, max +6

function scoreTopHeavy(prediction: string[], result: string[]): GroupScore {
  const weights = [3, 2, 1, 0]
  let points = 0
  for (let i = 0; i < Math.min(prediction.length, result.length, 4); i++) {
    if (prediction[i] === result[i]) points += weights[i]
  }

  if (points === 0) return { points: 0, reason: 'none' }
  if (points >= 6) return { points: 6, reason: 'perfect' }
  return { points, reason: 'partial' }
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export function scoreGroup(
  prediction: string[],
  result: string[],
  advancingTeams: Set<string>,
  pattern: ScoringPattern = 'classic'
): GroupScore {
  switch (pattern) {
    case 'classic':
      return scoreClassic(prediction, result, advancingTeams)
    case 'no-penalty':
      return scoreNoPenalty(prediction, result)
    case 'per-position':
      return scorePerPosition(prediction, result)
    case 'top-heavy':
      return scoreTopHeavy(prediction, result)
  }
}
