'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AuthRedirecting } from '@/components/AuthRedirecting'
import { AUTH_REDIRECT_DELAY_MS } from '@/lib/constants'

export default function PredictIndexPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('predict')

  useEffect(() => {
    const id = window.setTimeout(() => router.replace(`/${locale}`), AUTH_REDIRECT_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [router, locale])

  return <AuthRedirecting label={t('redirecting')} />
}
