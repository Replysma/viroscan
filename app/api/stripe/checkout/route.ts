/**
 * POST /api/stripe/checkout
 * Crée une session Stripe Checkout et retourne l'URL de paiement.
 * Passe le userId dans les metadata pour que le webhook /api/billing/webhook
 * puisse upgrader le bon utilisateur en base.
 */

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAuth } from '@/lib/auth'

export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Stripe non configuré côté serveur.' },
      { status: 503 }
    )
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  // Récupérer l'userId pour l'attacher aux metadata Stripe
  // (le webhook en a besoin pour activer le plan Premium)
  const authCtx = await getAuth()

  const priceId =
    process.env.STRIPE_PRICE_ID_PREMIUM ??
    process.env.STRIPE_PRICE_ID ??
    'price_1TDRH73bVgbiDW1sTw8v0daQ'

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price:    priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}/pricing`,
      allow_promotion_codes: true,
      // ↓ Critique : le webhook lit session.metadata.userId pour upgrader l'utilisateur
      metadata: authCtx?.userId
        ? { userId: authCtx.userId }
        : {},
    })

    return NextResponse.json({ url: session.url })

  } catch (err: any) {
    console.error('[stripe/checkout]', err.message)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la session de paiement.' },
      { status: 500 }
    )
  }
}
