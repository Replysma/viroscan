/**
 * POST /api/billing/webhook
 * Reçoit et traite les événements Stripe.
 * Sécurisé par vérification de signature (stripe-signature header).
 *
 * IMPORTANT : Cette route doit recevoir le body RAW (non parsé par Next.js).
 * En App Router, request.text() retourne bien le raw body.
 */

import { NextResponse } from 'next/server'
import { requireStripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe'
import { userRepo } from '@/lib/db'
import type Stripe from 'stripe'

// Désactiver le body parser Next.js pour cette route (raw body requis pour HMAC)
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body      = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET non configuré')
    return NextResponse.json({ error: 'Webhook non configuré' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    const client = requireStripe()
    event = client.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('[webhook] Signature invalide :', err.message)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  console.log('[webhook] Événement reçu :', event.type)

  try {
    switch (event.type) {

      // ─── Paiement initial validé ──────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const userId    = session.metadata?.userId ?? null
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null
        const subId     = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null

        if (!userId) {
          console.warn('[webhook] checkout.session.completed sans userId dans metadata')
          break
        }

        await userRepo.setStripe(userId, {
          stripe_customer_id:     customerId,
          stripe_subscription_id: subId,
          subscription_status:    'active',
          plan:                   'premium',
        })
        console.log(`[webhook] Utilisateur ${userId} → Premium activé`)
        break
      }

      // ─── Renouvellement mensuel OK ────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null
        if (!customerId) break

        const user = await userRepo.findByStripeCustomer(customerId)
        if (!user) break

        await userRepo.setStripe(user.id, {
          subscription_status: 'active',
          plan:                'premium',
        })
        console.log(`[webhook] Renouvellement OK → ${user.id}`)
        break
      }

      // ─── Paiement échoué ──────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice    = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null
        if (!customerId) break

        const user = await userRepo.findByStripeCustomer(customerId)
        if (!user) break

        await userRepo.setStripe(user.id, { subscription_status: 'past_due' })
        console.warn(`[webhook] Paiement échoué → ${user.id} (past_due)`)
        break
      }

      // ─── Abonnement modifié (annulation programmée / reprise) ─────────────
      case 'customer.subscription.updated': {
        const sub        = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null
        if (!customerId) break

        const user = await userRepo.findByStripeCustomer(customerId)
        if (!user) break

        // cancel_at_period_end = annulation à la fin de la période actuelle
        if (sub.cancel_at_period_end) {
          await userRepo.setStripe(user.id, { subscription_status: 'cancelled' })
          console.log(`[webhook] Annulation programmée → ${user.id}`)
        } else if (sub.status === 'active') {
          await userRepo.setStripe(user.id, { subscription_status: 'active', plan: 'premium' })
          console.log(`[webhook] Abonnement réactivé → ${user.id}`)
        }
        break
      }

      // ─── Abonnement résilié définitivement ────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub        = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null
        if (!customerId) break

        const user = await userRepo.findByStripeCustomer(customerId)
        if (!user) break

        await userRepo.setStripe(user.id, {
          subscription_status:    'free',
          stripe_subscription_id: null,
          plan:                   'free',
        })
        console.log(`[webhook] Abonnement supprimé → ${user.id} revient en Free`)
        break
      }

      default:
        // Événements ignorés (pas une erreur)
        break
    }

    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('[webhook] Erreur traitement :', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
