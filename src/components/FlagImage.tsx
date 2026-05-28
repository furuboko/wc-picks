interface FlagImageProps {
  iso: string
  name: string
  size?: number
  /** ファーストビュー内の国旗はtrueを指定。loading="eager" / decoding="sync" / fetchPriority="high" になる。 */
  priority?: boolean
}

/** flagcdn.com のSVGを使って国旗を表示するコンポーネント。絵文字と違いWindowsでも正しく表示される。 */
export function FlagImage({ iso, name, size = 20, priority = false }: FlagImageProps) {
  return (
    <img
      src={`https://flagcdn.com/${iso}.svg`}
      width={size}
      height={Math.round(size * 0.75)}
      alt={`${name}の国旗`}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      draggable={false}
      className="inline-block rounded-sm shrink-0 object-cover"
    />
  )
}
