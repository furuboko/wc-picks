'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  GoogleAuthProvider,
  signInWithPopup,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { isAdmin as checkIsAdmin, saveUserProfile } from '@/lib/firestore'

/**
 * LINE の WebView を判定する。
 * LINE は ?openExternalBrowser=1 を付けたリダイレクトでシステムブラウザを開ける。
 */
function isLineWebView(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Line\//i.test(navigator.userAgent)
}

/**
 * Instagram / Facebook などその他のアプリ内 WebView を判定する。
 * これらは openExternalBrowser が使えないため手動案内が必要。
 */
function isOtherInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Instagram/i.test(ua) || /FBAN|FBAV/i.test(ua)
}

/** アプリ内ブラウザの種別 */
export type InAppBrowserType = 'line' | 'other' | null

/**
 * セッション内での isAdmin 検証結果をキャッシュする。
 * uid をキーに sessionStorage へ保存し、同一セッション中の再ナビゲーションで
 * Firestore ラウンドトリップを省略してタイムアウト誤判定を回避する。
 */
const ADMIN_CACHE_KEY = (uid: string) => `isAdmin:v1:${uid}`

function getAdminCache(uid: string): boolean | null {
  try {
    const val = sessionStorage.getItem(ADMIN_CACHE_KEY(uid))
    if (val === 'true') return true
    return null // 未キャッシュまたは非管理者は毎回 Firestore で確認
  } catch {
    return null // sessionStorage 未対応環境（プライベートモード等）
  }
}

function setAdminCache(uid: string, value: boolean): void {
  try {
    if (value) {
      sessionStorage.setItem(ADMIN_CACHE_KEY(uid), 'true')
    } else {
      sessionStorage.removeItem(ADMIN_CACHE_KEY(uid))
    }
  } catch {
    // sessionStorage 未対応環境ではキャッシュなしで動作
  }
}

interface AuthContextValue {
  user: User | null
  isAdmin: boolean
  loading: boolean
  /** アプリ内ブラウザで開かれている場合の種別（null = 通常ブラウザ） */
  inAppBrowserType: InAppBrowserType
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  // SSR では判定不可のため null で初期化し、クライアント側で確定させる
  const [inAppBrowserType, setInAppBrowserType] = useState<InAppBrowserType>(null)

  useEffect(() => {
    // クライアント側でアプリ内ブラウザ種別を確定する
    if (isLineWebView()) setInAppBrowserType('line')
    else if (isOtherInAppBrowser()) setInAppBrowserType('other')
    else setInAppBrowserType(null)

    // getRedirectResult は通常ブラウザのみ必要（アプリ内ブラウザでは使わない）
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const u = result.user
          try {
            await saveUserProfile({
              uid: u.uid,
              displayName: u.displayName || u.email || u.uid,
              photoURL: u.photoURL,
            })
          } catch {
            // プロフィール保存の失敗はサイレントに無視
          }
        }
      })
      .catch(() => {
        // リダイレクト結果の取得失敗はサイレントに無視
      })

    // アンマウント後の setState を防ぐフラグ
    let cancelled = false

    // Firestore へのアクセスタイムアウト（loading を解除するための安全弁）
    const ADMIN_CHECK_TIMEOUT_MS = process.env.NEXT_PUBLIC_USE_EMULATOR === '1' ? 15_000 : 10_000

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) return
      setUser(firebaseUser)
      if (firebaseUser?.email) {
        const uid = firebaseUser.uid
        const email = firebaseUser.email

        // キャッシュヒット: セッション内で既に管理者と確認済みなら即座に解決
        const cached = getAdminCache(uid)
        if (cached === true) {
          if (cancelled) return
          setIsAdmin(true)
          setLoading(false)
          // バックグラウンドで Firestore を再確認してキャッシュを最新化
          checkIsAdmin(email)
            .then((fresh) => {
              if (cancelled) return
              setAdminCache(uid, fresh)
              setIsAdmin(fresh)
            })
            .catch(() => {})
          return
        }

        // キャッシュなし: Firestore で確認する
        // タイムアウトは loading を解除するための安全弁。タイムアウト後も
        // Firestore の応答を待ち続け、管理者と判明した時点で state を更新する。
        // ただし、タイムアウト起因の false で /admin からリダイレクト済みの場合は
        // state 更新後にユーザーが再度 /admin へ戻る必要がある（キャッシュで即時解決）。
        const firestorePromise = checkIsAdmin(email)

        try {
          const result = await Promise.race([
            firestorePromise,
            new Promise<false>((resolve) => setTimeout(() => resolve(false), ADMIN_CHECK_TIMEOUT_MS)),
          ])

          if (cancelled) return
          setAdminCache(uid, result)
          setIsAdmin(result)
          setLoading(false)

          // タイムアウトで false を返した場合でも Firestore の結果を待機し続ける。
          // 管理者と判明したらキャッシュへ保存する（次のナビゲーション時に即時解決される）。
          if (!result) {
            firestorePromise
              .then((actual) => {
                if (cancelled) return
                if (actual) {
                  setAdminCache(uid, true)
                  setIsAdmin(true)
                }
              })
              .catch(() => {})
          }
        } catch {
          if (cancelled) return
          setIsAdmin(false)
          setLoading(false)
        }
      } else {
        if (cancelled) return
        setIsAdmin(false)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const signIn = async () => {
    if (isLineWebView() || isOtherInAppBrowser()) {
      // アプリ内ブラウザでは Google OAuth がブロックされる。
      // UI 側でURLコピー案内を表示しているため、ここでは何もしない。
      return
    }

    // 通常ブラウザ: ポップアップ方式（UX が良い）
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    // ログイン成功時のみプロフィールを保存（onAuthStateChanged では毎回書き込まれるため）
    const u = result.user
    try {
      await saveUserProfile({
        uid: u.uid,
        // || で空文字列も除外する
        displayName: u.displayName || u.email || u.uid,
        photoURL: u.photoURL,
      })
    } catch {
      // プロフィール保存の失敗はサイレントに無視
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, inAppBrowserType, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
