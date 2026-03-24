'use client'

import { useEffect, useState, useCallback } from 'react'
import { Shield, ShieldAlert, ShieldCheck, ShieldX, Loader2, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import type { ScanReport } from '@/lib/scanner'

type ScanStatus = 'pending' | 'scanning' | 'clean' | 'infected' | 'suspicious' | 'error'

interface Props {
  archiveId:          string
  initialScanStatus?: ScanStatus
  autoStart?:         boolean   // Lancer le scan dès le montage
  compact?:           boolean   // Mode réduit (sidebar)
}

interface ScanState {
  status:    ScanStatus
  result:    ScanReport | null
  loading:   boolean
  expanded:  boolean
}

const POLL_INTERVAL_MS = 2_500
const MAX_POLLS        = 30  // 75 secondes max de polling

export default function ScanBadge({ archiveId, initialScanStatus = 'pending', autoStart = true, compact = false }: Props) {
  // Les archives locales (parsées dans le navigateur) n'ont pas de record serveur
  const isLocal = archiveId.startsWith('local:')

  const [state, setState] = useState<ScanState>({
    status:   isLocal ? 'error' : initialScanStatus,
    result:   null,
    loading:  false,
    expanded: false,
  })

  if (isLocal) {
    if (compact) return null
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-500/5 p-3 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <Shield size={16} />
          <span>Analyse disponible via <strong>Analyse Virus</strong> dans le menu</span>
        </div>
      </div>
    )
  }

  // Lance le scan côté serveur
  const startScan = useCallback(async () => {
    setState(s => ({ ...s, loading: true, status: 'scanning' }))
    try {
      const res = await fetch(`/api/scan/${archiveId}`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setState(s => ({
          ...s,
          status:  data.data.scanStatus,
          result:  data.data.scanResult ?? null,
          loading: false,
        }))
      }
    } catch {
      setState(s => ({ ...s, status: 'error', loading: false }))
    }
  }, [archiveId])

  // Polling si scan en cours
  useEffect(() => {
    if (autoStart && (state.status === 'pending')) {
      startScan()
      return
    }

    if (state.status !== 'scanning') return

    let polls = 0
    const interval = setInterval(async () => {
      polls++
      if (polls > MAX_POLLS) { clearInterval(interval); return }

      try {
        const res  = await fetch(`/api/scan/${archiveId}`)
        const data = await res.json()
        if (data.success && data.data.scanStatus !== 'scanning') {
          clearInterval(interval)
          setState(s => ({
            ...s,
            status:  data.data.scanStatus,
            result:  data.data.scanResult ?? null,
            loading: false,
          }))
        }
      } catch { /* réseau indisponible, on réessaie */ }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [state.status, archiveId, autoStart, startScan])

  // ─── Rendu badge compact (sidebar) ─────────────────────────────────────────

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium ${badgeClass(state.status)}`}>
        {statusIcon(state.status, 11)}
        {statusLabel(state.status)}
      </span>
    )
  }

  // ─── Rendu complet ──────────────────────────────────────────────────────────

  const r = state.result

  return (
    <div className={`rounded-xl border p-3 text-sm ${cardClass(state.status)}`}>
      {/* En-tête */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          {statusIcon(state.status, 16)}
          <span>{statusLabel(state.status)}</span>
          {r && (
            <span className="text-xs font-normal opacity-60">
              · {r.filesScanned} fichier{r.filesScanned > 1 ? 's' : ''} analysé{r.filesScanned > 1 ? 's' : ''}
              {r.scanDurationMs && ` · ${(r.scanDurationMs / 1000).toFixed(1)}s`}
            </span>
          )}
        </div>
        {r && r.details.length > 0 && (
          <button
            onClick={() => setState(s => ({ ...s, expanded: !s.expanded }))}
            className="text-xs opacity-60 hover:opacity-100 flex items-center gap-0.5"
          >
            {state.expanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
            {r.details.length} menace{r.details.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Détails des menaces */}
      {state.expanded && r && r.details.length > 0 && (
        <div className="mt-2 space-y-1.5 border-t border-current/10 pt-2">
          {r.details.map((file, i) => (
            <div key={i} className="text-xs space-y-0.5">
              <div className="font-mono opacity-80 truncate" title={file.path}>
                📄 {file.path}
              </div>
              {file.threats.map((t, j) => (
                <div key={j} className="pl-3 opacity-70">⚠ {t}</div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ZIP bomb */}
      {r?.isZipBomb && (
        <div className="mt-2 text-xs opacity-80 flex items-center gap-1">
          💣 ZIP bomb détectée — extraction arrêtée
        </div>
      )}

      {/* Relancer si erreur */}
      {state.status === 'error' && !state.loading && (
        <button
          onClick={startScan}
          className="mt-2 text-xs underline opacity-60 hover:opacity-100"
        >
          Relancer l'analyse
        </button>
      )}
    </div>
  )
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function statusLabel(s: ScanStatus): string {
  switch (s) {
    case 'pending':    return "En attente d'analyse"
    case 'scanning':   return 'Analyse en cours...'
    case 'clean':      return 'Fichier sûr'
    case 'infected':   return 'Menace détectée'
    case 'suspicious': return 'Suspect'
    case 'error':      return "Erreur d'analyse"
  }
}

function statusIcon(s: ScanStatus, size = 14) {
  switch (s) {
    case 'pending':    return <Clock      size={size} className="text-slate-400" />
    case 'scanning':   return <Loader2    size={size} className="text-blue-400 animate-spin" />
    case 'clean':      return <ShieldCheck size={size} className="text-green-400" />
    case 'infected':   return <ShieldX    size={size} className="text-red-400" />
    case 'suspicious': return <ShieldAlert size={size} className="text-yellow-400" />
    case 'error':      return <Shield     size={size} className="text-slate-400" />
  }
}

function badgeClass(s: ScanStatus): string {
  switch (s) {
    case 'clean':      return 'bg-green-500/10 text-green-400'
    case 'infected':   return 'bg-red-500/10 text-red-400'
    case 'suspicious': return 'bg-yellow-500/10 text-yellow-400'
    case 'scanning':   return 'bg-blue-500/10 text-blue-400'
    default:           return 'bg-slate-500/10 text-slate-400'
  }
}

function cardClass(s: ScanStatus): string {
  switch (s) {
    case 'clean':      return 'bg-green-500/5  border-green-500/20 text-green-300'
    case 'infected':   return 'bg-red-500/5    border-red-500/20   text-red-300'
    case 'suspicious': return 'bg-yellow-500/5 border-yellow-500/20 text-yellow-300'
    case 'scanning':   return 'bg-blue-500/5   border-blue-500/20  text-blue-300'
    default:           return 'bg-slate-500/5  border-slate-700    text-slate-400'
  }
}
