'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import UpgradeModal from '@/components/UpgradeModal'
import {
  ShieldCheck, ShieldX, ShieldAlert, Shield,
  Upload, Loader2, ArrowLeft, FileSearch, X, Lock, Zap
} from 'lucide-react'
import { formatBytes } from '@/lib/utils'
import { usePlan } from '@/hooks/usePlan'

type ScanStatus = 'idle' | 'scanning' | 'clean' | 'infected' | 'suspicious' | 'error'

interface ScanResult {
  status:       'clean' | 'infected' | 'suspicious'
  details:      { file: string; threat: string }[]
  duration:     string
  fileSize:     number
  fileName:     string
  filesScanned: number
  threatsFound: number
  paywalled?:   boolean
}

interface UpgradeState {
  show:      boolean
  reason:    'rate_limit' | 'paywall'
  remaining: number
  limit:     number
}

export default function ScanPage() {
  const [status,     setStatus]   = useState<ScanStatus>('idle')
  const [result,     setResult]   = useState<ScanResult | null>(null)
  const [file,       setFile]     = useState<File | null>(null)
  const [isDragging, setDragging] = useState(false)
  const [error,      setError]    = useState('')
  const [upgrade,    setUpgrade]  = useState<UpgradeState>({ show: false, reason: 'rate_limit', remaining: 0, limit: 3 })
  const inputRef = useRef<HTMLInputElement>(null)

  // Plan & quota (rafraîchi après chaque scan via clé)
  const { isPremium, remaining, limit, count, loaded: planLoaded } = usePlan()
  const isLimitReached = !isPremium && planLoaded && (remaining !== null) && remaining <= 0

  const handleFile = useCallback((f: File) => {
    setFile(f)
    setResult(null)
    setError('')
    setStatus('idle')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const scan = useCallback(async () => {
    if (!file) return
    setStatus('scanning')
    setResult(null)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res  = await fetch('/api/scan', { method: 'POST', body: formData })
      const data = await res.json()

      if (!data.success) {
        if (data.rateLimited) {
          setStatus('idle')
          setUpgrade({ show: true, reason: 'rate_limit', remaining: data.remaining ?? 0, limit: data.limit ?? 3 })
          return
        }
        setError(data.error || 'Erreur serveur')
        setStatus('error')
        return
      }

      setResult(data.data)
      setStatus(data.data.status)

      // Paywall : menaces trouvées mais détails masqués
      if (data.data.paywalled && data.data.threatsFound > 0) {
        setUpgrade({ show: true, reason: 'paywall', remaining: 0, limit: 3 })
      }
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
      setStatus('error')
    }
  }, [file])

  const reset = () => {
    setFile(null)
    setResult(null)
    setStatus('idle')
    setError('')
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      <Header />

      {upgrade.show && (
        <UpgradeModal
          reason={upgrade.reason}
          remaining={upgrade.remaining}
          limit={upgrade.limit}
          onClose={() => setUpgrade(u => ({ ...u, show: false }))}
        />
      )}

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl space-y-6">

          {/* Back link */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-[#555555] hover:text-[#AAAAAA] transition-colors"
          >
            <ArrowLeft size={14} /> Retour au tableau de bord
          </Link>

          {/* Title */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-9 h-9 bg-[rgba(225,173,1,0.08)] border border-[rgba(225,173,1,0.25)] rounded-xl flex items-center justify-center">
                <ShieldCheck size={18} className="text-[#E1AD01]" />
              </div>
              Analyse de sécurité
            </h1>
            <p className="text-[#555555] text-sm pl-12">
              Déposez n'importe quel fichier pour détecter les menaces potentielles.
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => status !== 'scanning' && inputRef.current?.click()}
            className={`drop-zone relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
              ${isDragging
                ? 'drag-over'
                : status === 'scanning'
                  ? 'border-[#1A1A1A] cursor-default'
                  : 'border-[#1A1A1A] hover:border-[#3A3A3A] hover:bg-[#0D0D0D]'
              }`}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {!file ? (
              <div className="space-y-3">
                <div className="w-14 h-14 bg-[rgba(225,173,1,0.08)] border border-[rgba(225,173,1,0.2)] rounded-2xl flex items-center justify-center mx-auto">
                  <FileSearch size={24} className="text-[#E1AD01]" />
                </div>
                <div>
                  <p className="font-medium text-white">Déposez votre fichier ici</p>
                  <p className="text-sm text-[#555555] mt-1">
                    ou <span className="text-[#E1AD01]">cliquez pour parcourir</span>
                  </p>
                </div>
                <p className="text-xs text-[#444444]">Tous formats acceptés · Max 500 Mo</p>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#131313] rounded-xl flex items-center justify-center flex-shrink-0">
                  <Upload size={18} className="text-[#555555]" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  <p className="text-xs text-[#555555]">{formatBytes(file.size)}</p>
                </div>
                {status === 'idle' && (
                  <button
                    onClick={e => { e.stopPropagation(); reset() }}
                    className="text-[#555555] hover:text-[#AAAAAA] flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quota indicator (plan gratuit uniquement) */}
          {planLoaded && !isPremium && status === 'idle' && (
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-[#555555]">
                Analyses aujourd'hui :&nbsp;
                <span className={remaining === 0 ? 'text-red-400 font-semibold' : 'text-[#AAAAAA] font-semibold'}>
                  {count ?? 0}/{limit ?? 3}
                </span>
              </span>
              {remaining !== null && remaining > 0 && (
                <span className="text-[#444444]">{remaining} restante{remaining > 1 ? 's' : ''}</span>
              )}
            </div>
          )}

          {/* Scan button — bloqué si quota atteint */}
          {file && status === 'idle' && (
            isLimitReached ? (
              <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Lock size={16} className="text-[#555555] flex-shrink-0" />
                  <span className="text-sm text-[#555555] truncate">
                    Limite quotidienne atteinte ({count}/{limit}). Passez au plan Pro pour continuer.
                  </span>
                </div>
                <Link
                  href="/pricing"
                  className="btn-primary text-xs py-2 px-3 flex-shrink-0 rounded-lg"
                >
                  <Zap size={13} /> Pro
                </Link>
              </div>
            ) : (
              <button
                onClick={scan}
                className="btn-primary w-full justify-center py-3 text-base rounded-xl"
              >
                <ShieldCheck size={18} />
                Scanner le fichier
              </button>
            )
          )}

          {/* Scanning state */}
          {status === 'scanning' && (
            <div className="rounded-2xl border border-[rgba(225,173,1,0.2)] bg-[rgba(225,173,1,0.05)] p-5 flex items-center gap-4">
              <Loader2 size={24} className="text-[#E1AD01] animate-spin flex-shrink-0" />
              <div>
                <p className="font-medium text-[#E1AD01]">Analyse en cours...</p>
                <p className="text-sm text-[#555555] mt-0.5">Vérification des signatures et du contenu</p>
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 space-y-3">
              <p className="text-red-400 font-medium">{error}</p>
              <button onClick={reset} className="text-sm text-[#AAAAAA] hover:text-white underline">
                Réessayer
              </button>
            </div>
          )}

          {/* Result card */}
          {result && status !== 'scanning' && (
            <div className={`rounded-2xl border p-6 space-y-4 ${resultCardClass(result.status)}`}>
              {/* Header */}
              <div className="flex items-center gap-3">
                {resultIcon(result.status)}
                <div>
                  <p className="font-bold text-lg">{resultTitle(result.status)}</p>
                  <p className="text-sm opacity-70">
                    {result.filesScanned} fichier{result.filesScanned > 1 ? 's' : ''} analysé{result.filesScanned > 1 ? 's' : ''}
                    {' · '}{result.duration}
                  </p>
                </div>
              </div>

              {/* File info */}
              <div className="bg-black/20 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
                <span className="font-mono truncate opacity-80 max-w-xs">{result.fileName}</span>
                <span className="opacity-50 flex-shrink-0 ml-2">{formatBytes(result.fileSize)}</span>
              </div>

              {/* Threats */}
              {result.details.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-60">Menaces détectées</p>
                  {result.paywalled ? (
                    <button
                      onClick={() => setUpgrade({ show: true, reason: 'paywall', remaining: 0, limit: 3 })}
                      className="w-full bg-black/20 rounded-xl px-4 py-3 text-sm flex items-center gap-2 hover:bg-black/30 transition-colors"
                    >
                      <Lock size={14} className="text-[#E1AD01] flex-shrink-0" />
                      <span className="text-[#E1AD01] font-medium">
                        {result.threatsFound} menace{result.threatsFound > 1 ? 's' : ''} détectée{result.threatsFound > 1 ? 's' : ''} — Passez au Premium pour voir les détails
                      </span>
                    </button>
                  ) : (
                    result.details.map((d, i) => (
                      <div key={i} className="bg-black/20 rounded-xl px-4 py-3 text-sm">
                        <p className="font-mono opacity-80 truncate">📄 {d.file}</p>
                        <p className="opacity-60 mt-0.5">⚠ {d.threat}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Scan again */}
              <button
                onClick={reset}
                className="w-full py-2.5 rounded-xl border border-current/20 text-sm font-medium hover:bg-black/20 transition-colors opacity-70 hover:opacity-100"
              >
                Scanner un autre fichier
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function resultTitle(s: 'clean' | 'infected' | 'suspicious') {
  switch (s) {
    case 'clean':      return 'Aucune menace détectée'
    case 'infected':   return 'Menace détectée !'
    case 'suspicious': return 'Fichier suspect'
  }
}

function resultIcon(s: 'clean' | 'infected' | 'suspicious') {
  switch (s) {
    case 'clean':      return <ShieldCheck size={32} className="text-[#E1AD01] flex-shrink-0" />
    case 'infected':   return <ShieldX     size={32} className="text-red-400 flex-shrink-0" />
    case 'suspicious': return <ShieldAlert size={32} className="text-[#FFCC00] flex-shrink-0" />
  }
}

function resultCardClass(s: 'clean' | 'infected' | 'suspicious') {
  switch (s) {
    case 'clean':      return 'border-[rgba(225,173,1,0.3)] bg-[rgba(225,173,1,0.06)] text-[#FFCC00]'
    case 'infected':   return 'border-red-500/25 bg-red-500/5 text-red-200'
    case 'suspicious': return 'border-[rgba(242,201,76,0.3)] bg-[rgba(242,201,76,0.06)] text-[#FFCC00]'
  }
}
