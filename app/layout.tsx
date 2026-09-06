import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import ServiceWorkerRegistration from '@/app/components/ServiceWorkerRegistration'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Runsite — Field Service Management',
  description: 'Runsite — field service management for trades businesses.',
  appleWebApp: {
    capable: true,
    title: 'Runsite',
    statusBarStyle: 'black-translucent',
  },
  // Icons come from the file conventions in app/ (favicon.ico, icon.svg,
  // apple-icon.png). Listing them here as well would override those files,
  // so this object deliberately has no icons entry. PWA install icons live
  // in app/manifest.ts.
}

export const viewport: Viewport = {
  themeColor: '#0f1117',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="h-full">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  )
}
