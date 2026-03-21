'use client'

/**
 * Hook client : récupère le plan et le quota de scans de l'utilisateur courant.
 * Appelle GET /api/me une seule fois au montage.
 *
 * Usage :
 *   const { isPremium, plan, remaining, count, limit, loaded } = usePlan()
 */

import { useState, useEffect } from 'react'

export interface PlanInfo {
  plan:               'free' | 'premium'
  isPremium:          boolean
  subscriptionStatus: string
  remaining:          number | null   // null = illimité (premium)
  limit:              number | null
  count:              number | null
  loaded:             boolean
}

const DEFAULTS: PlanInfo = {
  plan:               'free',
  isPremium:          false,
  subscriptionStatus: 'free',
  remaining:          3,
  limit:              3,
  count:              0,
  loaded:             false,
}

export function usePlan(): PlanInfo {
  const [info, setInfo] = useState<PlanInfo>(DEFAULTS)

  useEffect(() => {
    let cancelled = false
    fetch('/api/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        setInfo({
          plan:               d.plan               ?? 'free',
          isPremium:          d.isPremium           ?? false,
          subscriptionStatus: d.subscriptionStatus  ?? 'free',
          remaining:          d.remaining           ?? null,
          limit:              d.limit               ?? 3,
          count:              d.count               ?? 0,
          loaded:             true,
        })
      })
      .catch(() => {
        if (!cancelled) setInfo(prev => ({ ...prev, loaded: true }))
      })
    return () => { cancelled = true }
  }, [])

  return info
}
