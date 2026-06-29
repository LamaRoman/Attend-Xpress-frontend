'use client'

import dynamic from 'next/dynamic'

const FieldTrackingContent = dynamic(() => import('./FieldTrackingContent'), { ssr: false })

export default function FieldTrackingPage() {
  return <FieldTrackingContent />
}
