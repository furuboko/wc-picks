import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { GroupId, GroupPrediction, GroupResult } from '@/types'
import { VALID_SCORING_PATTERNS, type ScoringPattern } from '@/lib/constants'

export async function getScoringPattern(): Promise<ScoringPattern> {
  const snap = await getDoc(doc(db, 'settings', 'scoring'))
  if (!snap.exists()) return 'classic'
  const raw = snap.data().pattern
  return (VALID_SCORING_PATTERNS as readonly string[]).includes(raw) ? (raw as ScoringPattern) : 'classic'
}

export async function setScoringPattern(pattern: ScoringPattern): Promise<void> {
  await setDoc(doc(db, 'settings', 'scoring'), { pattern }, { merge: true })
}

export interface UserProfile {
  uid: string
  displayName: string
  photoURL: string | null
  /** ユーザーが ProfileModal で表示名を明示的に設定したかどうか */
  nameSetByUser?: boolean
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const payload: Record<string, unknown> = {
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    updatedAt: serverTimestamp(),
  }
  // 明示的に true の場合のみ Firestore に書き込む（ログイン時の自動保存では上書きしない）
  if (profile.nameSetByUser) {
    payload.nameSetByUser = true
  }
  await setDoc(doc(db, 'users', profile.uid), payload, { merge: true })
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    uid: snap.id,
    displayName: data.displayName as string,
    photoURL: (data.photoURL as string | null) ?? null,
    nameSetByUser: (data.nameSetByUser as boolean | undefined) ?? false,
  }
}

// Firestore `in` クエリの上限に合わせて配列を分割
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

export async function getUserProfiles(uids: string[]): Promise<Record<string, UserProfile>> {
  if (uids.length === 0) return {}
  const profiles: Record<string, UserProfile> = {}
  // Firestore `in` クエリは最大30件まで。10件ずつ分割してまとめ取りすることでリード数を削減
  const batches = chunkArray(uids, 10)
  await Promise.all(
    batches.map(async (batch) => {
      const q = query(collection(db, 'users'), where('__name__', 'in', batch))
      const snap = await getDocs(q)
      snap.docs.forEach((d) => {
        const data = d.data()
        profiles[d.id] = {
          uid: d.id,
          displayName: data.displayName as string,
          photoURL: (data.photoURL as string | null) ?? null,
        }
      })
    })
  )
  return profiles
}

export async function savePrediction(
  userId: string,
  groupId: GroupId,
  ranking: string[]
): Promise<void> {
  const docId = `${userId}_${groupId}`
  await setDoc(doc(db, 'predictions', docId), {
    userId,
    groupId,
    ranking,
    updatedAt: serverTimestamp(),
  })
}

export async function getPredictions(userId: string): Promise<GroupPrediction[]> {
  const q = query(collection(db, 'predictions'), where('userId', '==', userId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      userId: data.userId as string,
      groupId: data.groupId as GroupId,
      ranking: data.ranking as string[],
      updatedAt: data.updatedAt?.toDate() ?? new Date(),
    }
  })
}

export async function getAllPredictions(): Promise<GroupPrediction[]> {
  const snapshot = await getDocs(collection(db, 'predictions'))
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      userId: data.userId as string,
      groupId: data.groupId as GroupId,
      ranking: data.ranking as string[],
      updatedAt: data.updatedAt?.toDate() ?? new Date(),
    }
  })
}

export async function getGroupResult(groupId: GroupId): Promise<GroupResult | null> {
  const snapshot = await getDoc(doc(db, 'results', groupId))
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  return {
    groupId: data.groupId as GroupId,
    ranking: data.ranking as string[],
    advancingTeams: data.advancingTeams as string[],
    confirmedAt: data.confirmedAt?.toDate() ?? new Date(),
  }
}

export async function saveGroupResult(
  groupId: GroupId,
  ranking: string[],
  advancingTeams: string[]
): Promise<void> {
  await setDoc(doc(db, 'results', groupId), {
    groupId,
    ranking,
    advancingTeams,
    confirmedAt: serverTimestamp(),
  })
}

export async function isAllowlisted(email: string): Promise<boolean> {
  const snapshot = await getDoc(doc(db, 'allowlist', email))
  return snapshot.exists()
}

export async function isAdmin(email: string): Promise<boolean> {
  const snapshot = await getDoc(doc(db, 'allowlist', email))
  if (!snapshot.exists()) return false
  return snapshot.data().role === 'admin'
}

export interface AllowlistEntry {
  email: string
  role: 'admin' | 'user'
  addedAt: Date
}

export async function getAllowlistEntries(): Promise<AllowlistEntry[]> {
  const snapshot = await getDocs(collection(db, 'allowlist'))
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      email: d.id,
      role: (data.role as 'admin' | 'user') ?? 'user',
      addedAt: data.addedAt?.toDate() ?? new Date(),
    }
  })
}

export async function addToAllowlist(email: string, role: 'admin' | 'user' = 'user'): Promise<void> {
  await setDoc(doc(db, 'allowlist', email), {
    role,
    addedAt: serverTimestamp(),
  })
}

export async function removeFromAllowlist(email: string): Promise<void> {
  await deleteDoc(doc(db, 'allowlist', email))
}
