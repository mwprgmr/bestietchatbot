export const dynamic = 'force-dynamic';
export const revalidate = 0;

import './globals.css'
import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import Providers from './providers'

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'BESTIET FRESH - Your Fresh Friend At The Door',
  description: 'Fresh fish delivery management and interactive WhatsApp ordering system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className={poppins.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
