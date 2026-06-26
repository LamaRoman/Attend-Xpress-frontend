import { ImageResponse } from 'next/og'
import { SITE_NAME, SITE_TAGLINE, COMPANY_NAME } from '@/lib/site'

// Branded 1200×630 share card, generated at build time. Used by Google, social
// previews and several AI engines as the page thumbnail. No binary asset to
// ship or keep in sync — it always reflects the strings in site.ts.
export const runtime = 'edge'
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 20,
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a',
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            AX
          </div>
          <div style={{ marginLeft: 24, color: '#ffffff', fontSize: 40, fontWeight: 700 }}>
            {SITE_NAME}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              color: '#ffffff',
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.1,
              maxWidth: 980,
            }}
          >
            {SITE_TAGLINE}
          </div>
          <div style={{ color: '#a5b4fc', fontSize: 30, marginTop: 28 }}>
            QR attendance · Live field tracking · Payroll · Bikram Sambat
          </div>
        </div>

        <div style={{ color: '#94a3b8', fontSize: 26 }}>
          by {COMPANY_NAME} · zentaralabs.com
        </div>
      </div>
    ),
    size,
  )
}
