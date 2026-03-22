'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Zap, Crown } from 'lucide-react'
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { usePlan } from '@/hooks/usePlan'

const CLERK_ENABLED =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('XXXX')

export default function Header() {
  return (
    <header className="h-16 border-b border-white/[0.06] flex items-center justify-between px-5 bg-black/80 backdrop-blur-xl flex-shrink-0">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity group">
          <Image src="/logo.png" alt="ViroScan" width={44} height={44} unoptimized className="transition-opacity" />
          <span className="font-bold text-white tracking-tight">ViroScan</span>
        </Link>
        <span className="text-white/10">/</span>
        <span className="text-[#444444] text-sm">Dashboard</span>
      </div>

      <div className="flex items-center gap-3">
        {CLERK_ENABLED ? (
          <>
            <Show when="signed-in">
              <PlanBadgeWrapper />
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8',
                    userButtonPopoverCard: 'bg-[#111111] border border-white/[0.07] shadow-2xl',
                    userButtonPopoverActionButton: 'hover:bg-white/[0.04] text-[#AAAAAA] rounded-xl',
                    userButtonPopoverActionButtonText: 'text-[#AAAAAA]',
                    userButtonPopoverFooter: 'hidden',
                  },
                }}
              />
            </Show>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="btn-ghost text-sm">Connexion</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="btn-primary text-sm py-2 px-4">S'inscrire</button>
              </SignUpButton>
            </Show>
          </>
        ) : (
          <span className="text-xs text-[#333333] hidden sm:block">Configure Clerk keys to enable auth</span>
        )}
      </div>
    </header>
  )
}

function PlanBadgeWrapper() {
  const { isPremium, remaining, limit, loaded } = usePlan()
  if (!loaded) return null

  if (isPremium) {
    return (
      <span className="badge badge-premium hidden sm:inline-flex items-center gap-1">
        <Crown size={10} /> Premium
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="badge badge-free hidden sm:inline-flex items-center gap-1"
            title={`${remaining} analyse(s) restante(s) aujourd'hui`}>
        {remaining}/{limit} analyses
      </span>
      <Link href="/pricing" className="btn-ghost text-xs text-[#FFD700] hover:text-[#FFED4A] px-2 py-1">
        <Zap size={12} /> Premium
      </Link>
    </div>
  )
}
