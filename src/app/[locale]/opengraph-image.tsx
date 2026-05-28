import { ImageResponse } from 'next/og'
import { routing } from '@/i18n/routing'

export const alt = 'WC PICKS — 2026 FIFA World Cup Group Stage Predictions'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export const dynamic = 'force-static'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a1232 0%, #1e3a8a 50%, #1d4ed8 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            left: -60,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            display: 'flex',
          }}
        />

        {/* Football emoji */}
        <div style={{ fontSize: 88, lineHeight: 1, marginBottom: 24, display: 'flex' }}>
          ⚽
        </div>

        {/* App name */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-3px',
            lineHeight: 1,
            marginBottom: 16,
            display: 'flex',
          }}
        >
          WC PICKS
        </div>

        {/* Year badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              background: 'rgba(251, 191, 36, 0.2)',
              border: '1px solid rgba(251, 191, 36, 0.5)',
              borderRadius: 24,
              padding: '6px 20px',
              fontSize: 24,
              fontWeight: 700,
              color: '#fbbf24',
              display: 'flex',
            }}
          >
            2026 FIFA World Cup
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#93c5fd',
            letterSpacing: '0.5px',
            display: 'flex',
          }}
        >
          Group Stage Predictions — Pick your standings
        </div>
      </div>
    ),
    { ...size }
  )
}
