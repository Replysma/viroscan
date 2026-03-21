import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0f1e]">
        {children}
      </body>
    </html>
  )

  if (!hasClerkKeys) return content

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#6366f1',
          colorBackground: '#0f172a',
          colorInputBackground: '#1e293b',
          colorInputText: '#f1f5f9',
          borderRadius: '0.75rem',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        elements: {
          card: 'bg-slate-900 border border-slate-700/50 shadow-2xl',
          headerTitle: 'text-slate-100',
          headerSubtitle: 'text-slate-400',
          formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-500',
          footerActionLink: 'text-indigo-400 hover:text-indigo-300',
          formFieldLabel: 'text-slate-400',
          dividerText: 'text-slate-500',
          socialButtonsBlockButton: 'border-slate-600 hover:bg-slate-700 text-slate-200',
        },
      }}
    >
      {content}
    </ClerkProvider>
  )
}
