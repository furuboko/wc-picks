export type GroupId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L'

export interface Team {
  id: string
  name: string
  flag: string
  /** flagcdn.com で使う ISO/地域コード (例: "jp", "gb-sct") */
  iso: string
  groupId: GroupId
}

export interface GroupPrediction {
  userId: string
  groupId: GroupId
  /** team ids, index = rank (0-origin) */
  ranking: string[]
  updatedAt: Date
}

export interface GroupResult {
  groupId: GroupId
  /** team ids, index = rank (0-origin) */
  ranking: string[]
  /** R32進出チームid */
  advancingTeams: string[]
  confirmedAt: Date
}

export interface GroupScore {
  points: number
  reason: 'perfect' | 'advancing' | 'partial' | 'penalty' | 'none'
}

export type { ScoringPattern } from '@/lib/constants'

export interface UserScore {
  userId: string
  displayName: string
  scores: Record<GroupId, GroupScore>
  total: number
}

export interface AllowlistEntry {
  email: string
  role: 'admin' | 'member'
}
