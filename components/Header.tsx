'use client'

import Link from 'next/link'
import { Archive, Zap, Crown } from 'lucide-react'
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { usePlan } from '@/hooks/usePlan'

// True only when real (non-placeholder) Clerk keys are configured
const CLERK_ENABLED =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('XXXX')

export default function Header() {
  return (
    <header className="h-16 border-b border-[#242424] flex items-center justify-between px-4 bg-[#0A0A0A] backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 bg-[#D4A017] rounded-md flex items-center justify-center">
            <Archive size={16} className="text-black" />
          </div>
          <span className="font-bold text-white">ViroScan</span>
        </Link>
        <span className="text-[#333333]">/</span>
        <span className="text-[#666666] text-sm">Dashboard</span>
      </div>

      <div className="flex items-center gap-3">
        {CLERK_ENABLED ? (
          <>
            {/* Signed-in state */}
            <Show when="signed-in">
              <PlanBadgeWrapper />
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8',
                    userButtonPopoverCard: 'bg-[#121212] border border-[#2A2A2A]',
                    userButtonPopoverActionButton: 'hover:bg-[#1A1A1A] text-[#B3B3B3]',
                    userButtonPopoverActionButtonText: 'text-[#B3B3B3]',
                    userButtonPopoverFooter: 'hidden',
                  },
                }}
              />
            </Show>
            {/* Signed-out state */}
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="btn-ghost text-sm">Connexion</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="btn-primary text-sm py-1.5">S'inscrire</button>
              </SignUpButton>
            </Show>
          </>
        ) : (
          /* Fallback when Clerk is not yet configured */
          <span className="text-xs text-[#444444] hidden sm:block">
            Configure Clerk keys to enable auth
          </span>
        )}
      </div>
    </header>
  )
}

/** Wrapper qui isole le hook usePlan dans un sous-composant (évite le rendu avant Clerk) */
function PlanBadgeWrapper() {
  const { isPremium, remaining, limit, loaded } = usePlan()

  if (!loaded) return null

  if (isPremium) {
    return (
      <div className="flex items-center gap-2">
        <span className="badge badge-premium hidden sm:inline-flex items-center gap-1">
          <Crown size={10} /> Plan Premium
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="badge badge-free hidden sm:inline-flex items-center gap-1" title={`${remaining} analyse(s) restante(s) aujourd'hui`}>
        {remaining}/{limit} analyse{remaining !== 1 ? 's' : ''}
      </span>
      <Link href="/pricing" className="btn-ghost text-xs text-[#D4A017] hover:text-[#F2C94C]">
        <Zap size={13} /> Premium
      </Link>
    </div>
  )
}
