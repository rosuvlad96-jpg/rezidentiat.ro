import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: 'rezidentiat.ro',
  description: 'Platforma de invatare pentru examenul de rezidentiat',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro" className={dmSans.variable}>
      <body className={dmSans.className}>{children}</body>
    </html>
  )
}