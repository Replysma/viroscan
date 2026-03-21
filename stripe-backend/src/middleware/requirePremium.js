// src/middleware/requirePremium.js
// Middleware de protection des routes premium

const prisma = require('../config/prisma')

/**
 * requirePremium
 *
 * Vérifie que l'utilisateur authentifié a un abonnement premium actif.
 *
 * Usage :
 *   router.get('/feature-premium', requireAuth, requirePremium, handler)
 *
 * Pré-requis : un middleware d'auth doit avoir placé l'userId dans req.user.id
 * (ex: Clerk, JWT, session…)
 *
 * ⚠️ SÉCURITÉ : on vérifie TOUJOURS en BDD, jamais en se fiant au frontend.
 *    Le champ isPremium est mis à jour uniquement via les webhooks Stripe.
 */
async function requirePremium(req, res, next) {
  // 1. Vérifier que l'auth middleware a bien placé l'user dans la requête
  const userId = req.user?.id

  if (!userId) {
    return res.status(401).json({
      error: 'Non authentifié.',
      code:  'UNAUTHENTICATED',
    })
  }

  try {
    // 2. Vérification en base de données (source de vérité)
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { id: true, email: true, isPremium: true, subscriptionStatus: true },
    })

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur introuvable.',
        code:  'USER_NOT_FOUND',
      })
    }

    // 3. Vérification de l'accès premium
    if (!user.isPremium) {
      return res.status(403).json({
        error:  'Cette fonctionnalité nécessite un abonnement premium.',
        code:   'PREMIUM_REQUIRED',
        status: user.subscriptionStatus || 'none',
        // L'app frontend peut utiliser ce code pour afficher le bon message
      })
    }

    // 4. Accès autorisé → passer au handler suivant
    req.premiumUser = user // disponible dans le handler si besoin
    next()
  } catch (err) {
    console.error('❌ Erreur requirePremium :', err)
    res.status(500).json({ error: 'Erreur de vérification des droits.' })
  }
}

/**
 * requireAuth (simplifié)
 *
 * Exemple de middleware d'authentification par userId en header.
 * ⚠️  En production, remplace par ton vrai système (JWT, Clerk, session…).
 *
 * Usage avec Clerk :
 *   const { clerkMiddleware, getAuth } = require('@clerk/express')
 *   app.use(clerkMiddleware())
 *   // dans le handler : const { userId } = getAuth(req)
 */
async function requireAuth(req, res, next) {
  // ── Exemple JWT (décommenter et adapter) ────────────────────────────────
  // const token = req.headers.authorization?.split(' ')[1]
  // if (!token) return res.status(401).json({ error: 'Token manquant.' })
  // try {
  //   const payload = jwt.verify(token, process.env.JWT_SECRET)
  //   req.user = { id: payload.userId }
  //   next()
  // } catch {
  //   res.status(401).json({ error: 'Token invalide.' })
  // }

  // ── Version simplifiée pour les tests (header X-User-Id) ────────────────
  const userId = req.headers['x-user-id']
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié (x-user-id manquant).' })
  }
  req.user = { id: userId }
  next()
}

module.exports = { requirePremium, requireAuth }
