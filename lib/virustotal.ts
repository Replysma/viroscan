/**
 * Client VirusTotal API v3
 *
 * Stratégie : lookup par hash SHA-256 uniquement (pas d'upload de fichier).
 * - Respecte la vie privée des utilisateurs (aucun fichier envoyé à VT)
 * - Gratuit jusqu'à 500 requêtes/jour, 4 req/min
 * - Si le hash est inconnu de VT, on retourne 'unknown' (≠ clean)
 *
 * Configuration : VIRUSTOTAL_API_KEY dans .env.local
 */

const VT_BASE = 'https://www.virustotal.com/api/v3'
const VT_TIMEOUT_MS = 8_000

export interface VTResult {
  status:     'clean' | 'infected' | 'suspicious' | 'unknown'
  detections: number
  total:      number
  permalink?: string
}

/** Cache en mémoire pour éviter des requêtes VT redondantes dans la même session */
const cache = new Map<string, VTResult>()

/**
 * Cherche un hash SHA-256 dans la base VirusTotal.
 * Retourne null si VT n'est pas configuré ou si la requête échoue.
 */
export async function lookupHash(sha256: string): Promise<VTResult | null> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY
  if (!apiKey) return null

  // Cache hit
  if (cache.has(sha256)) return cache.get(sha256)!

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), VT_TIMEOUT_MS)

    const res = await fetch(`${VT_BASE}/files/${sha256}`, {
      headers: { 'x-apikey': apiKey },
      signal:  controller.signal,
    }).finally(() => clearTimeout(timer))

    // 404 = fichier inconnu de VT
    if (res.status === 404) {
      const result: VTResult = { status: 'unknown', detections: 0, total: 0 }
      cache.set(sha256, result)
      return result
    }

    // 429 = rate limit dépassé
    if (res.status === 429) {
      console.warn('[virustotal] Rate limit dépassé')
      return null
    }

    if (!res.ok) {
      console.warn(`[virustotal] Erreur HTTP ${res.status}`)
      return null
    }

    const data = await res.json()
    const stats: Record<string, number> = data?.data?.attributes?.last_analysis_stats ?? {}

    const malicious  = stats.malicious  ?? 0
    const suspicious = stats.suspicious ?? 0
    const harmless   = stats.harmless   ?? 0
    const undetected = stats.undetected ?? 0
    const total      = malicious + suspicious + harmless + undetected

    let status: VTResult['status'] = 'clean'
    if (malicious >= 3)  status = 'infected'
    else if (malicious > 0 || suspicious >= 5) status = 'suspicious'

    const result: VTResult = {
      status,
      detections: malicious,
      total,
      permalink:  data?.data?.links?.self,
    }

    cache.set(sha256, result)
    return result

  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn('[virustotal] Timeout')
    } else {
      console.error('[virustotal] Erreur :', err)
    }
    return null
  }
}

/** Vide le cache (utile pour les tests) */
export function clearVTCache() {
  cache.clear()
}
