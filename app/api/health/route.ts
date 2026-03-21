/**
 * GET /api/health
 * Health check pour Railway (et tout reverse-proxy/load balancer).
 * Vérifie la connectivité DB si Postgres est configuré.
 */

import { NextResponse } from 'next/server'

export const runtime    = 'nodejs'
export const dynamic    = 'force-dynamic'

export async function GET() {
  const checks: Record<string, string> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime:    `${Math.floor(process.uptime())}s`,
  }

  // Vérification DB (optionnelle — ne fait pas échouer le health check)
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    try {
      const { query } = await import('@/lib/pg-adapter')
      await query('SELECT 1')
      checks.database = 'ok'
    } catch (err: any) {
      checks.database = `error: ${err.message}`
    }
  } else {
    checks.database = 'sqlite (local)'
  }

  // Vérification storage
  checks.storage = process.env.S3_BUCKET_NAME
    ? 's3'
    : process.env.BLOB_READ_WRITE_TOKEN
      ? 'vercel-blob'
      : 'local-fs'

  const allOk = !checks.database?.startsWith('error')

  return NextResponse.json(checks, { status: allOk ? 200 : 503 })
}
