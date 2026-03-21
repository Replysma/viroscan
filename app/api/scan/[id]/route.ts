/**
 * GET  /api/scan/:id  → statut du scan
 * POST /api/scan/:id  → déclenche le scan (async)
 */

import { NextResponse } from 'next/server'
import { archiveRepo } from '@/lib/db'
import { getArchiveBuffer } from '@/lib/storage'
import { scanArchive } from '@/lib/scanner'
import { getAuth } from '@/lib/auth'
import { getRateLimitIdentifier, checkRateLimit, consumeRateLimit } from '@/lib/rateLimit'

export const runtime    = 'nodejs'
export const maxDuration = 60

interface Params { params: Promise<{ id: string }> }

// Masque les données sensibles pour les utilisateurs gratuits
function redactScanResult(result: any) {
  if (!result || !result.details) return result
  return {
    ...result,
    details: result.details.map(() => ({
      path:    '***',
      threats: ['Passez au Premium pour voir les détails'],
    })),
  }
}

// ─── GET : statut courant ─────────────────────────────────────────────────────

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    const archive = await archiveRepo.findById(id)
    if (!archive) {
      return NextResponse.json({ success: false, error: 'Archive introuvable' }, { status: 404 })
    }

    const authCtx   = await getAuth()
    const isPremium = authCtx?.plan === 'premium'
    const rawResult = archive.scan_result ? JSON.parse(archive.scan_result) : null
    const result    = (!isPremium && rawResult?.details?.length > 0)
      ? redactScanResult(rawResult)
      : rawResult

    return NextResponse.json({
      success: true,
      data: {
        archiveId:      archive.id,
        scanStatus:     archive.scan_status,
        scanResult:     result,
        paywalled:      !isPremium && rawResult?.details?.length > 0,
        scanStartedAt:  archive.scan_started_at,
        scanFinishedAt: archive.scan_finished_at,
      },
    })
  } catch (err) {
    console.error('[scan/get]', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

// ─── POST : déclenche le scan ─────────────────────────────────────────────────

export async function POST(req: Request, { params }: Params) {
  try {
    const { id } = await params
    const archive = await archiveRepo.findById(id)

    if (!archive) {
      return NextResponse.json({ success: false, error: 'Archive introuvable' }, { status: 404 })
    }

    // ── Rate limiting (plan gratuit uniquement) ──
    const authCtx   = await getAuth()
    const isPremium = authCtx?.plan === 'premium'

    if (!isPremium) {
      const identifier = await getRateLimitIdentifier(authCtx?.userId ?? null)
      const rl = await checkRateLimit(identifier)

      if (!rl.allowed) {
        return NextResponse.json({
          success:     false,
          error:       `Limite atteinte : ${rl.limit} analyses gratuites par 24h. Passez au Premium pour des analyses illimitées.`,
          rateLimited: true,
          remaining:   0,
          limit:       rl.limit,
        }, { status: 429 })
      }
      await consumeRateLimit(identifier)
    }

    // Ne pas relancer si déjà en cours ou terminé
    if (archive.scan_status === 'scanning') {
      return NextResponse.json({ success: true, data: { scanStatus: 'scanning' } })
    }
    if (archive.scan_status === 'clean' || archive.scan_status === 'infected' || archive.scan_status === 'suspicious') {
      const result = archive.scan_result ? JSON.parse(archive.scan_result) : null
      return NextResponse.json({ success: true, data: { scanStatus: archive.scan_status, scanResult: result } })
    }

    // Marquer "scanning"
    const startedAt = new Date().toISOString()
    await archiveRepo.updateScan(id, { scan_status: 'scanning', scan_started_at: startedAt })

    // Lire le corps pour savoir si VirusTotal est activé
    let useVT = false
    try {
      const body = await req.json().catch(() => ({}))
      useVT = body?.useVirusTotal === true && !!process.env.VIRUSTOTAL_API_KEY
    } catch { /* pas de body JSON */ }

    // Télécharger l'archive depuis le stockage (Blob ou local)
    let archiveBuffer: Buffer
    try {
      archiveBuffer = await getArchiveBuffer(archive.storage_path)
    } catch (err) {
      await archiveRepo.updateScan(id, {
        scan_status:     'error',
        scan_started_at: startedAt,
        scan_finished_at: new Date().toISOString(),
        scan_result:     JSON.stringify({ error: 'Impossible de lire le fichier' }),
      })
      return NextResponse.json({ success: false, error: 'Impossible de lire le fichier' }, { status: 500 })
    }

    // Lancer le scan
    const report = await scanArchive(archiveBuffer, archive.type as 'zip' | 'rar', useVT)
    const finishedAt = new Date().toISOString()

    await archiveRepo.updateScan(id, {
      scan_status:     report.status === 'error' ? 'error' : report.status,
      scan_result:     JSON.stringify(report),
      scan_started_at: startedAt,
      scan_finished_at: finishedAt,
    })

    console.log(`[scan] Archive ${id} → ${report.status} (${report.filesScanned} fichiers, ${report.scanDurationMs}ms)`)

    const finalResult = (!isPremium && report.details?.length > 0)
      ? redactScanResult(report)
      : report

    return NextResponse.json({
      success: true,
      data: {
        archiveId:      id,
        scanStatus:     report.status,
        scanResult:     finalResult,
        paywalled:      !isPremium && report.details?.length > 0,
        scanStartedAt:  startedAt,
        scanFinishedAt: finishedAt,
      },
    })

  } catch (err) {
    console.error('[scan/post]', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
