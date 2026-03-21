/**
 * GET /api/setup
 *
 * Initialise le schéma de la base de données Vercel Postgres.
 * À appeler UNE SEULE FOIS après le premier déploiement sur Vercel.
 *
 * Protégé par une clé secrète : ?key=SETUP_SECRET_KEY
 * (Configurer SETUP_SECRET dans les variables d'environnement Vercel)
 */

import { NextResponse } from 'next/server'
import { initSchema } from '@/lib/db'

export async function GET(request: Request) {
  const url       = new URL(request.url)
  const key       = url.searchParams.get('key')
  const secretKey = process.env.SETUP_SECRET

  // Protection basique : clé requise en production
  if (process.env.NODE_ENV === 'production') {
    if (!secretKey || key !== secretKey) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 })
    }
  }

  try {
    await initSchema()
    return NextResponse.json({
      success: true,
      message: 'Schéma initialisé avec succès (tables users + archives + scan_usage créées, colonnes Stripe migrées)',
    })
  } catch (err) {
    console.error('[setup]', err)
    return NextResponse.json({
      success: false,
      error: String(err),
    }, { status: 500 })
  }
}
