/**
 * GET /api/files/[id]/download?path=some/file.txt
 *
 * Lit l'archive depuis Vercel Blob au lieu du disque local.
 */

import { NextResponse } from 'next/server'
import path from 'path'
import mime from 'mime-types'
import AdmZip from 'adm-zip'
import { archiveRepo } from '@/lib/db'
import { getArchiveBuffer, isSafeEntryPath } from '@/lib/storage'
import { extractFileFromZip } from '@/lib/zipParser'
import { extractFileFromRar } from '@/lib/rarParser'
import { ArchiveEntry } from '@/types'

export const maxDuration = 60

interface Params { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const { id } = await params
  try {
    const url      = new URL(request.url)
    const filePath = url.searchParams.get('path') || ''

    if (!isSafeEntryPath(filePath || '.')) {
      return NextResponse.json({ success: false, error: 'Chemin invalide' }, { status: 400 })
    }

    const archive = await archiveRepo.findById(id)
    if (!archive) {
      return NextResponse.json({ success: false, error: 'Archive introuvable' }, { status: 404 })
    }
    if (new Date(archive.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: 'Archive expirée' }, { status: 410 })
    }

    // Télécharge depuis Vercel Blob
    const archiveBuffer = await getArchiveBuffer(archive.storage_path)
    const tree: ArchiveEntry[] = JSON.parse(archive.tree_json)

    const entry = filePath ? findEntry(tree, filePath) : null
    const isDir = entry?.isDirectory || filePath === '' || filePath.endsWith('/')

    if (isDir) {
      if (!filePath) {
        // Télécharger l'archive originale entière
        const mimeType = archive.type === 'zip' ? 'application/zip' : 'application/x-rar-compressed'
        return new NextResponse(archiveBuffer, {
          headers: {
            'Content-Type':        mimeType,
            'Content-Disposition': `attachment; filename="${archive.name}"`,
            'Content-Length':      String(archiveBuffer.length),
          },
        })
      }

      // Télécharger un sous-dossier en ZIP
      const allFiles = flattenTree(tree).filter(e => !e.isDirectory && e.path.startsWith(filePath))
      const outZip   = new AdmZip()

      for (const file of allFiles) {
        let fileBuffer: Buffer | null = null
        if (archive.type === 'zip') {
          fileBuffer = extractFileFromZip(archiveBuffer, file.path)
        } else {
          fileBuffer = await extractFileFromRar(archiveBuffer, file.path)
        }
        if (fileBuffer) {
          outZip.addFile(file.path.slice(filePath.length), fileBuffer)
        }
      }

      const folderName = path.basename(filePath.replace(/\/$/, ''))
      const zipBuffer  = outZip.toBuffer()

      return new NextResponse(zipBuffer, {
        headers: {
          'Content-Type':        'application/zip',
          'Content-Disposition': `attachment; filename="${folderName}.zip"`,
          'Content-Length':      String(zipBuffer.length),
        },
      })
    }

    // Télécharger un fichier unique
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

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type':        mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(fileBuffer.length),
      },
    })
  } catch (err) {
    console.error('[files/download]', err)
    return NextResponse.json({ success: false, error: "Échec de l'extraction" }, { status: 500 })
  }
}

function findEntry(tree: ArchiveEntry[], targetPath: string): ArchiveEntry | null {
  for (const entry of tree) {
    if (entry.path === targetPath) return entry
    if (entry.children) {
      const found = findEntry(entry.children, targetPath)
      if (found) return found
    }
  }
  return null
}

function flattenTree(entries: ArchiveEntry[]): ArchiveEntry[] {
  const result: ArchiveEntry[] = []
  for (const e of entries) {
    result.push(e)
    if (e.children) result.push(...flattenTree(e.children))
  }
  return result
}
