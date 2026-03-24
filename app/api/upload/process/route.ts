/**
 * POST /api/upload/process
 * Reçoit l'URL d'un blob déjà uploadé, télécharge le fichier,
 * parse l'archive ZIP/RAR et enregistre les métadonnées en DB.
 *
 * Cette route ne reçoit PAS le fichier dans son body (évite la limite
 * 4.5 MB de Vercel) — elle reçoit seulement un JSON léger avec l'URL blob.
 */

import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getAuth } from '@/lib/auth'
import { archiveRepo } from '@/lib/db'
import { detectFileType, isSuspiciousFile, cleanupExpiredArchives } from '@/lib/storage'
import { parseZip } from '@/lib/zipParser'
import { parseRar } from '@/lib/rarParser'

export const runtime    = 'nodejs'
export const maxDuration = 60

const FREE_LIMIT    = parseInt(process.env.NEXT_PUBLIC_MAX_FREE_SIZE_MB    || '50')  * 1024 * 1024
const PREMIUM_LIMIT = parseInt(process.env.NEXT_PUBLIC_MAX_PREMIUM_SIZE_MB || '500') * 1024 * 1024

export async function POST(request: Request) {
  cleanupExpiredArchives().catch(console.error)

  try {
    const auth     = await getAuth()
    const plan     = auth?.plan ?? 'free'
    const sizeLimit = plan === 'premium' ? PREMIUM_LIMIT : FREE_LIMIT

    const { blobUrl, fileName, fileSize, sessionId: clientSessionId } =
      await request.json() as {
        blobUrl: string
        fileName: string
        fileSize: number
        sessionId?: string
      }

    const sessionId = clientSessionId || uuidv4()

    if (!blobUrl || !fileName) {
      return NextResponse.json(
        { success: false, error: 'Paramètres manquants (blobUrl, fileName)' },
        { status: 400 }
      )
    }

    if (fileSize > sizeLimit) {
      return NextResponse.json({
        success: false,
        error: plan === 'free'
          ? 'Fichier trop volumineux. Limite gratuit : 50 Mo. Passez au premium pour 500 Mo.'
          : 'Fichier trop volumineux. Maximum : 500 Mo.',
      }, { status: 413 })
    }

    // Téléchargement depuis Vercel Blob (appel interne, rapide)
    const blobResponse = await fetch(blobUrl)
    if (!blobResponse.ok) {
      throw new Error(`Impossible de récupérer le fichier depuis le blob : ${blobResponse.status}`)
    }
    const buffer   = Buffer.from(await blobResponse.arrayBuffer())
    const fileType = detectFileType(buffer)

    if (!fileType) {
      return NextResponse.json({
        success: false,
        error: 'Format invalide. Seuls les fichiers ZIP et RAR sont acceptés.',
      }, { status: 400 })
    }

    const parseResult = fileType === 'zip' ? parseZip(buffer) : await parseRar(buffer)

    const suspiciousFiles = flattenTree(parseResult.tree)
      .filter(e => !e.isDirectory && isSuspiciousFile(e.name))
      .map(e => e.name)

    const ttlHours = plan === 'premium'
      ? parseInt(process.env.FILE_TTL_PREMIUM_HOURS || '48')
      : parseInt(process.env.FILE_TTL_FREE_HOURS   || '2')

    const expiresAt  = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString()
    const archiveId  = uuidv4()

    const archive = await archiveRepo.create({
      id:           archiveId,
      user_id:      auth?.userId ?? null,
      session_id:   auth ? null : sessionId,
      name:         fileName,
      type:         fileType,
      size:         buffer.length,
      file_count:   parseResult.fileCount,
      dir_count:    parseResult.dirCount,
      storage_path: blobUrl,
      tree_json:    JSON.stringify(parseResult.tree),
      expires_at:       expiresAt,
      scan_status:      'pending',
      scan_result:      null,
      scan_started_at:  null,
      scan_finished_at: null,
    })

    return NextResponse.json({
      success: true,
      data: {
        id:         archive.id,
        name:       archive.name,
        type:       archive.type,
        size:       archive.size,
        fileCount:  archive.file_count,
        dirCount:   archive.dir_count,
        uploadedAt: archive.uploaded_at,
        expiresAt:  archive.expires_at,
        tree:       parseResult.tree,
        sessionId,
        warnings:   suspiciousFiles.length > 0
          ? [`Contient des fichiers potentiellement exécutables : ${suspiciousFiles.slice(0, 3).join(', ')}`]
          : [],
      },
    })
  } catch (err) {
    console.error('[upload/process]', err)
    return NextResponse.json(
      { success: false, error: "Échec du traitement de l'archive" },
      { status: 500 }
    )
  }
}

function flattenTree(entries: any[]): any[] {
  const result: any[] = []
  for (const e of entries) {
    result.push(e)
    if (e.children) result.push(...flattenTree(e.children))
  }
  return result
}
