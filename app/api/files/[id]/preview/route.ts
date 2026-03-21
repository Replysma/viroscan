/**
 * GET /api/files/[id]/preview?path=some/file.txt
 *
 * Lit l'archive depuis Vercel Blob (fetch URL) au lieu du disque local.
 */

import { NextResponse } from 'next/server'
import path from 'path'
import mime from 'mime-types'
import { archiveRepo } from '@/lib/db'
import { getArchiveBuffer, isSafeEntryPath } from '@/lib/storage'
import { extractFileFromZip, isTextFile, isImageFile, isPdfFile } from '@/lib/zipParser'
import { extractFileFromRar } from '@/lib/rarParser'

export const maxDuration = 30

const TEXT_PREVIEW_LIMIT  = 500  * 1024   // 500 Ko
const IMAGE_PREVIEW_LIMIT = 10   * 1024 * 1024  // 10 Mo

interface Params { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const { id: archiveId } = await params
  try {
    const url      = new URL(request.url)
    const filePath = url.searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ success: false, error: 'Paramètre path requis' }, { status: 400 })
    }
    if (!isSafeEntryPath(filePath)) {
      return NextResponse.json({ success: false, error: 'Chemin invalide' }, { status: 400 })
    }

    const archive = await archiveRepo.findById(archiveId)
    if (!archive) {
      return NextResponse.json({ success: false, error: 'Archive introuvable' }, { status: 404 })
    }
    if (new Date(archive.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: 'Archive expirée' }, { status: 410 })
    }

    // Télécharge le contenu depuis Vercel Blob
    const archiveBuffer = await getArchiveBuffer(archive.storage_path)

    let fileBuffer: Buffer | null = null
    if (archive.type === 'zip') {
      fileBuffer = extractFileFromZip(archiveBuffer, filePath)
    } else {
      fileBuffer = await extractFileFromRar(archiveBuffer, filePath)
    }

    if (!fileBuffer) {
      return NextResponse.json({ success: false, error: 'Fichier introuvable dans l\'archive' }, { status: 404 })
    }

    const filename = path.basename(filePath)
    const mimeType = mime.lookup(filename) || 'application/octet-stream'

    if (isTextFile(filename)) {
      const content = fileBuffer.slice(0, TEXT_PREVIEW_LIMIT).toString('utf8')
      return NextResponse.json({
        success: true,
        data: {
          path:      filePath,
          content,
          mimeType,
          isText:    true,
          isBinary:  false,
          size:      fileBuffer.length,
          truncated: fileBuffer.length > TEXT_PREVIEW_LIMIT,
        },
      })
    }

    if (isImageFile(filename)) {
      if (fileBuffer.length > IMAGE_PREVIEW_LIMIT) {
        return NextResponse.json({ success: false, error: 'Image trop volumineuse pour la prévisualisation' }, { status: 413 })
      }
      const base64 = fileBuffer.toString('base64')
      return NextResponse.json({
        success: true,
        data: {
          path:     filePath,
          content:  `data:${mimeType};base64,${base64}`,
          mimeType,
          isText:   false,
          isBinary: true,
          size:     fileBuffer.length,
        },
      })
    }

    if (isPdfFile(filename)) {
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type':        'application/pdf',
          'Content-Disposition': `inline; filename="${filename}"`,
          'Content-Length':      String(fileBuffer.length),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        path:               filePath,
        content:            null,
        mimeType,
        isText:             false,
        isBinary:           true,
        size:               fileBuffer.length,
        previewUnsupported: true,
      },
    })
  } catch (err) {
    console.error('[files/preview]', err)
    return NextResponse.json({ success: false, error: "Échec de l'extraction" }, { status: 500 })
  }
}
