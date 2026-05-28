'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getUserProfile, saveUserProfile } from '@/lib/firestore'

interface ProfileModalProps {
  uid: string
  photoURL: string | null
  onClose: () => void
  /** 初回ログイン時の誘導モード。true の場合タイトルや説明を初回向けにする */
  isFirstTime?: boolean
  onSignOut: () => void
}

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function ProfileModal({ uid, photoURL, onClose, isFirstTime = false, onSignOut }: ProfileModalProps) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // モーダルを開いたトリガー要素を保存し、閉じた時にフォーカスを返す
  const triggerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement
    return () => {
      triggerRef.current?.focus()
    }
  }, [])

  // マウント後に入力欄へフォーカスを移動する（autoFocus より確実）
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    getUserProfile(uid).then((p) => {
      if (p) setName(p.displayName)
    })
  }, [uid])

  /** localStorage に「設定済み」フラグを記録する */
  const markProfileSet = useCallback(() => {
    try {
      localStorage.setItem(`profileNameSet_${uid}`, '1')
    } catch {
      // プライベートブラウザなど localStorage が使えない場合は無視
    }
  }, [uid])

  // Escキーで閉じる（保存中は無視）& フォーカストラップ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 保存中は誤操作を防ぐため Esc を無視する
        if (!saving) {
          if (isFirstTime) markProfileSet()
          onClose()
        }
        return
      }

      if (e.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return

      // Tab 押下時に毎回取得することで saving 中の disabled 変化を正確に反映する
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      ).filter((el) => el.offsetParent !== null)

      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, saving, isFirstTime, markProfileSet])

  // オーバーレイクリックで閉じる
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      if (isFirstTime) markProfileSet()
      onClose()
    }
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('表示名を入力してください'); return }
    if (trimmed.length > 20) { setError('20文字以内で入力してください'); return }
    setSaving(true)
    try {
      // nameSetByUser: true を Firestore に記録することで、
      // 別デバイス/ブラウザでのログイン時にも再表示を防ぐ
      await saveUserProfile({ uid, displayName: trimmed, photoURL, nameSetByUser: true })
      markProfileSet()
      onClose()
    } catch {
      setError('保存に失敗しました。再度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  /** 初回モードで「後で設定する」を選んだ時もフラグを立てて閉じる */
  const handleSkip = () => {
    markProfileSet()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        aria-describedby="profile-modal-desc"
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 text-gray-900"
      >
        <h2 id="profile-modal-title" className="text-lg font-bold text-gray-800">
          {isFirstTime ? '🎉 ようこそ！表示名を設定しましょう' : '表示名を変更'}
        </h2>
        <p id="profile-modal-desc" className="text-sm text-gray-500">
          {isFirstTime
            ? 'スコアボードやみんなの予想ページで表示されるニックネームです。後からでも変更できます（20文字以内）。'
            : 'みんなの予想ページで表示される名前です（20文字以内）'}
        </p>

        <div className="space-y-1">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            maxLength={20}
            placeholder="ニックネームを入力"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <p className="text-xs text-gray-400 text-right">{name.trim().length} / 20</p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={isFirstTime ? handleSkip : onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {isFirstTime ? '後で設定する' : 'キャンセル'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : isFirstTime ? '設定する' : '保存'}
          </button>
        </div>

        {/* ログアウト: 保存中は誤操作を防ぐため disabled にする */}
        <div className="pt-2 border-t border-gray-100">
          <button
            onClick={onSignOut}
            disabled={saving}
            className="w-full rounded-lg py-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  )
}
