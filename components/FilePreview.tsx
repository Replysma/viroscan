'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, Download, Loader2, AlertCircle, File,
  Copy, Check, Shield,
} from 'lucide-react'
import { ArchiveEntry } from '@/types'
import { formatBytes, getPreviewType, getFileIcon } from '@/lib/utils'
import { extractFileFromZipClient, extractFileFromRarClient } from '@/lib/clientParser'

interface Props {
  archiveId:    string
  archiveType?: 'zip' | 'rar'
  fileBuffer?:  ArrayBuffer        // présent pour les archives locales (parsed en browser)
  file:         ArchiveEntry
  onClose:      () => void
}

interface PreviewData {
  path:               string
  content:            string | null
  mimeType:           string
  isText:             boolean
  isBinary:           boolean
  size:               number
  truncated?:         boolean
  previewUnsupported?: boolean
}

interface RenderData {
  type:    'docx' | 'xlsx'
  html?:   string
  sheets?: { name: string; html: string }[]
}

const TEXT_EXTS = new Set([
  '.txt','.md','.markdown','.json','.xml','.yaml','.yml',
  '.js','.ts','.jsx','.tsx','.css','.scss','.html','.htm',
  '.py','.rb','.go','.rs','.java','.c','.cpp','.h',
  '.sh','.bash','.zsh','.sql','.env','.gitignore',
  '.csv','.log','.ini','.toml','.cfg','.conf',
])
const IMG_EXTS  = new Set(['.jpg','.jpeg','.png','.gif','.webp','.svg','.ico','.bmp'])
const MAX_TEXT  = 512 * 1024  // 512 KB

function extOf(name: string) { return name.slice(name.lastIndexOf('.')).toLowerCase() }

export default function FilePreview({ archiveId, archiveType, fileBuffer, file, onClose }: Props) {
  const [data,        setData]        = useState<PreviewData | null>(null)
  const [rendered,    setRendered]    = useState<RenderData | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [copied,      setCopied]      = useState(false)
  const [activeSheet, setActiveSheet] = useState(0)

  const previewType        = getPreviewType(file.name)
  const { icon, color }    = getFileIcon(file.name, file.mimeType)
  const isLocal            = !!fileBuffer
  const isSecureMode       = previewType === 'docx' || previewType === 'xlsx' || previewType === 'pdf'

  // ─── Client-side extraction ──────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    setError('')
    setData(null)
    setRendered(null)
    setActiveSheet(0)

    if (isLocal && fileBuffer) {
      loadFromBuffer(fileBuffer, archiveType ?? 'zip', file)
        .then(d => setData(d))
        .catch(e => setError(e instanceof Error ? e.message : 'Erreur extraction'))
        .finally(() => setLoading(false))
      return
    }

    // ─── Server-side (archive chargée depuis l'historique) ───────────────────
    const encodedPath = encodeURIComponent(file.path)

    if (previewType === 'docx' || previewType === 'xlsx') {
      fetch(`/api/files/${archiveId}/render?path=${encodedPath}`)
        .then(r => r.json())
        .then(res => { if (res.error) setError(res.error); else setRendered(res as RenderData) })
        .catch(() => setError('Erreur réseau'))
        .finally(() => setLoading(false))
    } else {
      fetch(`/api/files/${archiveId}/preview?path=${encodedPath}`)
        .then(r => r.json())
        .then(res => { if (res.success) setData(res.data); else setError(res.error || 'Preview failed') })
        .catch(() => setError('Erreur réseau'))
        .finally(() => setLoading(false))
    }
  }, [archiveId, archiveType, fileBuffer, file.path, previewType, isLocal])

  const handleCopy = useCallback(async () => {
    if (data?.content) {
      await navigator.clipboard.writeText(data.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [data])

  // Pour les archives locales, générer un object URL temporaire pour le téléchargement
  const handleDownload = useCallback(async () => {
    if (isLocal && fileBuffer) {
      try {
        const bytes = archiveType === 'rar'
          ? await extractFileFromRarClient(fileBuffer, file.path)
          : await extractFileFromZipClient(fileBuffer, file.path)
        if (!bytes) { setError('Fichier introuvable dans l\'archive'); return }
        const blob = new Blob([bytes as Uint8Array<ArrayBuffer>])
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href = url; a.download = file.name; a.click()
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      } catch { setError('Erreur lors du téléchargement') }
      return
    }
    const a = document.createElement('a')
    a.href = `/api/files/${archiveId}/download?path=${encodeURIComponent(file.path)}`
    a.download = file.name; a.click()
  }, [archiveId, archiveType, file, fileBuffer, isLocal])

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1A1A1A] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`flex-shrink-0 ${color}`}>{icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{file.name}</p>
            <p className="text-xs text-[#555555]">{formatBytes(file.size)} · {data?.mimeType || file.mimeType}</p>
          </div>
          {isSecureMode && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full flex-shrink-0">
              <Shield size={10} /> Lecture seule
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {data?.isText && data.content && (
            <button onClick={handleCopy} className="btn-ghost text-xs">
              {copied ? <><Check size={14} className="text-green-400" /> Copié</> : <><Copy size={14} /> Copier</>}
            </button>
          )}
          <button onClick={handleDownload} className="btn-ghost text-xs">
            <Download size={14} /> Télécharger
          </button>
          <button onClick={onClose} className="text-[#555555] hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <Loader2 size={24} className="animate-spin text-[#E1AD01] mx-auto" />
              <p className="text-[#555555] text-sm">
                {previewType === 'docx' ? 'Conversion du document…' :
                 previewType === 'xlsx' ? 'Lecture du tableur…' :
                 'Chargement de l\'aperçu…'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <AlertCircle size={24} className="text-red-400 mx-auto" />
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={handleDownload} className="btn-secondary text-sm mx-auto">
                <Download size={14} /> Télécharger le fichier
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {rendered?.type === 'docx' && rendered.html !== undefined && <DocViewer html={rendered.html} />}

            {rendered?.type === 'xlsx' && rendered.sheets && (
              <SheetViewer sheets={rendered.sheets} activeSheet={activeSheet} onSheetChange={setActiveSheet} />
            )}

            {data?.isText && data.content !== null && (
              <div className="h-full overflow-auto">
                {data.truncated && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-900/30 border-b border-amber-800/40 text-amber-300 text-xs">
                    <AlertCircle size={13} />
                    Fichier tronqué — 500 premiers Ko affichés.
                    <button onClick={handleDownload} className="underline hover:no-underline">Télécharger complet</button>
                  </div>
                )}
                <CodeViewer content={data.content} filename={file.name} />
              </div>
            )}

            {previewType === 'image' && data?.content && (
              <div className="flex items-center justify-center h-full p-6 overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.content} alt={file.name} referrerPolicy="no-referrer"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
              </div>
            )}

            {previewType === 'pdf' && !isLocal && (
              <div className="h-full">
                <iframe
                  src={`/api/files/${archiveId}/preview?path=${encodeURIComponent(file.path)}`}
                  className="w-full h-full border-0" title={file.name}
                  sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" />
              </div>
            )}

            {previewType === 'pdf' && isLocal && data?.content && (
              <div className="h-full">
                <iframe src={data.content} className="w-full h-full border-0" title={file.name}
                  sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" />
              </div>
            )}

            {data?.previewUnsupported && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-[#131313] rounded-2xl flex items-center justify-center mx-auto">
                    <File size={28} className="text-[#444444]" />
                  </div>
                  <div>
                    <p className="text-[#AAAAAA] font-medium">Aperçu non disponible</p>
                    <p className="text-[#555555] text-sm mt-1">{data.mimeType}</p>
                  </div>
                  <button onClick={handleDownload} className="btn-primary text-sm mx-auto">
                    <Download size={14} /> Télécharger
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Client-side extraction + preview builder ──────────────────────────────────

async function loadFromBuffer(
  buffer: ArrayBuffer,
  archiveType: 'zip' | 'rar',
  file: ArchiveEntry
): Promise<PreviewData> {
  const ext  = extOf(file.name)
  const mime = file.mimeType

  const bytes = archiveType === 'rar'
    ? await extractFileFromRarClient(buffer, file.path)
    : await extractFileFromZipClient(buffer, file.path)

  if (!bytes) throw new Error('Fichier introuvable dans l\'archive')

  // ── Image → data URL ────────────────────────────────────────────────────────
  if (IMG_EXTS.has(ext)) {
    const b64 = btoa(String.fromCharCode(...bytes))
    return { path: file.path, content: `data:${mime};base64,${b64}`, mimeType: mime, isText: false, isBinary: true, size: bytes.length }
  }

  // ── PDF → object URL ────────────────────────────────────────────────────────
  if (ext === '.pdf') {
    const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }))
    return { path: file.path, content: url, mimeType: 'application/pdf', isText: false, isBinary: true, size: bytes.length }
  }

  // ── Text / Code ─────────────────────────────────────────────────────────────
  if (TEXT_EXTS.has(ext)) {
    const slice     = bytes.length > MAX_TEXT ? bytes.slice(0, MAX_TEXT) : bytes
    const content   = new TextDecoder('utf-8', { fatal: false }).decode(slice)
    return { path: file.path, content, mimeType: mime, isText: true, isBinary: false, size: bytes.length, truncated: bytes.length > MAX_TEXT }
  }

  // ── Unsupported ─────────────────────────────────────────────────────────────
  return { path: file.path, content: null, mimeType: mime, isText: false, isBinary: true, size: bytes.length, previewUnsupported: true }
}

// ─── Sub-components (unchanged) ───────────────────────────────────────────────

function DocViewer({ html }: { html: string }) {
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.7;color:#e0e0e0;background:#111;padding:2rem 3rem;max-width:800px;margin:0 auto}
    h1,h2,h3,h4,h5,h6{color:#fff;margin:1.5em 0 0.5em}
    table{border-collapse:collapse;width:100%;margin:1em 0}
    th,td{border:1px solid #333;padding:6px 10px;text-align:left}
    th{background:#1a1a1a;color:#E1AD01}
    img{max-width:100%;height:auto;border-radius:4px}
    a{color:#E1AD01}
    blockquote{border-left:3px solid #E1AD01;margin:0;padding-left:1em;color:#888}
  </style></head><body>${html}</body></html>`
  return <iframe srcDoc={srcDoc} sandbox="" referrerPolicy="no-referrer" className="w-full h-full border-0 bg-[#111]" title="Aperçu document sécurisé" />
}

function SheetViewer({ sheets, activeSheet, onSheetChange }: { sheets: { name: string; html: string }[]; activeSheet: number; onSheetChange: (i: number) => void }) {
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#e0e0e0;background:#111;margin:0;padding:1rem}
    table{border-collapse:collapse;width:max-content;min-width:100%}
    th,td{border:1px solid #2a2a2a;padding:5px 10px;white-space:nowrap}
    th{background:#1a1a1a;color:#E1AD01;font-weight:600;position:sticky;top:0}
    tr:nth-child(even) td{background:#161616}
    tr:hover td{background:#1e1e1e}
  </style></head><body>${sheets[activeSheet]?.html ?? ''}</body></html>`
  return (
    <div className="flex flex-col h-full">
      {sheets.length > 1 && (
        <div className="flex gap-1 px-3 py-2 border-b border-[#1A1A1A] overflow-x-auto flex-shrink-0">
          {sheets.map((s, i) => (
            <button key={i} onClick={() => onSheetChange(i)}
              className={`px-3 py-1 text-xs rounded whitespace-nowrap transition-colors ${i === activeSheet ? 'bg-[#E1AD01] text-black font-medium' : 'text-[#555555] hover:text-white hover:bg-[#131313]'}`}>
              {s.name}
            </button>
          ))}
        </div>
      )}
      <iframe srcDoc={srcDoc} sandbox="" referrerPolicy="no-referrer" className="flex-1 border-0 bg-[#111]" title="Aperçu tableur sécurisé" />
    </div>
  )
}

function CodeViewer({ content, filename }: { content: string; filename: string }) {
  const lines = content.split('\n')
  return (
    <div className="code-preview h-full">
      <div className="flex">
        <div className="select-none px-3 py-4 text-right text-[#444444] bg-[#0D0D0D] border-r border-[#1A1A1A] min-w-[3.5rem]">
          {lines.map((_, i) => <div key={i} className="leading-6 text-xs">{i + 1}</div>)}
        </div>
        <pre className="flex-1 px-4 py-4 overflow-x-auto text-xs text-[#AAAAAA] leading-6"><code>{content}</code></pre>
      </div>
    </div>
  )
}
