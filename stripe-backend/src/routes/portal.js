// src/routes/portal.js
// POST /api/create-billing-portal  — Portail client Stripe
// POST /api/cancel-subscription    — Annulation via API (optionnel)

const express = require('express')
const router  = express.Router()
const stripe  = require('../config/stripe')
const { findUserByStripeCustomerId } = require('../services/userService')
const prisma = require('../config/prisma')

/**
 * POST /api/create-billing-portal
 *
 * Ouvre le portail Stripe permettant à l'utilisateur de :
 *  - Mettre à jour sa carte bancaire
 *  - Voir ses factures
 *  - Annuler son abonnement
 *
 * Body attendu :
 * { customerId: "cus_XXXX" }   ← stripeCustomerId de l'utilisateur
 * OU
 * { userId: "cuid..." }        ← ID interne (on cherche le customerId en BDD)
 */
router.post('/create-billing-portal', async (req, res) => {
  const { customerId, userId, email } = req.body

  try {
    let stripeCustomerId = customerId

    // Résolution du customerId si fourni via userId ou email
    if (!stripeCustomerId) {
      let user = null

      if (userId) {
        user = await prisma.user.findUnique({ where: { id: userId } })
      } else if (email) {
        user = await prisma.user.findUnique({ where: { email } })
      }

      if (!user?.stripeCustomerId) {
        return res.status(400).json({
          error: 'Aucun abonnement Stripe associé à cet utilisateur.',
        })
      }

      stripeCustomerId = user.stripeCustomerId
    }

    // Créer la session du portail Stripe
    const session = await stripe.billingPortal.sessions.create({
      customer:   stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard`, // Retour après le portail
    })

    console.log(`🔗 Portail client créé pour customer ${stripeCustomerId}`)
    res.json({ url: session.url })
  } catch (err) {
    console.error('❌ Erreur create-billing-portal :', err.message)
    res.status(500).json({ error: 'Impossible d\'ouvrir le portail client.' })
  }
})

/**
 * POST /api/cancel-subscription
 *
 * Annule immédiatement l'abonnement via l'API Stripe.
 * Alternative à passer par le portail.
 *
 * Body : { subscriptionId: "sub_XXXX" }
 */
router.post('/cancel-subscription', async (req, res) => {
  const { subscriptionId } = req.body

  if (!subscriptionId) {
    return res.status(400).json({ error: 'subscriptionId manquant.' })
  }

  try {
    // cancel_at_period_end: true → annule à la fin de la période payée
    // false → annule immédiatement
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })

    console.log(`🗑️  Annulation programmée pour sub ${subscriptionId}`)
    res.json({
      message: 'Abonnement annulé à la fin de la période en cours.',
      cancelAt: new Date(subscription.cancel_at * 1000),
    })
  } catch (err) {
    console.error('❌ Erreur cancel-subscription :', err.message)
    res.status(500).json({ error: 'Impossible d\'annuler l\'abonnement.' })
  }
})

module.exports = router
