/**
 * ZIP file parser using adm-zip
 * Builds a hierarchical file tree from the archive
 */

import AdmZip from 'adm-zip'
import mime from 'mime-types'
import path from 'path'
import { ArchiveEntry } from '@/types'
import { isSafeEntryPath } from './storage'

export interface ParseResult {
  tree: ArchiveEntry[]
  fileCount: number
  dirCount: number
  totalSize: number
}

/** Parse a ZIP buffer and return the file tree */
export function parseZip(buffer: Buffer): ParseResult {
  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()

  const root: Map<string, ArchiveEntry> = new Map()
  let fileCount = 0
  let dirCount = 0
  let totalSize = 0

  for (const entry of entries) {
    const entryPath = entry.entryName
    if (!isSafeEntryPath(entryPath)) continue

    const isDir = entry.isDirectory
    const parts = entryPath.replace(/\/$/, '').split('/')
    const name = parts[parts.length - 1]
    const ext = path.extname(name).toLowerCase()
    const mimeType = isDir ? 'folder' : (mime.lookup(ext) || 'application/octet-stream')

    const node: ArchiveEntry = {
      name,
      path: entryPath,
      isDirectory: isDir,
      size: entry.header.size,
      compressedSize: entry.header.compressedSize,
      mimeType,
      lastModified: entry.header.time,
      children: isDir ? [] : undefined,
    }

    if (isDir) dirCount++
    else {
      fileCount++
      totalSize += entry.header.size
    }

    root.set(entryPath, node)
  }

  // Build tree structure
  const tree: ArchiveEntry[] = []
  for (const [entryPath, node] of root) {
    const parts = entryPath.replace(/\/$/, '').split('/')
    if (parts.length === 1) {
      tree.push(node)
    } else {
      const parentPath = parts.slice(0, -1).join('/') + '/'
      const parent = root.get(parentPath)
      if (parent?.children) {
        parent.children.push(node)
      } else {
        // Orphaned entry (parent not listed) → add to root
        tree.push(node)
      }
    }
  }

  // Sort: directories first, then alphabetically
  const sortEntries = (entries: ArchiveEntry[]) => {
    entries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })
    for (const e of entries) {
      if (e.children) sortEntries(e.children)
    }
  }
  sortEntries(tree)

  return { tree, fileCount, dirCount, totalSize }
}

/** Extract a specific file from a ZIP archive, returns Buffer */
export function extractFileFromZip(zipBuffer: Buffer, filePath: string): Buffer | null {
  const zip = new AdmZip(zipBuffer)
  const entry = zip.getEntry(filePath)
  if (!entry || entry.isDirectory) return null
  return entry.getData()
}

/** List of previewable text extensions */
export const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.markdown', '.json', '.xml', '.yaml', '.yml',
  '.js', '.ts', '.jsx', '.tsx', '.css', '.scss', '.html', '.htm',
  '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h',
  '.sh', '.bash', '.zsh', '.sql', '.env', '.gitignore',
  '.csv', '.log', '.ini', '.toml', '.cfg', '.conf',
])

export function isTextFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return TEXT_EXTENSIONS.has(ext)
}

export const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.bmp'])
export function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return IMAGE_EXTENSIONS.has(ext)
}

export function isPdfFile(filename: string): boolean {
  return path.extname(filename).toLowerCase() === '.pdf'
}
