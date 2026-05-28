'use client'

import { usePredictionsContext } from '@/contexts/PredictionsContext'

/**
 * 予想データを取得・保存するフック。
 *
 * 内部では PredictionsContext を使用して予想データをアプリ全体で共有する。
 * これにより予想ページ → ホームページへの遷移時に再フェッチが発生しない。
 */
export function usePredictions() {
  return usePredictionsContext()
}
