'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { getPredictions, savePrediction as firestoreSavePrediction } from '@/lib/firestore'
import { useAuthContext } from '@/contexts/AuthContext'
import type { GroupId, GroupPrediction } from '@/types'

interface PredictionsContextValue {
  predictions: GroupPrediction[]
  loading: boolean
  savePrediction: (groupId: GroupId, ranking: string[]) => Promise<void>
}

const PredictionsContext = createContext<PredictionsContextValue | null>(null)

export function PredictionsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuthContext()
  const userId = user?.uid ?? null

  const [predictions, setPredictions] = useState<GroupPrediction[]>([])
  // Auth 解決まで loading=true を維持し、authLoading が解消されてから適切な状態へ遷移する
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Auth が解決するまで待つ
    if (authLoading) return

    if (!userId) {
      // 未ログイン時: 予想データを空にしてロード完了
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPredictions([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    getPredictions(userId)
      .then((data) => {
        if (!cancelled) setPredictions(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, authLoading])

  const savePrediction = useCallback(
    async (groupId: GroupId, ranking: string[]) => {
      if (!userId) return
      await firestoreSavePrediction(userId, groupId, ranking)
      // 楽観的更新: Firestore 保存後にローカルキャッシュを即座に更新
      setPredictions((prev) => {
        const next = prev.filter((p) => p.groupId !== groupId)
        return [...next, { userId, groupId, ranking, updatedAt: new Date() }]
      })
    },
    [userId]
  )

  return (
    <PredictionsContext.Provider value={{ predictions, loading, savePrediction }}>
      {children}
    </PredictionsContext.Provider>
  )
}

export function usePredictionsContext(): PredictionsContextValue {
  const ctx = useContext(PredictionsContext)
  if (!ctx) throw new Error('usePredictionsContext must be used within PredictionsProvider')
  return ctx
}
