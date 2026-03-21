/**
 * Client Stripe centralisé.
 * Toutes les constantes Stripe passent par ce fichier.
 */

import Stripe from 'stripe'

// Le client Stripe n'est instancié que si la clé est présente
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

export const STRIPE_ENABLED            = !!process.env.STRIPE_SECRET_KEY
export const STRIPE_PRICE_ID           = process.env.STRIPE_PRICE_ID           ?? ''
export const STRIPE_WEBHOOK_SECRET     = process.env.STRIPE_WEBHOOK_SECRET     ?? ''
export const APP_URL                   = process.env.NEXT_PUBLIC_APP_URL        ?? 'http://localhost:3000'

/** Retourne le client ou lance une erreur si Stripe n'est pas configuré */
export function requireStripe(): Stripe {
  if (!stripe) throw new Error('Stripe non configuré — ajoutez STRIPE_SECRET_KEY dans vos variables d\'environnement')
  return stripe
}
