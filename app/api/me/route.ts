/**
 * GET /api/me
 * Retourne le plan de l'utilisateur courant + quota de scans restants.
 * Utilisé par le frontend pour afficher le badge plan et le compteur d'analyses.
 */

import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { userRepo } from '@/lib/db'
import { getRateLimitIdentifier, checkRateLimit } from '@/lib/rateLimit'

export async function GET() {
  try {
    const authCtx = await getAuth()
    const isPremium = authCtx?.plan === 'premium'

    // Statut d'abonnement depuis la DB (pour afficher "Abonnement annulé" si besoin)
    let subscriptionStatus: string = 'free'
    if (authCtx?.userId) {
      try {
        const user = await userRepo.findById(authCtx.userId)
        subscriptionStatus = user?.subscription_status ?? 'free'
      } catch { /* fallback silencieux */ }
    }

    if (isPremium) {
      return NextResponse.json({
        plan:               'premium',
        subscriptionStatus,
        isPremium:          true,
        remaining:          null,   // illimité
        limit:              null,
        count:              null,
      })
    }

    // Plan gratuit → récupère le quota des 24h glissantes
    const identifier = await getRateLimitIdentifier(authCtx?.userId ?? null)
    const rl = await checkRateLimit(identifier)

    return NextResponse.json({
      plan:               authCtx?.plan ?? 'free',
      subscriptionStatus,
      isPremium:          false,
      remaining:          rl.remaining,
      limit:              rl.limit,
      count:              rl.count,
    })
  } catch (err: any) {
    console.error('[api/me] Erreur inattendue:', err.message)
    return NextResponse.json({
      plan:               'free',
      subscriptionStatus: 'free',
      isPremium:          false,
      remaining:          3,
      limit:              3,
      count:              0,
    })
  }
}
