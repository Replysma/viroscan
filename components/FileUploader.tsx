'use client'

import { useState, useRef, useCallback } from 'react'
import { upload } from '@vercel/blob/client'
import { Upload, Archive, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { ArchiveInfo } from '@/types'

interface Props {
  sessionId: string
  onSuccess: (archive: ArchiveInfo) => void
  compact?: boolean
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export default function FileUploader({ sessionId, onSuccess, compact = false }: Props) {
  const [state, setState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setState('uploading')
    setProgress(0)
    setError('')

    try {
      // Étape 1 : upload direct depuis le navigateur vers Vercel Blob.
      // Contourne la limite 4.5 MB des fonctions serverless Vercel.
      setProgress(10)
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload/token',
      })
      setProgress(85)

      setProgress(90)

      // Étape 2 : envoi de l'URL blob au serveur pour parser l'archive et sauvegarder en DB.
      const res = await fetch('/api/upload/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blobUrl:   blob.url,
          fileName:  file.name,
          fileSize:  file.size,
          sessionId,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setProgress(100)
        setState('success')
        setTimeout(() => {
          onSuccess(data.data)
          setState('idle')
        }, 800)
      } else {
        setError(data.error || "Échec de l'import")
        setState('error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau. Veuillez réessayer.')
      setState('error')
    }
  }, [sessionId, onSuccess])

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return
    const file = files[0]
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'zip' && ext !== 'rar') {
      setError('Seuls les fichiers ZIP et RAR sont acceptés')
      setState('error')
      return
    }
    uploadFile(file)
  }, [uploadFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  if (compact) {
    return (
      <div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={state === 'uploading'}
          className="btn-secondary text-xs w-full justify-center py-2"
        >
          {state === 'uploading' ? (
            <><Loader2 size={14} className="animate-spin" /> Import en cours...</>
          ) : (
            <><Upload size={14} /> Importer une nouvelle archive</>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,.rar"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        {state === 'error' && (
          <p className="text-red-400 text-xs mt-1.5 text-center">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => state === 'idle' && fileInputRef.current?.click()}
        className={`drop-zone relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
          ${isDragging
            ? 'drag-over'
            : 'border-[#1A1A1A] hover:border-[#3A3A3A] hover:bg-[#0D0D0D]'
          }
          ${state !== 'idle' ? 'cursor-default' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,.rar"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />

        {state === 'idle' && (
          <div className="space-y-4 animate-fade-in">
            <div className="w-16 h-16 bg-[rgba(225,173,1,0.08)] border border-[rgba(225,173,1,0.2)] rounded-2xl flex items-center justify-center mx-auto">
              <Upload size={28} className="text-[#E1AD01]" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">
                Déposez votre archive ici
              </p>
              <p className="text-[#555555] text-sm mt-1">
                ou <span className="text-[#E1AD01]">cliquez pour parcourir</span>
              </p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-[#555555]">
                <Archive size={13} className="text-[#E1AD01]" /> ZIP
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[#555555]">
                <Archive size={13} className="text-[#E1AD01]" /> RAR
              </span>
              <span className="text-xs text-[#444444]">Max 50 Mo gratuit / 500 Mo premium</span>
            </div>
          </div>
        )}

        {state === 'uploading' && (
          <div className="space-y-5 animate-fade-in">
            <div className="w-14 h-14 bg-[rgba(225,173,1,0.08)] rounded-2xl flex items-center justify-center mx-auto">
              <Loader2 size={24} className="text-[#E1AD01] animate-spin" />
            </div>
            <div>
              <p className="font-medium text-white truncate max-w-xs mx-auto">{fileName}</p>
              <p className="text-sm text-[#555555] mt-1">
                {progress < 85 ? 'Upload en cours...' : "Analyse de l'archive..."}
              </p>
            </div>
            <div className="w-full max-w-xs mx-auto bg-[#1A1A1A] rounded-full h-1.5">
              <div
                className="bg-[#E1AD01] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-[#444444]">{progress}%</p>
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
              <p className="font-medium text-red-400">Échec de l'import</p>
              <p className="text-sm text-[#555555] mt-1">{error}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setState('idle'); setError('') }}
              className="btn-secondary text-sm mx-auto"
            >
              <X size={14} /> Réessayer
            </button>
          </div>
        )}
      </div>

      {/* Supported formats info */}
      {state === 'idle' && (
        <p className="text-center text-xs text-[#444444] mt-3">
          Les fichiers sont automatiquement supprimés après 2 heures (plan gratuit)
        </p>
      )}
    </div>
  )
}
