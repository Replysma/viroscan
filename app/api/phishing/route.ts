import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// Domaines officiels connus — vérification locale rapide avant Claude
const TRUSTED_DOMAINS = new Set([
  'gmail.com','googlemail.com','google.com','outlook.com','hotmail.com',
  'live.com','msn.com','microsoft.com','yahoo.com','yahoo.fr','icloud.com',
  'me.com','mac.com','apple.com','protonmail.com','proton.me','tutanota.com',
  'orange.fr','sfr.fr','free.fr','laposte.net','wanadoo.fr','bouygues.com',
  'paypal.com','amazon.com','amazon.fr','ebay.com','ebay.fr','netflix.com',
  'spotify.com','linkedin.com','facebook.com','twitter.com','x.com',
  'instagram.com','github.com','gitlab.com','stackoverflow.com',
])

// Patterns de typosquatting courants
const TYPOSQUAT_PATTERNS: { pattern: RegExp; brand: string }[] = [
  { pattern: /p[a4]yp[a4]l/i,          brand: 'PayPal'    },
  { pattern: /micros[o0]ft/i,           brand: 'Microsoft' },
  { pattern: /g[o0]{2}gle/i,            brand: 'Google'    },
  { pattern: /app1e|appl[e3]/i,         brand: 'Apple'     },
  { pattern: /amaz[o0]n/i,             brand: 'Amazon'    },
  { pattern: /netfl[i1]x/i,            brand: 'Netflix'   },
  { pattern: /faceb[o0]{2}k/i,         brand: 'Facebook'  },
  { pattern: /[il1]nstagram/i,         brand: 'Instagram' },
  { pattern: /tw[i1]tter/i,            brand: 'Twitter'   },
  { pattern: /[il1]nked[il1]n/i,       brand: 'LinkedIn'  },
  { pattern: /\bgma[il1]\b/i,          brand: 'Gmail'     },
]

function quickCheck(domain: string): { suspicious: boolean; reason: string | null } {
  const d = domain.toLowerCase()

  // Domaine de confiance connu
  if (TRUSTED_DOMAINS.has(d)) {
    return { suspicious: false, reason: null }
  }

  // Typosquatting connu
  for (const { pattern, brand } of TYPOSQUAT_PATTERNS) {
    if (pattern.test(d)) {
      return { suspicious: true, reason: `Imitation possible de ${brand}` }
    }
  }

  // Substitutions chiffres/lettres suspectes
  if (/[0-9]/.test(d) && /[a-z]/.test(d)) {
    const digits = (d.match(/[0-9]/g) || []).length
    if (digits >= 2) {
      return { suspicious: true, reason: 'Plusieurs chiffres dans le domaine (substitution suspecte)' }
    }
  }

  // Tirets excessifs
  const dashes = (d.match(/-/g) || []).length
  if (dashes >= 3) {
    return { suspicious: true, reason: 'Nombre anormal de tirets dans le domaine' }
  }

  return { suspicious: false, reason: null }
}

export async function POST(req: NextRequest) {
  let email: string
  try {
    ;({ email } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email requis' }, { status: 400 })
  }

  email = email.trim().toLowerCase()

  // Validation format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({
      email,
      score:   'danger',
      label:   'Format invalide',
      summary: 'L\'adresse email fournie n\'est pas au format valide (ex: nom@domaine.com).',
      details: ['Format d\'email incorrect'],
      domain:  email.split('@')[1] ?? '',
    })
  }

  const [, domain] = email.split('@')

  // Vérification rapide locale
  const quick = quickCheck(domain)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Fallback sans Claude : résultat basé sur l'analyse locale uniquement
    const isTrusted = TRUSTED_DOMAINS.has(domain.toLowerCase())
    return NextResponse.json({
      email,
      domain,
      score:   isTrusted ? 'safe' : quick.suspicious ? 'danger' : 'suspect',
      label:   isTrusted ? 'Domaine connu' : quick.suspicious ? 'Dangereux' : 'Non vérifié',
      summary: isTrusted
        ? `${domain} est un domaine officiel reconnu.`
        : quick.suspicious
          ? `${domain} présente des caractéristiques de typosquatting.`
          : `${domain} n'est pas dans notre base de domaines connus. Analyse Claude non disponible (clé API manquante).`,
      details: quick.reason ? [quick.reason] : [],
      aiPowered: false,
    })
  }

  try {
    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `Tu es un expert en cybersécurité spécialisé dans la détection du phishing.

Analyse cette adresse email : "${email}"
Domaine : "${domain}"
${quick.suspicious ? `Alerte locale détectée : ${quick.reason}` : ''}

Évalue le risque de phishing et réponds UNIQUEMENT avec ce JSON (aucun texte avant/après) :
{
  "score": "safe" | "suspect" | "danger",
  "label": "titre court (max 4 mots)",
  "summary": "explication en 1-2 phrases",
  "details": ["raison 1", "raison 2", "raison 3"]
}

Critères :
- safe   = domaine officiel connu et légitime
- suspect = domaine inconnu, ambigu ou récent sans signe clair de fraude
- danger  = typosquatting, imitation de marque, substitutions chiffres/lettres, domaine jetable`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    // Extraire le JSON même si Claude ajoute du texte autour
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Réponse Claude non parseable')

    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      email,
      domain,
      score:      ['safe','suspect','danger'].includes(parsed.score) ? parsed.score : 'suspect',
      label:      parsed.label   ?? 'Analyse terminée',
      summary:    parsed.summary ?? '',
      details:    Array.isArray(parsed.details) ? parsed.details : [],
      aiPowered:  true,
    })

  } catch (err: any) {
    console.error('[phishing] Erreur Claude:', err.message)
    return NextResponse.json({ error: 'Erreur d\'analyse', detail: err.message }, { status: 500 })
  }
}
