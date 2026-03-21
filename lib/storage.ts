/**
 * Stockage des archives avec mode dual :
 * - Local (dev)       : système de fichiers local (tmp/zipview/)
 * - Production Vercel : Vercel Blob (via BLOB_READ_WRITE_TOKEN)
 *
 * La détection est automatique selon la présence de BLOB_READ_WRITE_TOKEN.
 */

import fs from 'fs'
import path from 'path'

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN

const STORAGE_ROOT = process.env.STORAGE_PATH
  ? path.resolve(process.env.STORAGE_PATH)
  : path.join(process.cwd(), 'tmp', 'zipview')

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Sauvegarde l'archive.
 * Retourne : URL blob (production) ou chemin fichier local (dev).
 */
export async function saveUploadedFile(
  archiveId: string,
  ext: string,
  buffer: Buffer
): Promise<string> {
  if (USE_BLOB) {
    const { put } = await import('@vercel/blob')
    const contentType = ext === 'zip' ? 'application/zip' : 'application/x-rar-compressed'
    const blob = await put(`archives/${archiveId}/original.${ext}`, buffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType,
    })
    return blob.url
  }

  // Mode local
  const dir = path.join(STORAGE_ROOT, archiveId)
  fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, `original.${ext}`)
  await fs.promises.writeFile(filePath, buffer)
  return filePath
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

/**
 * Récupère le contenu de l'archive depuis son storage_path.
 * Gère les deux modes : URL blob ou chemin local.
 */
export async function getArchiveBuffer(storagePath: string): Promise<Buffer> {
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    const response = await fetch(storagePath)
    if (!response.ok) throw new Error(`Erreur blob : ${response.status}`)
    return Buffer.from(await response.arrayBuffer())
  }
  return fs.promises.readFile(storagePath)
}

// ─── Suppression ──────────────────────────────────────────────────────────────

export async function deleteArchive(storagePath: string): Promise<void> {
  try {
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      const { del } = await import('@vercel/blob')
      await del(storagePath)
    } else {
      const dir = path.dirname(storagePath)
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
    }
  } catch (err) {
    console.warn('[storage] Erreur suppression :', err)
  }
}

// ─── Nettoyage des archives expirées ─────────────────────────────────────────

export async function cleanupExpiredArchives(): Promise<void> {
  try {
    const { archiveRepo } = await import('./db')

    if (USE_BLOB) {
      // Récupérer les URLs blob des archives expirées avant suppression
      const { sql } = await import('@vercel/postgres')
      const { rows } = await sql`SELECT id, storage_path FROM archives WHERE expires_at < NOW()`
      if (rows.length > 0) {
        await Promise.allSettled(rows.map((r: any) => deleteArchive(r.storage_path)))
      }
    } else {
      // Mode local : supprimer les dossiers orphelins
      if (fs.existsSync(STORAGE_ROOT)) {
        const dirs = fs.readdirSync(STORAGE_ROOT).filter(d => {
          const stat = fs.statSync(path.join(STORAGE_ROOT, d))
          return stat.isDirectory() && !d.endsWith('.db')
        })
        for (const dir of dirs) {
          const archive = await archiveRepo.findById(dir)
          if (!archive) fs.rmSync(path.join(STORAGE_ROOT, dir), { recursive: true, force: true })
        }
      }
    }

    const count = await archiveRepo.deleteExpired()
    if (count > 0) console.log(`[cleanup] ${count} archives expirées supprimées`)
  } catch (err) {
    console.warn('[cleanup] Erreur :', err)
  }
}

// ─── Utilitaires de sécurité (inchangés) ─────────────────────────────────────

export function detectFileType(buffer: Buffer): 'zip' | 'rar' | null {
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) return 'zip'
  if (buffer[0] === 0x52 && buffer[1] === 0x61 && buffer[2] === 0x72 &&
      buffer[3] === 0x21 && buffer[4] === 0x1a && buffer[5] === 0x07) return 'rar'
  return null
}

export function isSafeEntryPath(entryPath: string): boolean {
  const normalized = path.normalize(entryPath)
  return !normalized.startsWith('..') && !path.isAbsolute(normalized)
}

const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.vbs', '.ps1',
  '.sh', '.bash', '.zsh', '.dll', '.so', '.dylib',
])

export function isSuspiciousFile(filename: string): boolean {
  return DANGEROUS_EXTENSIONS.has(path.extname(filename).toLowerCase())
}
