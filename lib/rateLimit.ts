/**
 * Rate limiting pour les scans.
 * Gratuit : 3 scans par 24h par identifiant (userId ou hash IP).
 * Premium  : illimité.
 */

import { scanUsageRepo } from './db'
import { headers } from 'next/headers'
import crypto from 'crypto'

export const FREE_SCAN_LIMIT = 3

/**
 * Retourne un identifiant stable pour le rate limiting :
 * - Utilisateur connecté → son userId
 * - Anonyme → hash SHA-256 de l'IP (pas de stockage de l'IP brute)
 */
export async function getRateLimitIdentifier(userId: string | null): Promise<string> {
  if (userId) return `user:${userId}`

  const hdrs = await headers()
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    hdrs.get('x-real-ip') ??
    'unknown'

  const hash = crypto.createHash('sha256').update(`ip:${ip}`).digest('hex').slice(0, 16)
  return `ip:${hash}`
}

export interface RateLimitResult {
  allowed:   boolean
  remaining: number   // scans restants aujourd'hui
  limit:     number
  count:     number
}

/**
 * Vérifie si l'identifiant peut encore scanner (plan gratuit).
 * Ne consomme PAS le quota — appeler `consumeRateLimit()` après le scan.
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  await scanUsageRepo.purgeOld().catch(() => {})   // nettoyage silencieux
  const count = await scanUsageRepo.countLast24h(identifier)
  return {
    allowed:   count < FREE_SCAN_LIMIT,
    remaining: Math.max(0, FREE_SCAN_LIMIT - count),
    limit:     FREE_SCAN_LIMIT,
    count,
  }
}

/** Enregistre une utilisation du scan */
export async function consumeRateLimit(identifier: string): Promise<void> {
  await scanUsageRepo.record(identifier)
}
