// src/services/userService.js
// Toute la logique métier liée aux utilisateurs et abonnements

const prisma = require('../config/prisma')

/**
 * Trouve ou crée un utilisateur par email.
 * Utilisé lors de la création de la checkout session.
 */
async function findOrCreateUser(email, name = null) {
  let user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    user = await prisma.user.create({
      data: { email, name },
    })
    console.log(`👤 Nouvel utilisateur créé : ${email}`)
  }

  return user
}

/**
 * Trouve un utilisateur par son stripeCustomerId.
 */
async function findUserByStripeCustomerId(stripeCustomerId) {
  return prisma.user.findUnique({ where: { stripeCustomerId } })
}

/**
 * Trouve un utilisateur par son subscriptionId.
 */
async function findUserBySubscriptionId(subscriptionId) {
  return prisma.user.findUnique({ where: { subscriptionId } })
}

/**
 * Active le premium pour un utilisateur.
 * Appelé après checkout.session.completed et invoice.payment_succeeded.
 *
 * @param {string} userId - ID interne de l'utilisateur
 * @param {string} stripeCustomerId - customer_XXXX
 * @param {string} subscriptionId - sub_XXXX
 * @param {string} status - statut Stripe (active, trialing…)
 */
async function activatePremium(userId, stripeCustomerId, subscriptionId, status = 'active') {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isPremium:          true,
      premiumSince:       new Date(),
      stripeCustomerId,
      subscriptionId,
      subscriptionStatus: status,
    },
  })

  console.log(`✅ Premium activé pour ${user.email} (sub: ${subscriptionId})`)
  return user
}

/**
 * Désactive le premium pour un utilisateur.
 * Appelé après invoice.payment_failed et customer.subscription.deleted.
 *
 * @param {string} userId - ID interne de l'utilisateur
 * @param {string} reason - 'payment_failed' | 'subscription_canceled' | 'unpaid'
 */
async function deactivatePremium(userId, reason = 'unknown') {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isPremium:          false,
      subscriptionStatus: reason === 'subscription_canceled' ? 'canceled' : 'past_due',
    },
  })

  console.log(`🚫 Premium désactivé pour ${user.email} — raison : ${reason}`)
  return user
}

/**
 * Met à jour uniquement le statut de l'abonnement.
 */
async function updateSubscriptionStatus(userId, status) {
  return prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: status },
  })
}

module.exports = {
  findOrCreateUser,
  findUserByStripeCustomerId,
  findUserBySubscriptionId,
  activatePremium,
  deactivatePremium,
  updateSubscriptionStatus,
}
