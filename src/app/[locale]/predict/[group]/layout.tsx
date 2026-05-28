import { GROUPS } from '@/data/groups'
import { routing } from '@/i18n/routing'
import type { ReactNode } from 'react'

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    GROUPS.map((group) => ({ locale, group }))
  )
}

export default function PredictGroupLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
