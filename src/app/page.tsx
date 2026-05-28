import { redirect } from 'next/navigation'

// static export: middleware は動かないため、/ → /ja/ にリダイレクト
export default function RootPage() {
  redirect('/ja')
}
