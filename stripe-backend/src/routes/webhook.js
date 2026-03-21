// src/routes/webhook.js
// POST /webhook — Handler Stripe webhook COMPLET
//
// ⚠️ Ce handler doit recevoir le body RAW (Buffer).
//    Dans index.js, il est enregistré AVANT express.json() avec :
//    app.post('/webhook', express.raw({ type: 'application/json' }), webhookHandler)

const express = require('express')
const router  = express.Router()
const stripe  = require('../config/stripe')
const {
  findUserByStripeCustomerId,
  findUserBySubscriptionId,
  activatePremium,
  deactivatePremium,
  updateSubscriptionStatus,
} = require('../services/userService')
const prisma = require('../config/prisma')

// ─────────────────────────────────────────────────────────────────────────────
// Handlers par type d'événement
// ─────────────────────────────────────────────────────────────────────────────

/**
 * checkout.session.completed
 * → L'utilisateur a payé avec succès la 1ère fois.
 * → On active immédiatement le premium.
 */
async function handleCheckoutCompleted(session) {
  console.log('📥 checkout.session.completed :', session.id)

  // Sécurité : on n'active que les sessions de type subscription
  if (session.mode !== 'subscription') {
    console.log('⏭️  Session non-subscription, ignorée.')
    return
  }

  const customerId     = session.customer
  const subscriptionId = session.subscription

  // Récupérer les metadata de la subscription pour avoir userId
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId       = subscription.metadata?.userId

  if (!userId) {
    // Fallback : chercher par email si pas de metadata
    console.warn('⚠️  userId absent des metadata, fallback par customer')
    const customer = await stripe.customers.retrieve(customerId)
    const user     = await findUserByStripeCustomerId(customerId)

    if (!user) {
      console.error(`❌ Aucun utilisateur trouvé pour customer ${customerId}`)
      return
    }

    await activatePremium(user.id, customerId, subscriptionId, subscription.status)
    return
  }

  await activatePremium(userId, customerId, subscriptionId, subscription.status)
}

/**
 * invoice.payment_succeeded
 * → Renouvellement mensuel réussi.
 * → On s'assure que le premium est bien actif (cas où il avait été suspendu).
 */
async function handlePaymentSucceeded(invoice) {
  console.log('📥 invoice.payment_succeeded :', invoice.id)

  // Ignorer la 1ère facture (déjà traitée par checkout.session.completed)
  if (invoice.billing_reason === 'subscription_create') {
    console.log('⏭️  Facture de création, déjà traitée par checkout.completed.')
    return
  }

  const customerId     = invoice.customer
  const subscriptionId = invoice.subscription

  const user = await findUserByStripeCustomerId(customerId)

  if (!user) {
    console.error(`❌ Aucun utilisateur pour customer ${customerId}`)
    return
  }

  // Réactiver si le compte était suspendu pour non-paiement
  if (!user.isPremium) {
    console.log(`♻️  Réactivation premium pour ${user.email}`)
    await activatePremium(user.id, customerId, subscriptionId, 'active')
  } else {
    // Juste mettre à jour le statut
    await updateSubscriptionStatus(user.id, 'active')
    console.log(`✅ Renouvellement OK pour ${user.email}`)
  }
}

/**
 * invoice.payment_failed
 * → Paiement échoué (carte expirée, fonds insuffisants…).
 * → On désactive le premium immédiatement (ou après une période de grâce, selon ta politique).
 */
async function handlePaymentFailed(invoice) {
  console.log('📥 invoice.payment_failed :', invoice.id)

  const customerId = invoice.customer
  const user       = await findUserByStripeCustomerId(customerId)

  if (!user) {
    console.error(`❌ Aucun utilisateur pour customer ${customerId}`)
    return
  }

  await deactivatePremium(user.id, 'payment_failed')
  console.log(`🚫 Accès premium suspendu pour ${user.email} (paiement échoué)`)

  // TODO: envoyer un email de relance à user.email
}

/**
 * customer.subscription.deleted
 * → L'utilisateur a annulé ou l'abonnement a été supprimé (ex: après plusieurs échecs).
 * → On désactive définitivement le premium.
 */
async function handleSubscriptionDeleted(subscription) {
  console.log('📥 customer.subscription.deleted :', subscription.id)

  const customerId = subscription.customer
  const user       = await findUserByStripeCustomerId(customerId)

  if (!user) {
    // Fallback par subscriptionId
    const userBySub = await findUserBySubscriptionId(subscription.id)
    if (!userBySub) {
      console.error(`❌ Aucun utilisateur pour subscription ${subscription.id}`)
      return
    }
    await deactivatePremium(userBySub.id, 'subscription_canceled')
    return
  }

  await deactivatePremium(user.id, 'subscription_canceled')
  console.log(`🗑️  Abonnement annulé pour ${user.email}`)
}

/**
 * customer.subscription.updated
 * → Changement de plan, de statut (trialing → active, etc.)
 * → On synchronise le statut en BDD.
 */
async function handleSubscriptionUpdated(subscription) {
  console.log('📥 customer.subscription.updated :', subscription.id)

  const user = await findUserByStripeCustomerId(subscription.customer)
  if (!user) return

  const isActive = ['active', 'trialing'].includes(subscription.status)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isPremium:          isActive,
      subscriptionStatus: subscription.status,
    },
  })

  console.log(`🔄 Statut abonnement mis à jour → ${subscription.status} pour ${user.email}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Route principale du webhook
// ─────────────────────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const sig           = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET manquant dans .env')
    return res.status(500).send('Configuration webhook manquante.')
  }

  // ── 1. Vérification de la signature Stripe (OBLIGATOIRE en production) ────
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    // Signature invalide → requête non authentique ou body modifié
    console.error(`❌ Signature webhook invalide : ${err.message}`)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  console.log(`\n🔔 Webhook reçu : ${event.type} [${event.id}]`)

  // ── 2. Idempotence : éviter de traiter 2x le même événement ──────────────
  //    Stripe peut envoyer le même event plusieurs fois en cas d'erreur réseau.
  //    En production, enregistre event.id dans ta BDD et vérifie s'il existe déjà.
  //    (Simplifié ici pour la lisibilité)

  // ── 3. Dispatch vers le bon handler ───────────────────────────────────────
  try {
    switch (event.type) {

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break

      default:
        // Events non gérés → loguer sans erreur
        console.log(`⏭️  Event ignoré : ${event.type}`)
    }
  } catch (err) {
    console.error(`❌ Erreur lors du traitement de ${event.type} :`, err)
    // Retourner 500 → Stripe retentera l'envoi (comportement voulu)
    return res.status(500).json({ error: 'Erreur interne lors du traitement du webhook.' })
  }

  // ── 4. Toujours répondre 200 rapidement ───────────────────────────────────
  //    Stripe considère l'event comme échoué si on ne répond pas en < 30s.
  res.json({ received: true })
})

module.exports = router
