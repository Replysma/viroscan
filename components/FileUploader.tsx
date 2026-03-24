'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, Archive, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { ArchiveInfo } from '@/types'
import { parseZipClient, parseRarClient, detectTypeClient } from '@/lib/clientParser'

interface Props {
  sessionId?: string
  onSuccess: (archive: ArchiveInfo, fileBuffer: ArrayBuffer) => void
  compact?: boolean
}

type UploadState = 'idle' | 'parsing' | 'success' | 'error'

export default function FileUploader({ sessionId, onSuccess, compact = false }: Props) {
  const [state,      setState]     = useState<UploadState>('idle')
  const [error,      setError]     = useState('')
  const [fileName,   setFileName]  = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setState('parsing')
    setError('')

    try {
      const buffer   = await file.arrayBuffer()
      const fileType = detectTypeClient(buffer)

      if (!fileType) {
        setError('Format invalide. Seuls les fichiers ZIP et RAR sont acceptés.')
        setState('error')
        return
      }

      const limit = parseInt(process.env.NEXT_PUBLIC_MAX_PREMIUM_SIZE_MB || '500') * 1024 * 1024
      if (buffer.byteLength > limit) {
        setError('Fichier trop volumineux (max 500 Mo).')
        setState('error')
        return
      }

      const result = fileType === 'zip'
        ? await parseZipClient(buffer)
        : await parseRarClient(buffer)

      const archive: ArchiveInfo = {
        id:         `local:${crypto.randomUUID()}`,
        name:       file.name,
        type:       fileType,
        totalSize:  result.totalSize,
        fileCount:  result.fileCount,
        dirCount:   result.dirCount,
        uploadedAt: new Date().toISOString(),
        expiresAt:  new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
        tree:       result.tree,
      }

      setState('success')
      setTimeout(() => {
        onSuccess(archive, buffer)
        setState('idle')
      }, 600)

    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la lecture de l'archive")
      setState('error')
    }
  }, [onSuccess])

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return
    const file = files[0]
    const ext  = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'zip' && ext !== 'rar') {
      setError('Seuls les fichiers ZIP et RAR sont acceptés')
      setState('error')
      return
    }
    parseFile(file)
  }, [parseFile])

  const handleDrop      = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files) }, [handleFiles])
  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  if (compact) {
    return (
      <div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={state === 'parsing'}
          className="btn-secondary text-xs w-full justify-center py-2"
        >
          {state === 'parsing'
            ? <><Loader2 size={14} className="animate-spin" /> Lecture en cours...</>
            : <><Upload size={14} /> Importer une nouvelle archive</>}
        </button>
        <input ref={fileInputRef} type="file" accept=".zip,.rar" className="hidden"
          onChange={e => handleFiles(e.target.files)} />
        {state === 'error' && <p className="text-red-400 text-xs mt-1.5 text-center">{error}</p>}
      </div>
    )
  }

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
        onClick={() => state === 'idle' && fileInputRef.current?.click()}
        className={`drop-zone relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
          ${isDragging ? 'drag-over' : 'border-[#1A1A1A] hover:border-[#3A3A3A] hover:bg-[#0D0D0D]'}
          ${state !== 'idle' ? 'cursor-default' : ''}`}
      >
        <input ref={fileInputRef} type="file" accept=".zip,.rar" className="hidden"
          onChange={e => handleFiles(e.target.files)} />

        {state === 'idle' && (
          <div className="space-y-4 animate-fade-in">
            <div className="w-16 h-16 bg-[rgba(225,173,1,0.08)] border border-[rgba(225,173,1,0.2)] rounded-2xl flex items-center justify-center mx-auto">
              <Upload size={28} className="text-[#E1AD01]" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Déposez votre archive ici</p>
              <p className="text-[#555555] text-sm mt-1">ou <span className="text-[#E1AD01]">cliquez pour parcourir</span></p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-[#555555]"><Archive size={13} className="text-[#E1AD01]" /> ZIP</span>
              <span className="flex items-center gap-1.5 text-xs text-[#555555]"><Archive size={13} className="text-[#E1AD01]" /> RAR</span>
              <span className="text-xs text-[#444444]">Max 50 Mo gratuit / 500 Mo premium</span>
            </div>
          </div>
        )}

        {state === 'parsing' && (
          <div className="space-y-5 animate-fade-in">
            <div className="w-14 h-14 bg-[rgba(225,173,1,0.08)] rounded-2xl flex items-center justify-center mx-auto">
              <Loader2 size={24} className="text-[#E1AD01] animate-spin" />
            </div>
            <div>
              <p className="font-medium text-white truncate max-w-xs mx-auto">{fileName}</p>
              <p className="text-sm text-[#555555] mt-1">Lecture de l'archive en cours…</p>
            </div>
          </div>
        )}

        {state === 'success' && (
          <div className="space-y-3 animate-fade-in">
            <div className="w-14 h-14 bg-green-600/20 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} className="text-green-400" />
            </div>
            <p className="font-medium text-green-400">Archive chargée !</p>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-4 animate-fade-in">
            <div className="w-14 h-14 bg-red-600/20 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle size={24} className="text-red-400" />
            </div>
            <div>
              <p className="font-medium text-red-400">Échec de la lecture</p>
              <p className="text-sm text-[#555555] mt-1">{error}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setState('idle'); setError('') }}
              className="btn-secondary text-sm mx-auto">
              <X size={14} /> Réessayer
            </button>
          </div>
        )}
      </div>

      {state === 'idle' && (
        <p className="text-center text-xs text-[#444444] mt-3">
          Le fichier est lu directement dans votre navigateur — rien n'est envoyé au serveur
        </p>
      )}
    </div>
  )
}
