interface PitchLoaderProps {
  label?: string
  inline?: boolean
}

/** ワールドカップ風ローダー。サッカーボールがバウンドしながら回転する。 */
export function PitchLoader({ label = 'キックオフ準備中…', inline = false }: PitchLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        inline
          ? 'flex items-center justify-center gap-3 py-4'
          : 'flex flex-col items-center justify-center py-16'
      }
    >
      <span
        aria-hidden="true"
        className={`${inline ? 'text-2xl' : 'text-5xl'} inline-block animate-soccer-bounce motion-reduce:animate-pulse`}
      >
        ⚽
      </span>
      <span className={`${inline ? 'text-sm' : 'mt-3 text-base'} text-gray-600`}>{label}</span>
    </div>
  )
}
