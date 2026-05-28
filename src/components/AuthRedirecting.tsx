import { PitchLoader } from '@/components/PitchLoader'

interface AuthRedirectingProps {
  label?: string
}

/** 認証リダイレクト中に表示するローダー。ログイン未済ページ共通。 */
export function AuthRedirecting({
  label = 'ログインが必要です。ホームへ戻ります…',
}: AuthRedirectingProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <PitchLoader label={label} />
    </div>
  )
}
