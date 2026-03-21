/**
 * POST /api/scan
 * Analyse antivirus d'un fichier uploadé (standalone, sans archivage).
 *
 * PAYWALL :
 * - Gratuit  : 3 scans/24h · détails des menaces masqués (noms de fichiers, hashes)
 * - Premium  : illimité · résultats complets
 */

import { NextResponse } from 'next/server'
import { scanArchive } from '@/lib/scanner'
import { detectFileType } from '@/lib/storage'
import { getAuth } from '@/lib/auth'
import { getRateLimitIdentifier, checkRateLimit, consumeRateLimit } from '@/lib/rateLimit'
import path from 'path'

export const runtime    = 'nodejs'
export const maxDuration = 60

const SUSPICIOUS_EXTS = new Set([
  '.exe', '.dll', '.bat', '.cmd', '.com', '.msi', '.vbs', '.vbe',
  '.ps1', '.ps2', '.sh', '.bash', '.elf', '.run',
  '.scr', '.pif', '.lnk', '.reg', '.hta',
])

// ─── Helpers paywall ──────────────────────────────────────────────────────────

function redactDetails(details: { file: string; threat: string }[]) {
  return details.map(() => ({
    file:   '***',
    threat: 'Passez au Premium pour voir les détails de la menace',
  }))
}

// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const authCtx = await getAuth()
    const isPremium = authCtx?.plan === 'premium'

    // ── Rate limiting (plan gratuit uniquement) ──
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

      // Consommer le quota AVANT le scan (évite les doubles soumissions)
      await consumeRateLimit(identifier)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const MAX_SIZE = 500 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: 'Fichier trop volumineux (max 500 Mo)' }, { status: 413 })
    }

    const start  = Date.now()
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext    = path.extname(file.name).toLowerCase()
    const details: { file: string; threat: string }[] = []

    // 1. Archive → scan récursif
    const archiveType = detectFileType(buffer)

    if (archiveType === 'zip' || archiveType === 'rar') {
      const report   = await scanArchive(buffer, archiveType, !!process.env.VIRUSTOTAL_API_KEY)
      const duration = `${((Date.now() - start) / 1000).toFixed(2)}s`

      const rawDetails = report.details.map(d => ({
        file:   d.path,
        threat: d.threats[0] ?? 'Menace détectée',
      }))

      return NextResponse.json({
        success: true,
        data: {
          status:       report.status === 'error' ? 'suspicious' : report.status,
          details:      isPremium ? rawDetails : redactDetails(rawDetails),
          paywalled:    !isPremium && rawDetails.length > 0,
          duration,
          fileSize:     file.size,
          fileName:     file.name,
          filesScanned: report.filesScanned,
          threatsFound: report.threatsFound,
          isZipBomb:    report.isZipBomb,
        },
      })
    }

    // 2. Fichier non-archive : heuristique
    let status: 'clean' | 'infected' | 'suspicious' = 'clean'

    if (SUSPICIOUS_EXTS.has(ext)) {
      status = 'suspicious'
      details.push({ file: file.name, threat: `Extension exécutable : ${ext}` })
    }

    if (buffer[0] === 0x4D && buffer[1] === 0x5A) {
      status = 'infected'
      details.push({ file: file.name, threat: 'Exécutable Windows (PE) détecté par signature' })
    } else if (buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
      status = 'infected'
      details.push({ file: file.name, threat: 'Exécutable Linux (ELF) détecté par signature' })
    } else if (buffer[0] === 0xCA && buffer[1] === 0xFE && buffer[2] === 0xBA && buffer[3] === 0xBE) {
      status = 'suspicious'
      details.push({ file: file.name, threat: 'Bytecode Java détecté par signature' })
    }

    const imageExts    = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'])
    const docExts      = new Set(['.pdf', '.doc', '.docx', '.txt', '.csv'])
    const isImageOrDoc = imageExts.has(ext) || docExts.has(ext)
    if (isImageOrDoc && details.some(d => d.threat.includes('détecté par signature'))) {
      details.push({ file: file.name, threat: `Discordance : extension ${ext} mais contenu exécutable` })
      status = 'infected'
    }

    if (process.env.VIRUSTOTAL_API_KEY) {
      try {
        const crypto = await import('crypto')
        const sha256 = crypto.createHash('sha256').update(buffer).digest('hex')
        const { lookupHash } = await import('@/lib/virustotal')
        const vt = await lookupHash(sha256)
        if (vt && vt.status === 'infected') {
          status = 'infected'
          details.push({ file: file.name, threat: `VirusTotal : ${vt.detections}/${vt.total} moteurs positifs` })
        } else if (vt && vt.status === 'suspicious' && status === 'clean') {
          status = 'suspicious'
          details.push({ file: file.name, threat: `VirusTotal : suspect (${vt.detections}/${vt.total})` })
        }
      } catch { /* VT optionnel */ }
    }

    const duration = `${((Date.now() - start) / 1000).toFixed(2)}s`

    return NextResponse.json({
      success: true,
      data: {
        status,
        details:      isPremium ? details : redactDetails(details),
        paywalled:    !isPremium && details.length > 0,
        duration,
        fileSize:     file.size,
        fileName:     file.name,
        filesScanned: 1,
        threatsFound: details.length,
      },
    })

  } catch (err) {
    console.error('[scan/standalone]', err)
    return NextResponse.json({ success: false, error: "Échec de l'analyse" }, { status: 500 })
  }
}
