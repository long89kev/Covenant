import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { TideCloakProvider } from '@tidecloak/nextjs'
import { Inter } from 'next/font/google'
import tcConfig from '../tidecloak.json'
import { CapabilityProvider } from '@/components/covenant/session'
import './globals.css'

// next/font self-hosts Inter at build time; the CSS stack falls back to system fonts.
const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'COVENANT', template: '%s · COVENANT' },
  description: 'COVENANT: autonomous actions, distributed authority. AI procurement agents that cannot authorize payments alone.',
}

export const viewport: Viewport = { themeColor: '#F1F2EB' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <TideCloakProvider config={tcConfig}>
          <CapabilityProvider>{children}</CapabilityProvider>
        </TideCloakProvider>
      </body>
    </html>
  )
}
