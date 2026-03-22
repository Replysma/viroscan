/**
 * Stockage des archives — mode triple :
 *
 *  1. S3_BUCKET_NAME   → S3-compatible (Cloudflare R2, AWS S3, Backblaze B2…)  ← Railway
 *  2. BLOB_READ_WRITE_TOKEN → Vercel Blob                                        ← Vercel
 *  3. Aucun            → Système de fichiers local (dev)
 *
 * Détection automatique selon les variables d'environnement présentes.
 */

import fs   from 'fs'
import path from 'path'

const USE_S3   = !!process.env.S3_BUCKET_NAME
const USE_BLOB = !USE_S3 && !!process.env.BLOB_READ_WRITE_TOKEN

const STORAGE_ROOT = process.env.STORAGE_PATH
  ? path.resolve(process.env.STORAGE_PATH)
  : path.join(process.cwd(), 'tmp', 'zipview')

// ─── Client S3 (lazy init) ────────────────────────────────────────────────────

async function getS3Client() {
  const { S3Client } = await import('@aws-sdk/client-s3')
  return new S3Client({
    region:      process.env.S3_REGION ?? 'auto',
    endpoint:    process.env.S3_ENDPOINT_URL,          // ex: https://<id>.r2.cloudflarestorage.com
    credentials: {
      accessKeyId:     process.env.S3_ACCESS_KEY_ID     ?? '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    },
    // Forcer path-style pour Cloudflare R2 et MinIO
    forcePathStyle: !!process.env.S3_FORCE_PATH_STYLE,
  })
}

function s3Key(archiveId: string, ext: string) {
  return `archives/${archiveId}/original.${ext}`
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Sauvegarde l'archive uploadée.
 * Retourne : clé S3 ("s3:..."), URL blob ou chemin fichier local.
 */
export async function saveUploadedFile(
  archiveId: string,
  ext: string,
  buffer: Buffer | Uint8Array
): Promise<string> {

  // ── Mode S3-compatible (Railway + Cloudflare R2 / AWS S3 / Backblaze B2) ──
  if (USE_S3) {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3')
    const client = await getS3Client()
    const key    = s3Key(archiveId, ext)

    await client.send(new PutObjectCommand({
      Bucket:      process.env.S3_BUCKET_NAME!,
      Key:         key,
      Body:        buffer instanceof Buffer ? buffer : Buffer.from(buffer),
      ContentType: ext === 'zip' ? 'application/zip' : 'application/x-rar-compressed',
    }))

    // On stocke le chemin S3 (pas une URL publique — récupéré via GetObject)
    return `s3:${key}`
  }

  // ── Mode Vercel Blob ──────────────────────────────────────────────────────
  if (USE_BLOB) {
    const { put } = await import('@vercel/blob')
    const contentType = ext === 'zip' ? 'application/zip' : 'application/x-rar-compressed'
    const body = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
    const blob = await put(`archives/${archiveId}/original.${ext}`, body, {
      access: 'public',
      addRandomSuffix: false,
      contentType,
    })
    return blob.url
  }

  // ── Mode local ─────────────────────────────────────────────────────────────
  const dir      = path.join(STORAGE_ROOT, archiveId)
  fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, `original.${ext}`)
  await fs.promises.writeFile(filePath, buffer)
  return filePath
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

/**
 * Récupère le contenu binaire de l'archive.
 * Gère les trois modes : S3 (s3:key), URL blob (https://…), chemin local.
 */
export async function getArchiveBuffer(storagePath: string): Promise<Buffer> {

  // ── S3 ────────────────────────────────────────────────────────────────────
  if (storagePath.startsWith('s3:')) {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3')
    const client = await getS3Client()
    const key    = storagePath.slice(3)   // retire le préfixe "s3:"

    const response = await client.send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key:    key,
    }))

    const stream  = response.Body as NodeJS.ReadableStream
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }

  // ── URL HTTP (Vercel Blob ou tout CDN public) ─────────────────────────────
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    const response = await fetch(storagePath)
    if (!response.ok) throw new Error(`Erreur blob HTTP : ${response.status}`)
    return Buffer.from(await response.arrayBuffer())
  }

  // ── Chemin local ──────────────────────────────────────────────────────────
  return fs.promises.readFile(storagePath)
}

// ─── Suppression ──────────────────────────────────────────────────────────────

export async function deleteArchive(storagePath: string): Promise<void> {
  try {
    if (storagePath.startsWith('s3:')) {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3')
      const client = await getS3Client()
      await client.send(new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key:    storagePath.slice(3),
      }))
      return
    }

    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      const { del } = await import('@vercel/blob')
      await del(storagePath)
      return
    }

    const dir = path.dirname(storagePath)
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
  } catch (err) {
    console.warn('[storage] Erreur suppression :', err)
  }
}

// ─── Nettoyage des archives expirées ─────────────────────────────────────────

export async function cleanupExpiredArchives(): Promise<void> {
  try {
    const { archiveRepo } = await import('./db')
    const { USE_POSTGRES, query } = await import('./pg-adapter')

    if (USE_POSTGRES) {
      // Récupérer les storage_paths avant suppression DB
      const { rows } = await query(
        "SELECT id, storage_path FROM archives WHERE expires_at < NOW()"
      )
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

// ─── Utilitaires de sécurité ──────────────────────────────────────────────────

export function detectFileType(buffer: Buffer | Uint8Array): 'zip' | 'rar' | null {
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
