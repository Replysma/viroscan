import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

export const metadata: Metadata = {
  title: 'ZipView — Browse ZIP & RAR files instantly',
  description: 'Upload and explore ZIP and RAR archives without downloading. Preview files, browse structure, extract selectively.',
  keywords: ['zip viewer', 'rar viewer', 'archive browser', 'file extractor'],
}

const hasClerkKeys =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('XXXX')

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen">
        {children}
        <Analytics />
      </body>
    </html>
  )

  if (!hasClerkKeys) return content

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary:        '#E1AD01',
          colorBackground:     '#050505',
          colorInputBackground:'#0D0D0D',
          colorInputText:      '#FFFFFF',
          borderRadius:        '0.75rem',
          fontFamily:          'Inter, system-ui, sans-serif',
        },
        elements: {
          card:                    'shadow-2xl',
          formButtonPrimary:       'bg-[#E1AD01] hover:bg-[#FFCC00] text-black',
          footerActionLink:        'text-[#E1AD01] hover:text-[#FFCC00]',
          socialButtonsBlockButton:'border-[#1A1A1A] hover:bg-[#131313] text-[#AAAAAA]',
        },
      }}
    >
      {content}
    </ClerkProvider>
  )
}
