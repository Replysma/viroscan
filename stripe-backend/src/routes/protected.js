// src/routes/protected.js
// Exemples de routes protégées par requirePremium
// À adapter selon tes fonctionnalités métier

const express = require('express')
const router  = express.Router()
const { requireAuth, requirePremium } = require('../middleware/requirePremium')

/**
 * GET /api/premium/dashboard
 * Accessible uniquement aux abonnés premium.
 */
router.get('/premium/dashboard', requireAuth, requirePremium, (req, res) => {
  res.json({
    message: `Bienvenue sur votre dashboard premium, ${req.premiumUser.email} !`,
    features: ['Export illimité', 'API access', 'Support prioritaire'],
  })
})

/**
 * GET /api/premium/export
 * Exemple de fonctionnalité réservée premium.
 */
router.get('/premium/export', requireAuth, requirePremium, async (req, res) => {
  // Ta logique métier ici...
  res.json({ status: 'Export en cours...', userId: req.user.id })
})

/**
 * GET /api/me
 * Route publique : retourne les infos de l'utilisateur connecté.
 */
router.get('/me', requireAuth, async (req, res) => {
  const prisma = require('../config/prisma')
  const user = await prisma.user.findUnique({
    where:  { id: req.user.id },
    select: {
      id:                 true,
      email:              true,
      name:               true,
      isPremium:          true,
      subscriptionStatus: true,
      premiumSince:       true,
    },
  })
  res.json(user)
})

module.exports = router
