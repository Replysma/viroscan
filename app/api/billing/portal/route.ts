/**
 * POST /api/billing/portal
 * Crée une session Stripe Customer Portal pour gérer/annuler l'abonnement.
 */

import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { requireStripe, APP_URL } from '@/lib/stripe'
import { userRepo } from '@/lib/db'

export async function POST() {
  const authCtx = await getAuth()
  if (!authCtx) {
    return NextResponse.json({ success: false, error: 'Connexion requise' }, { status: 401 })
  }

  try {
    const client = requireStripe()
    const dbUser = await userRepo.findById(authCtx.userId)

    if (!dbUser?.stripe_customer_id) {
      return NextResponse.json({
        success: false,
        error:   'Aucun abonnement actif trouvé',
      }, { status: 404 })
    }

    const session = await client.billingPortal.sessions.create({
      customer:   dbUser.stripe_customer_id,
      return_url: `${APP_URL}/dashboard`,
    })

    return NextResponse.json({ success: true, url: session.url })

  } catch (err: any) {
    console.error('[billing/portal]', err)
    if (err.message?.includes('non configuré')) {
      return NextResponse.json({ success: false, error: 'Non disponible pour le moment' }, { status: 503 })
    }
    return NextResponse.json({ success: false, error: 'Erreur portail facturation' }, { status: 500 })
  }
}
