/**
 * GET /api/files/[id]/render?path=some/file.docx
 *
 * Convertit DOCX / XLSX / XLS / ODS / CSV en HTML sécurisé côté serveur.
 * Le HTML renvoyé est :
 *  - purgé de tout script (sanitize-html)
 *  - rendu côté client dans un <iframe sandbox srcdoc="…"> (zéro JS exécutable)
 */

import { NextResponse } from 'next/server'
import path from 'path'
import { archiveRepo } from '@/lib/db'
import { getArchiveBuffer, isSafeEntryPath } from '@/lib/storage'
import { extractFileFromZip } from '@/lib/zipParser'
import { extractFileFromRar } from '@/lib/rarParser'
import sanitizeHtml from 'sanitize-html'

export const runtime     = 'nodejs'
export const maxDuration = 30

const DOCX_LIMIT = 20 * 1024 * 1024  // 20 Mo
const XLSX_LIMIT = 10 * 1024 * 1024  // 10 Mo

const DOCX_EXTS = new Set(['docx', 'doc'])
const XLSX_EXTS = new Set(['xlsx', 'xls', 'ods', 'csv'])

interface Params { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const { id: archiveId } = await params
  const url      = new URL(request.url)
  const filePath = url.searchParams.get('path')

  if (!filePath)
    return NextResponse.json({ error: 'Paramètre path requis' }, { status: 400 })
  if (!isSafeEntryPath(filePath))
    return NextResponse.json({ error: 'Chemin invalide' }, { status: 400 })

  const archive = await archiveRepo.findById(archiveId)
  if (!archive)
    return NextResponse.json({ error: 'Archive introuvable' }, { status: 404 })
  if (new Date(archive.expires_at) < new Date())
    return NextResponse.json({ error: 'Archive expirée' }, { status: 410 })

  const archiveBuffer = await getArchiveBuffer(archive.storage_path)

  let fileBuffer: Buffer | null = null
  if (archive.type === 'zip') {
    fileBuffer = extractFileFromZip(archiveBuffer, filePath)
  } else {
    fileBuffer = await extractFileFromRar(archiveBuffer, filePath)
  }

  if (!fileBuffer)
    return NextResponse.json({ error: "Fichier introuvable dans l'archive" }, { status: 404 })

  const filename = path.basename(filePath)
  const ext      = filename.split('.').pop()?.toLowerCase() ?? ''

  try {
    // ── DOCX / DOC ──────────────────────────────────────────────────────────
    if (DOCX_EXTS.has(ext)) {
      if (fileBuffer.length > DOCX_LIMIT)
        return NextResponse.json({ error: 'Fichier trop volumineux (max 20 Mo)' }, { status: 413 })

      const mammoth = require('mammoth')
      const result  = await mammoth.convertToHtml(
        { buffer: fileBuffer },
        {
          // Images converties en data-URI (aucune requête externe)
          convertImage: mammoth.images.imgElement(async (img: any) => {
            const b64 = await img.read('base64')
            return { src: `data:${img.contentType};base64,${b64}` }
          }),
        }
      )

      const html = sanitize(result.value, 'docx')
      return NextResponse.json({ type: 'docx', html })
    }

    // ── XLSX / XLS / ODS / CSV ──────────────────────────────────────────────
    if (XLSX_EXTS.has(ext)) {
      if (fileBuffer.length > XLSX_LIMIT)
        return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 413 })

      const XLSX     = require('xlsx')
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
      const sheets: { name: string; html: string }[] = []

      for (const sheetName of workbook.SheetNames) {
        const sheet   = workbook.Sheets[sheetName]
        const rawHtml = XLSX.utils.sheet_to_html(sheet, { editable: false })
        sheets.push({ name: sheetName, html: sanitize(rawHtml, 'xlsx') })
      }

      return NextResponse.json({ type: 'xlsx', sheets })
    }

    return NextResponse.json({ error: 'Format non supporté par le renderer' }, { status: 415 })

  } catch (err) {
    console.error('[files/render]', err)
    return NextResponse.json({ error: 'Erreur de conversion du document' }, { status: 500 })
  }
}

// ─── Sanitization stricte ─────────────────────────────────────────────────────

function sanitize(html: string, mode: 'docx' | 'xlsx'): string {
  const baseTags = [
    'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'span',
    'ul', 'ol', 'li', 'blockquote', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'img', 'a',
  ]

  return sanitizeHtml(html, {
    allowedTags: baseTags,
    allowedAttributes: {
      'img': ['src', 'alt', 'width', 'height'],
      'a':   ['href'],   // href gardé mais target/_blank injecté côté client
      'td':  ['colspan', 'rowspan', 'style'],
      'th':  ['colspan', 'rowspan', 'style'],
      '*':   ['style'],
    },
    allowedStyles: {
      '*': {
        'color':            [/.*/],
        'background-color': [/.*/],
        'font-size':        [/.*/],
        'font-weight':      [/.*/],
        'font-style':       [/.*/],
        'text-align':       [/.*/],
        'text-decoration':  [/.*/],
        'border':           [/.*/],
        'border-collapse':  [/.*/],
        'padding':          [/.*/],
        'margin':           [/.*/],
        'width':            [/.*/],
      },
    },
    // Autorise seulement data-URI pour les images (aucun fetch externe)
    allowedSchemes: mode === 'docx' ? ['data'] : [],
    allowedSchemesByTag: { 'a': ['https', 'http'] },
    // Bloque tout ce qui ressemble à du JS dans les attributs
    disallowedTagsMode: 'discard',
  })
}
