/**
 * Browser-side archive parser.
 * ZIP  → jszip   (pur JS, pas de WASM, fonctionne partout)
 * RAR  → node-unrar-js (WASM compilé, fonctionne dans les navigateurs modernes)
 *
 * Aucun fichier n'est envoyé au serveur.
 */

import JSZip from 'jszip'
import path from 'path'
import { ArchiveEntry } from '@/types'

export interface ClientParseResult {
  tree:      ArchiveEntry[]
  fileCount: number
  dirCount:  number
  totalSize: number
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif',  '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain', '.md': 'text/markdown', '.json': 'application/json',
  '.js': 'text/javascript', '.ts': 'text/typescript',
  '.html': 'text/html', '.css': 'text/css',
  '.zip': 'application/zip', '.rar': 'application/x-rar-compressed',
}

function getMime(name: string): string {
  const ext = path.extname(name).toLowerCase()
  return MIME_MAP[ext] ?? 'application/octet-stream'
}

function sortEntries(entries: ArchiveEntry[]) {
  entries.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1
    return a.name.localeCompare(b.name)
  })
  for (const e of entries) if (e.children) sortEntries(e.children)
}

// ─── ZIP ──────────────────────────────────────────────────────────────────────

export async function parseZipClient(buffer: ArrayBuffer): Promise<ClientParseResult> {
  const zip = await JSZip.loadAsync(buffer)

  const root = new Map<string, ArchiveEntry>()
  let fileCount = 0, dirCount = 0, totalSize = 0

  zip.forEach((relativePath, zipEntry) => {
    const isDir = zipEntry.dir
    const name  = relativePath.replace(/\/$/, '').split('/').pop() || relativePath
    const node: ArchiveEntry = {
      name,
      path:           relativePath,
      isDirectory:    isDir,
      size:           (zipEntry as any)._data?.uncompressedSize ?? 0,
      compressedSize: (zipEntry as any)._data?.compressedSize   ?? 0,
      mimeType:       isDir ? 'folder' : getMime(name),
      children:       isDir ? [] : undefined,
    }
    if (isDir) dirCount++
    else { fileCount++; totalSize += node.size }

    root.set(isDir ? relativePath.replace(/\/?$/, '/') : relativePath, node)
  })

  const tree: ArchiveEntry[] = []
  for (const [entryPath, node] of root) {
    const cleanPath = entryPath.replace(/\/$/, '')
    const parts = cleanPath.split('/').filter(Boolean)
    if (parts.length <= 1) {
      tree.push(node)
    } else {
      const parentPath = parts.slice(0, -1).join('/') + '/'
      const parent = root.get(parentPath)
      if (parent?.children) parent.children.push(node)
      else tree.push(node)
    }
  }

  sortEntries(tree)
  return { tree, fileCount, dirCount, totalSize }
}

/** Extract one file from a ZIP buffer and return its content as Uint8Array */
export async function extractFileFromZipClient(
  buffer: ArrayBuffer,
  filePath: string
): Promise<Uint8Array | null> {
  const zip   = await JSZip.loadAsync(buffer)
  const entry = zip.file(filePath)
  if (!entry) return null
  return entry.async('uint8array')
}

// ─── RAR ──────────────────────────────────────────────────────────────────────

export async function parseRarClient(buffer: ArrayBuffer): Promise<ClientParseResult> {
  // node-unrar-js utilise WebAssembly — fonctionne dans le navigateur
  const { createExtractorFromData } = await import('node-unrar-js')

  const extractor = await createExtractorFromData({ data: buffer })
  const list      = extractor.getFileList()
  const headers   = [...list.fileHeaders]

  const root = new Map<string, ArchiveEntry>()
  let fileCount = 0, dirCount = 0, totalSize = 0

  for (const header of headers) {
    const entryPath = header.name.replace(/\\/g, '/')
    const isDir     = header.flags.directory
    const name      = entryPath.split('/').filter(Boolean).pop() || entryPath
    const node: ArchiveEntry = {
      name,
      path:           entryPath,
      isDirectory:    isDir,
      size:           header.unpSize,
      compressedSize: header.packSize,
      mimeType:       isDir ? 'folder' : getMime(name),
      children:       isDir ? [] : undefined,
    }
    if (isDir) dirCount++
    else { fileCount++; totalSize += header.unpSize }

    root.set(isDir ? entryPath.replace(/\/?$/, '/') : entryPath, node)
  }

  const tree: ArchiveEntry[] = []
  for (const [entryPath, node] of root) {
    const cleanPath = entryPath.replace(/\/$/, '')
    const parts = cleanPath.split('/').filter(Boolean)
    if (parts.length <= 1) {
      tree.push(node)
    } else {
      const parentPath = parts.slice(0, -1).join('/') + '/'
      const parent = root.get(parentPath)
      if (parent?.children) parent.children.push(node)
      else tree.push(node)
    }
  }

  sortEntries(tree)
  return { tree, fileCount, dirCount, totalSize }
}

/** Extract one file from a RAR buffer */
export async function extractFileFromRarClient(
  buffer: ArrayBuffer,
  filePath: string
): Promise<Uint8Array | null> {
  const { createExtractorFromData } = await import('node-unrar-js')
  const extractor = await createExtractorFromData({ data: buffer })
  const extracted = extractor.extract({ files: [filePath] })
  const files     = [...extracted.files]
  const file      = files.find(f => f.fileHeader.name.replace(/\\/g, '/') === filePath)
  if (!file?.extraction) return null
  return new Uint8Array(file.extraction)
}

// ─── Detect type from magic bytes ─────────────────────────────────────────────

export function detectTypeClient(buffer: ArrayBuffer): 'zip' | 'rar' | null {
  const b = new Uint8Array(buffer, 0, 6)
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return 'zip'
  if (b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21 &&
      b[4] === 0x1a && b[5] === 0x07) return 'rar'
  return null
}
