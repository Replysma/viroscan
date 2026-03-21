/**
 * Moteur de scan de malware — 100% en mémoire (aucune écriture sur disque).
 *
 * Pipeline :
 *  1. Détection MIME par magic bytes (vs extension déclarée)
 *  2. Détection ZIP bomb (ratio compression, taille extraite, profondeur, nb fichiers)
 *  3. Détection fichiers dangereux (exécutables, scripts)
 *  4. Scan récursif des archives imbriquées (max 5 niveaux)
 *  5. (Optionnel) Lookup VirusTotal par hash SHA-256
 */

import crypto from 'crypto'
import path from 'path'
import AdmZip from 'adm-zip'

// ─── Limites de sécurité ──────────────────────────────────────────────────────

const LIMITS = {
  MAX_EXTRACTED_BYTES: 1 * 1024 * 1024 * 1024, // 1 Go total extrait
  MAX_FILE_COUNT:      1_000,                   // Nb fichiers max dans toute l'arborescence
  MAX_DEPTH:           5,                       // Profondeur d'imbrication d'archives max
  MIN_BOMB_RATIO:      100,                     // Ratio compression suspect (ex: 1 Ko → 100 Mo)
  SCAN_TIMEOUT_MS:     55_000,                  // Timeout global du scan (55s)
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FileReport {
  path:             string
  size:             number         // Taille non compressée
  compressedSize:   number
  compressionRatio: number         // size / compressedSize
  detectedMime:     string | null  // Détecté par magic bytes
  declaredExt:      string         // Extension déclarée
  isMimeMismatch:   boolean        // Discordance MIME/extension
  isDangerous:      boolean        // Extension ou MIME exécutable
  isArchive:        boolean        // C'est une archive imbriquée
  isZipBomb:        boolean        // Ratio suspect
  threats:          string[]       // Menaces heuristiques détectées
  sha256:           string         // Hash SHA-256 du fichier
  vtStatus?:        'clean' | 'infected' | 'suspicious' | 'unknown'
  vtDetections?:    number
  vtTotal?:         number
}

export interface ScanReport {
  status:        'clean' | 'infected' | 'suspicious' | 'error'
  isZipBomb:     boolean
  filesScanned:  number
  threatsFound:  number
  details:       FileReport[]
  scanDurationMs: number
  error?:        string
}

// ─── Magic bytes → MIME ───────────────────────────────────────────────────────

function detectMagicMime(buf: Buffer): string | null {
  if (buf.length < 4) return null

  // Exécutables
  if (buf[0] === 0x4D && buf[1] === 0x5A) return 'application/x-msdownload'       // PE (EXE, DLL)
  if (buf[0] === 0x7F && buf[1] === 0x45 && buf[2] === 0x4C && buf[3] === 0x46)
    return 'application/x-elf'                                                      // ELF (Linux)
  if (buf[0] === 0xCA && buf[1] === 0xFE && buf[2] === 0xBA && buf[3] === 0xBE)
    return 'application/java-vm'                                                    // Java .class
  // Mach-O (macOS)
  if ((buf[0] === 0xCE || buf[0] === 0xCF) && buf[1] === 0xFA && buf[2] === 0xED && buf[3] === 0xFE)
    return 'application/x-mach-binary'
  if (buf[0] === 0xFE && buf[1] === 0xED && buf[2] === 0xFA && buf[3] === 0xCE)
    return 'application/x-mach-binary'

  // Archives
  if (buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04)
    return 'application/zip'
  if (buf[0] === 0x52 && buf[1] === 0x61 && buf[2] === 0x72 && buf[3] === 0x21 && buf.length > 6 && buf[4] === 0x1A && buf[5] === 0x07)
    return 'application/x-rar-compressed'
  if (buf[0] === 0x37 && buf[1] === 0x7A && buf[2] === 0xBC && buf[3] === 0xAF)
    return 'application/x-7z-compressed'
  if (buf[0] === 0x1F && buf[1] === 0x8B) return 'application/gzip'
  if (buf[0] === 0x42 && buf[1] === 0x5A && buf[2] === 0x68) return 'application/x-bzip2'
  if (buf.length > 5 && buf[0] === 0xFD && buf[1] === 0x37 && buf[2] === 0x7A && buf[3] === 0x58 && buf[4] === 0x5A)
    return 'application/x-xz'

  // Documents
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'application/pdf'
  if (buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11 && buf[3] === 0xE0) return 'application/vnd.ms-office'
  if (buf[0] === 0x7B && buf[1] === 0x5C && buf[2] === 0x72 && buf[3] === 0x74) return 'application/rtf'

  // Images
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png'
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif'
  if (buf[0] === 0x42 && buf[1] === 0x4D) return 'image/bmp'
  if (buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2A) return 'image/tiff'
  if (buf[0] === 0x4D && buf[1] === 0x4D && buf[2] === 0x00 && buf[3] === 0x2A) return 'image/tiff'

  // WebAssembly
  if (buf[0] === 0x00 && buf[1] === 0x61 && buf[2] === 0x73 && buf[3] === 0x6D) return 'application/wasm'

  // Tar (offset 257)
  if (buf.length > 262 && buf.slice(257, 262).toString('ascii') === 'ustar')
    return 'application/x-tar'

  return null
}

// ─── Extensions dangereuses ───────────────────────────────────────────────────

const DANGEROUS_EXTS = new Set([
  '.exe', '.dll', '.bat', '.cmd', '.com', '.msi', '.vbs', '.vbe',
  '.js',  '.jse', '.wsf', '.wsh', '.ps1', '.ps2', '.psc1', '.psc2',
  '.sh',  '.bash', '.zsh', '.fish', '.csh', '.ksh',
  '.elf', '.run', '.bin',
  '.scr', '.pif', '.lnk', '.reg',
  '.hta', '.htaccess',
  '.py',  '.rb',  '.pl',  '.php', '.asp', '.aspx', '.jar',
])

const EXECUTABLE_MIMES = new Set([
  'application/x-msdownload',
  'application/x-elf',
  'application/java-vm',
  'application/x-mach-binary',
  'application/wasm',
])

const ARCHIVE_MIMES = new Set([
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/gzip',
  'application/x-bzip2',
  'application/x-xz',
  'application/x-tar',
])

const ARCHIVE_EXTS = new Set(['.zip', '.rar', '.7z', '.gz', '.bz2', '.tar', '.xz', '.tgz'])

// ─── Contexte de scan partagé (pour les limites globales) ────────────────────

interface ScanContext {
  totalExtractedBytes: number
  totalFileCount:      number
  startTime:           number
  aborted:             boolean
  abortReason:         string
}

// ─── Scan d'un buffer d'archive ZIP (récursif) ───────────────────────────────

async function scanZipBuffer(
  buf: Buffer,
  basePath: string,
  depth: number,
  ctx: ScanContext,
  vtEnabled: boolean
): Promise<FileReport[]> {
  const reports: FileReport[] = []

  if (depth > LIMITS.MAX_DEPTH) return reports
  if (Date.now() - ctx.startTime > LIMITS.SCAN_TIMEOUT_MS) {
    ctx.aborted = true
    ctx.abortReason = `Timeout dépassé (${LIMITS.SCAN_TIMEOUT_MS / 1000}s)`
    return reports
  }

  let zip: AdmZip
  try {
    zip = new AdmZip(buf)
  } catch {
    return reports // Archive corrompue ou format non supporté
  }

  const entries = zip.getEntries()

  for (const entry of entries) {
    if (ctx.aborted) break
    if (entry.isDirectory) continue

    ctx.totalFileCount++
    if (ctx.totalFileCount > LIMITS.MAX_FILE_COUNT) {
      ctx.aborted = true
      ctx.abortReason = `Trop de fichiers (> ${LIMITS.MAX_FILE_COUNT})`
      break
    }

    const entryPath = path.join(basePath, entry.entryName).replace(/\\/g, '/')
    const declaredExt = path.extname(entry.name).toLowerCase()
    const uncompressedSize = entry.header.size
    const compressedSize = entry.header.compressedSize || 1

    ctx.totalExtractedBytes += uncompressedSize
    if (ctx.totalExtractedBytes > LIMITS.MAX_EXTRACTED_BYTES) {
      ctx.aborted = true
      ctx.abortReason = 'Taille totale extraite trop importante (ZIP bomb probable)'
      break
    }

    const compressionRatio = uncompressedSize / Math.max(compressedSize, 1)
    const isZipBomb = compressionRatio > LIMITS.MIN_BOMB_RATIO && uncompressedSize > 10 * 1024 * 1024

    // Extraire le contenu pour analyse (max 32 Mo pour la détection MIME)
    let fileBuffer: Buffer | null = null
    const SAMPLE_LIMIT = 32 * 1024 * 1024
    if (uncompressedSize <= SAMPLE_LIMIT) {
      try {
        fileBuffer = entry.getData()
      } catch {
        // Archive corrompue ou chiffrée
      }
    }

    const detectedMime = fileBuffer ? detectMagicMime(fileBuffer) : null
    const isDangerous = DANGEROUS_EXTS.has(declaredExt) || (detectedMime !== null && EXECUTABLE_MIMES.has(detectedMime))
    const isArchive = ARCHIVE_EXTS.has(declaredExt) || (detectedMime !== null && ARCHIVE_MIMES.has(detectedMime))

    // Discordance MIME / extension (ex: .jpg qui est en réalité un .exe)
    const isMimeMismatch = detectedMime !== null && isDangerous && !DANGEROUS_EXTS.has(declaredExt)

    const threats: string[] = []
    if (isZipBomb) threats.push(`ZIP bomb (ratio ${Math.round(compressionRatio)}:1)`)
    if (isDangerous && !isArchive) threats.push(`Fichier exécutable détecté (${declaredExt || detectedMime})`)
    if (isMimeMismatch) threats.push(`Discordance type : extension ${declaredExt} mais contenu ${detectedMime}`)

    // Hash SHA-256
    const sha256 = fileBuffer
      ? crypto.createHash('sha256').update(fileBuffer).digest('hex')
      : crypto.createHash('sha256').update(entry.entryName + uncompressedSize).digest('hex')

    // Lookup VirusTotal (si activé et fichier suffisamment petit)
    let vtStatus: FileReport['vtStatus'] = undefined
    let vtDetections: number | undefined = undefined
    let vtTotal: number | undefined = undefined

    if (vtEnabled && fileBuffer && fileBuffer.length <= 650 * 1024 * 1024) {
      try {
        const { lookupHash } = await import('./virustotal')
        const vtResult = await lookupHash(sha256)
        if (vtResult) {
          vtStatus = vtResult.status
          vtDetections = vtResult.detections
          vtTotal = vtResult.total
          if (vtResult.status === 'infected') {
            threats.push(`VirusTotal : ${vtResult.detections}/${vtResult.total} moteurs positifs`)
          } else if (vtResult.status === 'suspicious') {
            threats.push(`VirusTotal : suspect (${vtResult.detections}/${vtResult.total})`)
          }
        }
      } catch {
        // VT indisponible : on continue sans
      }
    }

    const report: FileReport = {
      path: entryPath,
      size: uncompressedSize,
      compressedSize,
      compressionRatio: Math.round(compressionRatio * 10) / 10,
      detectedMime,
      declaredExt,
      isMimeMismatch,
      isDangerous,
      isArchive,
      isZipBomb,
      threats,
      sha256,
      vtStatus,
      vtDetections,
      vtTotal,
    }

    reports.push(report)

    // Récursion dans les archives imbriquées
    if (isArchive && fileBuffer && depth < LIMITS.MAX_DEPTH) {
      const nested = await scanZipBuffer(fileBuffer, entryPath + '/', depth + 1, ctx, vtEnabled)
      reports.push(...nested)
    }
  }

  return reports
}

// ─── Entrée principale ────────────────────────────────────────────────────────

export async function scanArchive(
  archiveBuffer: Buffer,
  archiveType: 'zip' | 'rar',
  useVirusTotal = false
): Promise<ScanReport> {
  const startTime = Date.now()

  const ctx: ScanContext = {
    totalExtractedBytes: 0,
    totalFileCount:      0,
    startTime,
    aborted:             false,
    abortReason:         '',
  }

  let details: FileReport[] = []

  try {
    if (archiveType === 'zip') {
      details = await scanZipBuffer(archiveBuffer, '', 0, ctx, useVirusTotal)
    } else {
      // RAR : scan heuristique uniquement (extraction WASM, pas récursive)
      details = await scanRarHeuristic(archiveBuffer, ctx, useVirusTotal)
    }
  } catch (err) {
    return {
      status:         'error',
      isZipBomb:      false,
      filesScanned:   ctx.totalFileCount,
      threatsFound:   0,
      details:        [],
      scanDurationMs: Date.now() - startTime,
      error:          String(err),
    }
  }

  // Calcul du verdict global
  const isZipBomb = ctx.aborted && ctx.abortReason.includes('ZIP bomb')
    || details.some(d => d.isZipBomb)

  const infected   = details.filter(d => d.vtStatus === 'infected' || (d.isDangerous && d.isMimeMismatch))
  const suspicious = details.filter(d =>
    d.isZipBomb ||
    d.vtStatus === 'suspicious' ||
    (d.isDangerous && !d.isMimeMismatch && d.threats.length > 0)
  )

  let status: ScanReport['status'] = 'clean'
  if (ctx.aborted && (isZipBomb || ctx.abortReason.includes('bomb'))) status = 'infected'
  else if (infected.length > 0)   status = 'infected'
  else if (suspicious.length > 0) status = 'suspicious'

  return {
    status,
    isZipBomb,
    filesScanned:   ctx.totalFileCount,
    threatsFound:   details.filter(d => d.threats.length > 0).length,
    details:        details.filter(d => d.threats.length > 0), // Retourner seulement les fichiers avec menaces
    scanDurationMs: Date.now() - startTime,
    error:          ctx.aborted ? ctx.abortReason : undefined,
  }
}

// ─── Scan RAR heuristique (sans récursion d'archives imbriquées) ──────────────

async function scanRarHeuristic(
  buf: Buffer,
  ctx: ScanContext,
  vtEnabled: boolean
): Promise<FileReport[]> {
  const reports: FileReport[] = []

  try {
    const { extractFileFromRar } = await import('./rarParser')
    // On parse l'arbre sans extraire (déjà stocké en DB comme tree_json)
    // Ici on scanne uniquement les magic bytes du buffer complet
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex')
    const detectedMime = detectMagicMime(buf)

    ctx.totalFileCount++

    if (vtEnabled) {
      try {
        const { lookupHash } = await import('./virustotal')
        const vt = await lookupHash(sha256)
        if (vt && vt.status !== 'clean') {
          reports.push({
            path:             'archive.rar',
            size:             buf.length,
            compressedSize:   buf.length,
            compressionRatio: 1,
            detectedMime,
            declaredExt:      '.rar',
            isMimeMismatch:   false,
            isDangerous:      false,
            isArchive:        true,
            isZipBomb:        false,
            threats:          [`VirusTotal : ${vt.detections}/${vt.total} moteurs positifs`],
            sha256,
            vtStatus:         vt.status,
            vtDetections:     vt.detections,
            vtTotal:          vt.total,
          })
        }
      } catch { /* VT indisponible */ }
    }
  } catch { /* RAR non parsable */ }

  return reports
}
