/**
 * POST /api/billing/checkout
 * Crée une session Stripe Checkout et redirige vers le paiement.
 * Requiert que l'utilisateur soit connecté via Clerk.
 */

import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { requireStripe, STRIPE_PRICE_ID, APP_URL } from '@/lib/stripe'
import { userRepo } from '@/lib/db'

export async function POST() {
  const authCtx = await getAuth()
  if (!authCtx) {
    return NextResponse.json({ success: false, error: 'Connexion requise' }, { status: 401 })
  }

  try {
    const client = requireStripe()

    // Récupérer ou créer le customer Stripe
    const dbUser = await userRepo.findById(authCtx.userId)
    let stripeCustomerId = dbUser?.stripe_customer_id ?? null

    if (!stripeCustomerId) {
      const customer = await client.customers.create({
        metadata: { userId: authCtx.userId },
      })
      stripeCustomerId = customer.id
      await userRepo.setStripe(authCtx.userId, { stripe_customer_id: stripeCustomerId })
    }

    const session = await client.checkout.sessions.create({
      customer:             stripeCustomerId,
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price:    STRIPE_PRICE_ID,
        quantity: 1,
      }],
      success_url: `${APP_URL}/dashboard?upgrade=success`,
      cancel_url:  `${APP_URL}/pricing?upgrade=cancelled`,
      metadata: { userId: authCtx.userId },
      subscription_data: {
        metadata: { userId: authCtx.userId },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    })

    return NextResponse.json({ success: true, url: session.url })

  } catch (err: any) {
    console.error('[billing/checkout]', err)
    if (err.message?.includes('non configuré')) {
      return NextResponse.json({ success: false, error: 'Paiement non disponible pour le moment' }, { status: 503 })
    }
    return NextResponse.json({ success: false, error: 'Erreur lors de la création du paiement' }, { status: 500 })
  }
}
