/**
 * 未ログイン状態で保護ページにアクセスした際、トップへ自動遷移するまでに
 * 「ログインが必要です…」メッセージを見せる猶予時間。
 * 短すぎるとメッセージが視認できず、長すぎると遷移が間延びする。
 */
export const AUTH_REDIRECT_DELAY_MS = 800

/** 予想締切: 2026-06-11 23:59 JST = 2026-06-11T14:59:00Z */
export const DEADLINE = new Date('2026-06-11T14:59:00Z')

/** 予想公開: 2026-06-12 00:00 JST = 2026-06-11T15:00:00Z */
export const REVEAL = new Date('2026-06-11T15:00:00Z')

export const VALID_SCORING_PATTERNS = ['classic', 'no-penalty', 'per-position', 'top-heavy'] as const

export type ScoringPattern = (typeof VALID_SCORING_PATTERNS)[number]

export interface ScoringPatternMeta {
  label: string
  description: string
}

export const SCORING_PATTERNS: Record<ScoringPattern, ScoringPatternMeta> = {
  classic: {
    label: 'Classic',
    description: '完全的中 +5 / 上下2組的中 +3 / 1位敗退 −3',
  },
  'no-penalty': {
    label: 'No Penalty',
    description: '完全的中 +5 / 上下2組的中 +3 / ペナルティなし',
  },
  'per-position': {
    label: 'Per Position',
    description: '各順位の正解ごとに +1（最大 +4）/ 完全的中ボーナス +1（計 +5）',
  },
  'top-heavy': {
    label: 'Top Heavy',
    description: '1位的中 +3 / 2位的中 +2 / 3位的中 +1（重複加算、最大 +6）',
  },
}
