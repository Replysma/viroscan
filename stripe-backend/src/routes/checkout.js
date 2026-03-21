// src/routes/checkout.js
// POST /api/create-checkout-session

const express = require('express')
const router  = express.Router()
const stripe  = require('../config/stripe')
const { findOrCreateUser } = require('../services/userService')

/**
 * POST /api/create-checkout-session
 *
 * Body attendu :
 * {
 *   email: "user@example.com",    // obligatoire
 *   userId: "cuid...",            // optionnel si tu as déjà l'ID interne
 *   name: "Jean Dupont"           // optionnel
 * }
 *
 * Réponse :
 * { url: "https://checkout.stripe.com/..." }
 */
router.post('/create-checkout-session', async (req, res) => {
  const { email, userId, name } = req.body

  // ── Validation ─────────────────────────────────────────────────────────────
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Email invalide ou manquant.' })
  }

  try {
    // ── 1. Trouver ou créer l'utilisateur en base ───────────────────────────
    const user = await findOrCreateUser(email, name)

    // ── 2. Réutiliser le customer Stripe existant si disponible ────────────
    //    → évite de créer des doublons dans Stripe Dashboard
    let customerId = user.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name:  user.name || undefined,
        metadata: { userId: user.id }, // CRITIQUE : lien Stripe ↔ BDD
      })
      customerId = customer.id
      console.log(`🆕 Customer Stripe créé : ${customerId} pour ${email}`)
    }

    // ── 3. Créer la session Checkout ────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode:                'subscription',
      customer:            customerId,
      payment_method_types: ['card'],

      line_items: [
        {
          price:    process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],

      // ⚠️ SÉCURITÉ : metadata transmise au webhook → permet d'identifier l'user
      subscription_data: {
        metadata: {
          userId:       user.id,
          userEmail:    user.email,
        },
      },

      // ── Essai gratuit (optionnel — décommenter pour activer) ──────────────
      // subscription_data: {
      //   trial_period_days: 14,
      //   metadata: { userId: user.id, userEmail: user.email },
      // },

      success_url: `${process.env.SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  process.env.CANCEL_URL,

      // Pré-remplir l'email sur la page Stripe
      customer_email: customerId ? undefined : email,

      // Permet à l'utilisateur de changer de quantité (mettre false pour SaaS)
      allow_promotion_codes: true,
    })

    console.log(`💳 Session Checkout créée : ${session.id} pour ${email}`)

    res.json({ url: session.url })
  } catch (err) {
    console.error('❌ Erreur create-checkout-session :', err.message)
    res.status(500).json({ error: 'Impossible de créer la session de paiement.' })
  }
})

module.exports = router
