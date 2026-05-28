'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Users, Trophy, Settings, ShieldCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import { getUserProfile } from '@/lib/firestore'
import { ProfileModal } from '@/components/ProfileModal'
import { routing } from '@/i18n/routing'

/** ヘッダーナビのアイコン付きリンク。モバイルはアイコンのみ、sm以上でラベルも表示 */
function NavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ElementType
  label: string
}) {
  return (
    <Link
      href={href}
      title={label}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-1"
    >
      <Icon size={18} strokeWidth={2} aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  )
}

/** 現在のパスからロケールを検出する */
function useCurrentLocale(): string {
  const pathname = usePathname()
  const segments = pathname.split('/')
  const candidate = segments[1]
  return routing.locales.includes(candidate as (typeof routing.locales)[number])
    ? candidate
    : routing.defaultLocale
}

/** /[locale]/... の locale 部分を別のロケールに置換したパスを返す */
function switchLocalePath(pathname: string, nextLocale: string): string {
  const segments = pathname.split('/')
  const candidate = segments[1]
  if (routing.locales.includes(candidate as (typeof routing.locales)[number])) {
    segments[1] = nextLocale
    return segments.join('/') || '/'
  }
  // ロケールプレフィックスがない場合はデフォルトと仮定
  return `/${nextLocale}${pathname}`
}

export function Header() {
  const { user, isAdmin, loading, signIn, signOut } = useAuth()
  const [showProfile, setShowProfile] = useState(false)
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const locale = useCurrentLocale()
  const t = useTranslations('header')
  const tSwitcher = useTranslations('localeSwitcher')

  // ログイン後に初回かどうかを判定し、未設定なら自動でProfileModalを表示する
  useEffect(() => {
    if (loading || !user) return

    const uid = user.uid
    const key = `profileNameSet_${uid}`

    let localFlag = false
    try {
      localFlag = !!localStorage.getItem(key)
    } catch {
      // localStorage が使えない環境では Firestore のみで判定
    }

    if (localFlag) return

    getUserProfile(uid)
      .then((profile) => {
        if (profile?.nameSetByUser) {
          try {
            localStorage.setItem(key, '1')
          } catch {
            // 無視
          }
          return
        }
        setIsFirstTimeSetup(true)
        setShowProfile(true)
      })
      .catch(() => {
        // Firestore への接続失敗時はモーダルを表示しない
      })
  }, [user?.uid, loading])

  // ヒーローCTAを持つページではヘッダーのログインボタンを抑制する
  const PAGES_WITHOUT_HEADER_LOGIN = new Set(
    routing.locales.map((l) => `/${l}`)
  )
  const suppressHeaderLoginCta = PAGES_WITHOUT_HEADER_LOGIN.has(pathname) ||
    PAGES_WITHOUT_HEADER_LOGIN.has(pathname.replace(/\/$/, ''))

  const handleSwitchLocale = () => {
    const nextLocale = locale === 'ja' ? 'en' : 'ja'
    const nextPath = switchLocalePath(pathname, nextLocale)
    router.push(nextPath)
  }

  return (
    <header className="bg-blue-700 text-white shadow-md">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href={`/${locale}`} className="text-lg font-bold tracking-tight hover:opacity-90 shrink-0">
          ⚽ WC PICKS
        </Link>

        <nav className="flex items-center gap-1">
          {!loading && user && (
            <>
              <NavLink href={`/${locale}/predictions`} icon={Users} label={t('navPredictions')} />
              <NavLink href={`/${locale}/scores`} icon={Trophy} label={t('navScores')} />
              {isAdmin && <NavLink href={`/${locale}/admin`} icon={ShieldCheck} label={t('navAdmin')} />}

              {/* アバター → プロフィール編集 */}
              <button
                onClick={() => setShowProfile(true)}
                title={t('profileButton')}
                aria-label={t('profileButton')}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-1"
              >
                <span className="relative inline-flex">
                  <span className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs font-semibold">
                    {(user.displayName ?? user.email ?? 'U')[0].toUpperCase()}
                  </span>
                  <Settings
                    size={10}
                    strokeWidth={2.5}
                    aria-hidden="true"
                    className="sm:hidden absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5 ring-1 ring-blue-700"
                  />
                </span>
                <span className="hidden sm:inline text-sm">{t('profileButton')}</span>
              </button>
            </>
          )}

          {/* ヒーローCTAを持つページ(/{locale})では重複を避けヘッダーのログインボタンを非表示 */}
          {loading ? null : !user && !suppressHeaderLoginCta ? (
            <button
              onClick={signIn}
              className="text-sm rounded-lg bg-white text-blue-700 px-3 py-1.5 font-medium hover:bg-blue-50 transition-colors focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-1"
            >
              {t('signInButton')}
            </button>
          ) : null}

          {/* 言語切り替えボタン */}
          <button
            onClick={handleSwitchLocale}
            aria-label={`Switch to ${locale === 'ja' ? 'English' : '日本語'}`}
            className="ml-1 rounded-lg border border-white/30 px-2 py-1 text-xs font-medium hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-1"
          >
            {tSwitcher('label')}
          </button>
        </nav>
      </div>

      {showProfile && user && (
        <ProfileModal
          uid={user.uid}
          photoURL={user.photoURL}
          isFirstTime={isFirstTimeSetup}
          onSignOut={signOut}
          onClose={() => {
            setShowProfile(false)
            setIsFirstTimeSetup(false)
          }}
        />
      )}
    </header>
  )
}
