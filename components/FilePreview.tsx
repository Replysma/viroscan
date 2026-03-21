'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, Download, Loader2, AlertCircle, FileText,
  FileImage, File, Copy, Check, Maximize2, ExternalLink
} from 'lucide-react'
import { ArchiveEntry } from '@/types'
import { formatBytes, getPreviewType, getFileIcon } from '@/lib/utils'

interface Props {
  archiveId: string
  file: ArchiveEntry
  onClose: () => void
}

interface PreviewData {
  path: string
  content: string | null
  mimeType: string
  isText: boolean
  isBinary: boolean
  size: number
  truncated?: boolean
  previewUnsupported?: boolean
}

export default function FilePreview({ archiveId, file, onClose }: Props) {
  const [data, setData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError('')
    setData(null)

    fetch(`/api/files/${archiveId}/preview?path=${encodeURIComponent(file.path)}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setData(res.data)
        else setError(res.error || 'Preview failed')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [archiveId, file.path])

  const handleCopy = useCallback(async () => {
    if (data?.content) {
      await navigator.clipboard.writeText(data.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [data])

  const handleDownload = useCallback(() => {
    const url = `/api/files/${archiveId}/download?path=${encodeURIComponent(file.path)}`
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
  }, [archiveId, file])

  const { icon, color } = getFileIcon(file.name, file.mimeType)
  const previewType = getPreviewType(file.name)

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#242424] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`flex-shrink-0 ${color}`}>{icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{file.name}</p>
            <p className="text-xs text-[#666666]">{formatBytes(file.size)} · {data?.mimeType || file.mimeType}</p>
          </div>
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

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <Loader2 size={24} className="animate-spin text-[#D4A017] mx-auto" />
              <p className="text-[#666666] text-sm">Chargement de l'aperçu...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <AlertCircle size={24} className="text-red-400 mx-auto" />
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={handleDownload} className="btn-secondary text-sm mx-auto">
                <Download size={14} /> Télécharger instead
              </button>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Text preview */}
            {data.isText && data.content !== null && (
              <div className="h-full overflow-auto">
                {data.truncated && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-900/30 border-b border-amber-800/40 text-amber-300 text-xs">
                    <AlertCircle size={13} />
                    Fichier tronqué — affichage des 500 premiers Ko.
                    <button onClick={handleDownload} className="underline hover:no-underline">Télécharger le fichier complet</button>
                  </div>
                )}
                <CodeViewer content={data.content} filename={file.name} />
              </div>
            )}

            {/* Image preview */}
            {previewType === 'image' && data.content && (
              <div className="flex items-center justify-center h-full p-6 overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.content}
                  alt={file.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
              </div>
            )}

            {/* PDF preview */}
            {previewType === 'pdf' && (
              <div className="h-full">
                <iframe
                  src={`/api/files/${archiveId}/preview?path=${encodeURIComponent(file.path)}`}
                  className="w-full h-full border-0"
                  title={file.name}
                />
              </div>
            )}

            {/* Unsupported */}
            {data.previewUnsupported && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-[#1A1A1A] rounded-2xl flex items-center justify-center mx-auto">
                    <File size={28} className="text-[#444444]" />
                  </div>
                  <div>
                    <p className="text-[#B3B3B3] font-medium">Aperçu non disponible</p>
                    <p className="text-[#555555] text-sm mt-1">{data.mimeType}</p>
                  </div>
                  <button onClick={handleDownload} className="btn-primary text-sm mx-auto">
                    <Download size={14} /> Télécharger file
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

// ─── Code viewer with line numbers ───────────────────────────────────────────

function CodeViewer({ content, filename }: { content: string; filename: string }) {
  const lines = content.split('\n')
  const lang = filename.split('.').pop()?.toLowerCase() || 'text'

  return (
    <div className="code-preview h-full">
      <div className="flex">
        {/* Line numbers */}
        <div className="select-none px-3 py-4 text-right text-[#444444] bg-[#0D0D0D] border-r border-[#242424] min-w-[3.5rem]">
          {lines.map((_, i) => (
            <div key={i} className="leading-6 text-xs">{i + 1}</div>
          ))}
        </div>
        {/* Code */}
        <pre className="flex-1 px-4 py-4 overflow-x-auto text-xs text-[#B3B3B3] leading-6">
          <code>{content}</code>
        </pre>
      </div>
    </div>
  )
}
