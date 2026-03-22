/**
 * RAR file parser using node-unrar-js (WebAssembly)
 * Builds a hierarchical file tree from the archive
 */

import path from 'path'
import mime from 'mime-types'
import { ArchiveEntry } from '@/types'
import { isSafeEntryPath } from './storage'
import { isImageFile, isPdfFile, isTextFile, TEXT_EXTENSIONS, IMAGE_EXTENSIONS } from './zipParser'

export interface ParseResult {
  tree: ArchiveEntry[]
  fileCount: number
  dirCount: number
  totalSize: number
}

export async function parseRar(buffer: Buffer): Promise<ParseResult> {
  const { createExtractorFromData } = await import('node-unrar-js')
  const extractor = await createExtractorFromData({ data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer })
  const list = extractor.getFileList()
  const fileHeaders = [...list.fileHeaders]
  const root: Map<string, ArchiveEntry> = new Map()
  let fileCount = 0
  let dirCount = 0
  let totalSize = 0
  for (const header of fileHeaders) {
    const entryPath = header.name.replace(/\\/g, '/')
    if (!isSafeEntryPath(entryPath)) continue
    const isDir = header.flags.directory
    const name = entryPath.split('/').filter(Boolean).pop() || entryPath
    const ext = path.extname(name).toLowerCase()
    const mimeType = isDir ? 'folder' : (mime.lookup(ext) || 'application/octet-stream')
    const node: ArchiveEntry = {
      name,
      path: entryPath,
      isDirectory: isDir,
      size: header.unpSize,
      compressedSize: header.packSize,
      mimeType,
      children: isDir ? [] : undefined,
    }
    if (isDir) dirCount++
    else {
      fileCount++
      totalSize += header.unpSize
    }
    const normalizedPath = isDir ? entryPath.replace(/\/?$/, '/') : entryPath
    root.set(normalizedPath, node)
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
      if (parent?.children) {
        parent.children.push(node)
      } else {
        tree.push(node)
      }
    }
  }
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

export async function extractFileFromRar(
  rarBuffer: Buffer,
  filePath: string
): Promise<Buffer | null> {
  const { createExtractorFromData } = await import('node-unrar-js')
  const extractor = await createExtractorFromData({ data: rarBuffer.buffer.slice(rarBuffer.byteOffset, rarBuffer.byteOffset + rarBuffer.byteLength) as ArrayBuffer })
  const extracted = extractor.extract({ files: [filePath] })
  const files = [...extracted.files]
  const file = files.find(f => f.fileHeader.name.replace(/\\/g, '/') === filePath)
  if (!file || !file.extraction) return null
  return Buffer.from(file.extraction)
}

export { isTextFile, isImageFile, isPdfFile, TEXT_EXTENSIONS, IMAGE_EXTENSIONS }