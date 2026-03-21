'use client'

import { useState, useEffect, useCallback } from 'react'
import { Archive, Trash2, Clock, FileArchive, Loader2, RefreshCw } from 'lucide-react'
import { ArchiveInfo } from '@/types'
import { formatBytes, formatRelativeTime } from '@/lib/utils'

interface ArchiveSummary {
  id: string
  name: string
  type: string
  size: number
  fileCount: number
  uploadedAt: string
  expiresAt: string
}

interface Props {
  sessionId: string
  onLoad: (archive: ArchiveInfo) => void
}

export default function HistoryPanel({ sessionId, onLoad }: Props) {
  const [archives, setArchives] = useState<ArchiveSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/files?sessionId=${sessionId}`)
      const data = await res.json()
      if (data.success) setArchives(data.data)
    } catch {}
    finally { setLoading(false) }
  }, [sessionId])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await fetch(`/api/files/${id}?sessionId=${sessionId}`, { method: 'DELETE' })
      setArchives(prev => prev.filter(a => a.id !== id))
    } catch {}
    finally { setDeleting(null) }
  }

  const handleLoad = async (summary: ArchiveSummary) => {
    const res = await fetch(`/api/files/${summary.id}`)
    const data = await res.json()
    if (data.success) onLoad(data.data)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-[#D4A017]" size={24} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Historique des archives</h2>
        <button onClick={fetchHistory} className="btn-ghost text-sm">
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {archives.length === 0 ? (
        <div className="card p-12 text-center">
          <FileArchive size={32} className="text-[#444444] mx-auto mb-3" />
          <p className="text-[#B3B3B3] font-medium">Aucune archive pour le moment</p>
          <p className="text-[#555555] text-sm mt-1">Importez un fichier ZIP ou RAR pour commencer</p>
        </div>
      ) : (
        <div className="space-y-3">
          {archives.map(archive => {
            const expired = new Date(archive.expiresAt) < new Date()
            const expiresIn = formatRelativeTime(archive.expiresAt)

            return (
              <div
                key={archive.id}
                className={`card p-4 flex items-center gap-4 group transition-all
                  ${expired ? 'opacity-50' : ''}`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[rgba(212,160,23,0.08)] border border-[rgba(212,160,23,0.2)]">
                  <Archive size={18} className="text-[#D4A017]" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{archive.name}</p>
                  <div className="flex items-center gap-3 text-xs text-[#666666] mt-0.5">
                    <span>{archive.fileCount} fichiers</span>
                    <span>{formatBytes(archive.size)}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {expired ? 'Expirée' : `Expire ${expiresIn}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!expired && (
                    <button
                      onClick={() => handleLoad(archive)}
                      className="btn-secondary text-xs py-1.5"
                    >
                      Ouvrir
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(archive.id)}
                    disabled={deleting === archive.id}
                    className="text-[#555555] hover:text-red-400 transition-colors p-1.5"
                    title="Supprimer l'archive"
                  >
                    {deleting === archive.id
                      ? <Loader2 size={15} className="animate-spin" />
                      : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-[#444444] text-center mt-6">
        Connectez-vous pour conserver vos archives plus longtemps
      </p>
    </div>
  )
}
