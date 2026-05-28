import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WC PICKS — W杯2026予想',
    short_name: 'WC PICKS',
    description: '2026 FIFA ワールドカップ グループリーグ順位予想',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a1232',
    theme_color: '#1d4ed8',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
