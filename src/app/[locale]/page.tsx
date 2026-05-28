'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { Copy, Check, Clock, AlertCircle, Trophy } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePredictions } from '@/hooks/usePredictions'
import { GroupCard } from '@/components/GroupCard'
import { PitchLoader } from '@/components/PitchLoader'
import { GROUPS } from '@/data/groups'
import type { GroupId } from '@/types'

// 締切: 2026-06-11 23:59 JST
export const DEADLINE = new Date('2026-06-11T14:59:00Z')
const DEADLINE_LABEL = '2026年6月11日 23:59 JST'
const DEADLINE_LABEL_EN = 'Jun 11, 2026 23:59 JST'
// 公開: 2026-06-12 00:00 JST
export const REVEAL = new Date('2026-06-11T15:00:00Z')

export default function HomePage() {
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('home')
  const { user, loading, signIn, inAppBrowserType } = useAuth()
  const { predictions, loading: predictionsLoading } = usePredictions()
  const [timeLeft, setTimeLeft] = useState('')
  const [msLeft, setMsLeft] = useState(Infinity)
  const isUrgent = msLeft < 86400000
  const [copied, setCopied] = useState(false)
  const [isDeadlinePassed, setIsDeadlinePassed] = useState(() => Date.now() >= DEADLINE.getTime())
  const [isRevealed, setIsRevealed] = useState(() => Date.now() >= REVEAL.getTime())

  const deadlineLabel = locale === 'en' ? DEADLINE_LABEL_EN : DEADLINE_LABEL

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // clipboard API 非対応時はフォールバックなし
    }
  }

  const predictedGroups = useMemo(
    () => new Set(predictions.map((p) => p.groupId)),
    [predictions],
  )

  useEffect(() => {
    const update = () => {
      const now = Date.now()
      const diff = DEADLINE.getTime() - now
      setIsDeadlinePassed(now >= DEADLINE.getTime())
      setIsRevealed(now >= REVEAL.getTime())
      if (diff <= 0) { setTimeLeft(''); setMsLeft(0); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setMsLeft(diff)
      if (locale === 'en') {
        setTimeLeft(d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`)
      } else {
        setTimeLeft(d > 0 ? `あと ${d}日 ${h}時間` : h > 0 ? `あと ${h}時間 ${m}分` : `あと ${m}分`)
      }
    }
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [locale])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <PitchLoader />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('appTitle')}</h1>
          <p className="text-gray-500">{t('appDescription')}</p>
        </div>

        {inAppBrowserType ? (
          <div className="w-full max-w-xs rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5 space-y-4">
            <div className="text-center space-y-1">
              <p className="text-base font-bold text-amber-800">
                {t('inAppBrowserTitle')}
              </p>
              <p className="text-sm text-amber-700 leading-relaxed whitespace-pre-line">
                {t('inAppBrowserBody')}
              </p>
            </div>

            <button
              onClick={handleCopyUrl}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 font-semibold text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-400"
              style={{
                backgroundColor: copied ? '#16a34a' : '#d97706',
                color: 'white',
              }}
            >
              {copied ? (
                <>
                  <Check size={16} aria-hidden="true" />
                  {t('copied')}
                </>
              ) : (
                <>
                  <Copy size={16} aria-hidden="true" />
                  {t('copyUrl')}
                </>
              )}
            </button>

            <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside leading-relaxed">
              <li>{t('copyStep1')}</li>
              <li>{t('copyStep2')}</li>
              <li>{t('copyStep3')}</li>
            </ol>
          </div>
        ) : (
          <button
            onClick={signIn}
            className="rounded-xl bg-blue-600 px-8 py-3 text-white font-semibold hover:bg-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {t('signInButton')}
          </button>
        )}

      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{t('title')}</h1>
        {!isDeadlinePassed && timeLeft && (
          <div className="mt-2 space-y-1.5">
            <div className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${
              isUrgent
                ? 'bg-red-50 text-red-600'
                : 'bg-orange-50 text-orange-600'
            }`}>
              {isUrgent
                ? <AlertCircle size={18} aria-hidden="true" />
                : <Clock size={18} aria-hidden="true" />
              }
              <span className="text-lg font-bold tracking-tight">{timeLeft}</span>
            </div>
            <p className="text-xs text-gray-400">{t('deadlineLabel', { label: deadlineLabel })}</p>
            {predictedGroups.size < GROUPS.length && (
              <p className="text-xs text-amber-600">
                {t('unpredict', { count: GROUPS.length - predictedGroups.size })}
              </p>
            )}
          </div>
        )}
        {isDeadlinePassed && !isRevealed && (
          <p className="text-sm text-orange-600 mt-1 font-medium">{t('deadlineSoon')}</p>
        )}
        {isRevealed && (
          <Link
            href={`/${locale}/scores`}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-white font-semibold shadow-sm hover:bg-green-700 transition-colors focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          >
            <Trophy size={18} aria-hidden="true" />
            {t('viewScoreboard')}
          </Link>
        )}
      </div>

      {predictionsLoading ? (
        <PitchLoader inline label={locale === 'en' ? 'Loading…' : '予想を読み込み中…'} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GROUPS.map((groupId: GroupId, i) => {
            const prediction = predictions.find((p) => p.groupId === groupId)
            return (
              <GroupCard
                key={groupId}
                groupId={groupId}
                isPredicted={predictedGroups.has(groupId)}
                ranking={prediction?.ranking}
                isDeadlinePassed={isDeadlinePassed}
                isRevealed={isRevealed}
                priority={i < 3}
              />
            )
          })}
        </div>
      )}

    </div>
  )
}
