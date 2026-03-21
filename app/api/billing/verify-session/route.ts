/**
 * POST /api/billing/verify-session
 * Vérifie une session Stripe Checkout et active le plan Premium si le paiement est confirmé.
 * Utilisé par la page /success pour activer le plan sans dépendre d'un webhook.
 *
 * C'est une alternative robuste aux webhooks pour l'environnement local
 * et un filet de sécurité en production si le webhook est manqué.
 */

import { NextResponse } from 'next/server'
import { requireStripe } from '@/lib/stripe'
import { userRepo } from '@/lib/db'
import { getAuth } from '@/lib/auth'

export async function POST(request: Request) {
  const { sessionId } = await request.json().catch(() => ({}))

  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'sessionId manquant' }, { status: 400 })
  }

  let stripe: ReturnType<typeof requireStripe>
  try {
    stripe = requireStripe()
  } catch {
    return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 })
  }

  // Récupérer la session depuis Stripe (source de vérité)
  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })
  } catch (err: any) {
    console.error('[verify-session] Erreur Stripe :', err.message)
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
  }

  // Vérifier que le paiement est bien confirmé
  if (session.payment_status !== 'paid' || session.status !== 'complete') {
    return NextResponse.json({
      success:  false,
      reason:   'Paiement non confirmé',
      payment_status: session.payment_status,
    }, { status: 402 })
  }

  // Récupérer le userId — priorité : metadata Stripe > userId Clerk actuel
  const metaUserId = session.metadata?.userId ?? null

  const authCtx  = await getAuth().catch(() => null)
  const userId   = metaUserId ?? authCtx?.userId ?? null

  if (!userId) {
    return NextResponse.json({
      success: false,
      reason:  'Impossible d\'identifier l\'utilisateur. Reconnectez-vous.',
    }, { status: 401 })
  }

  const customerId = typeof session.customer === 'string'
    ? session.customer
    : (session.customer as any)?.id ?? null

  const subId = typeof session.subscription === 'string'
    ? session.subscription
    : (session.subscription as any)?.id ?? null

  // Activer le Premium en base
  await userRepo.setStripe(userId, {
    stripe_customer_id:     customerId,
    stripe_subscription_id: subId,
    subscription_status:    'active',
    plan:                   'premium',
  })

  console.log(`[verify-session] Premium activé → ${userId} (customer: ${customerId})`)

  return NextResponse.json({
    success: true,
    plan:    'premium',
    userId,
  })
}
