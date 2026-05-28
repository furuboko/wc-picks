import type { Metadata, Viewport } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import '../globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { PredictionsProvider } from '@/contexts/PredictionsContext'
import { Header } from '@/components/Header'
import { routing } from '@/i18n/routing'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://localhost:3000'

export const viewport: Viewport = {
  themeColor: '#1d4ed8',
}

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: '⚽ WC PICKS — W杯2026予想',
  description: '2026 FIFA ワールドカップ グループリーグ順位予想',
  openGraph: {
    title: '⚽ WC PICKS — W杯2026予想',
    description: '2026 FIFA ワールドカップ グループリーグ順位予想',
    url: APP_URL,
    siteName: 'WC PICKS',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '⚽ WC PICKS — W杯2026予想',
    description: '2026 FIFA ワールドカップ グループリーグ順位予想',
  },
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // static export で必須: ビルド時にロケールを確定させる
  setRequestLocale(locale)

  const messages = await getMessages()

  return (
    <html lang={locale} className={`${notoSansJP.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <PredictionsProvider>
              <Header />
              <main className="flex-1">{children}</main>
            </PredictionsProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
