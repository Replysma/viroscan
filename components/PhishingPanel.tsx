'use client'

import { useState, useRef } from 'react'
import {
  ShieldAlert, ShieldCheck, AlertTriangle,
  Search, Loader2, Clock, Trash2, ChevronRight,
  Info, Sparkles,
} from 'lucide-react'

type Score = 'safe' | 'suspect' | 'danger'

interface AnalysisResult {
  email:     string
  domain:    string
  score:     Score
  label:     string
  summary:   string
  details:   string[]
  aiPowered: boolean
}

const SCORE_CONFIG: Record<Score, {
  icon: typeof ShieldCheck
  label: string
  bg: string
  border: string
  text: string
  badge: string
  dot: string
}> = {
  safe: {
    icon:   ShieldCheck,
    label:  'Sûr',
    bg:     'rgba(16,185,129,0.06)',
    border: 'rgba(16,185,129,0.25)',
    text:   'text-emerald-400',
    badge:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dot:    'bg-emerald-400',
  },
  suspect: {
    icon:   AlertTriangle,
    label:  'Suspect',
    bg:     'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.25)',
    text:   'text-amber-400',
    badge:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dot:    'bg-amber-400',
  },
  danger: {
    icon:   ShieldAlert,
    label:  'Dangereux',
    bg:     'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.25)',
    text:   'text-red-400',
    badge:  'bg-red-500/10 text-red-400 border-red-500/20',
    dot:    'bg-red-500',
  },
}

const EXAMPLES = [
  'contact@paypa1.com',
  'support@micros0ft-helpdesk.com',
  'noreply@gmail.com',
  'verify@amaz0n-secure.net',
]

export default function PhishingPanel() {
  const [email,    setEmail]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<AnalysisResult | null>(null)
  const [error,    setError]    = useState('')
  const [history,  setHistory]  = useState<AnalysisResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  async function analyze(emailToCheck = email) {
    const trimmed = emailToCheck.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/phishing', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')

      setResult(data)
      setHistory(prev => [data, ...prev.filter(h => h.email !== data.email)].slice(0, 8))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleExample(ex: string) {
    setEmail(ex)
    analyze(ex)
    inputRef.current?.focus()
  }

  const cfg = result ? SCORE_CONFIG[result.score] : null

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">

        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[rgba(255,215,0,0.08)] border border-[rgba(255,215,0,0.12)] flex items-center justify-center flex-shrink-0">
            <ShieldAlert size={20} className="text-[#FFD700]" />
          </div>
          <div>
            <h2 className="font-bold text-white text-base">Anti-Phishing</h2>
            <p className="text-[#555555] text-xs mt-0.5">
              Analysez une adresse email pour détecter les tentatives d'hameçonnage.
            </p>
          </div>
        </div>

        {/* ── Formulaire ──────────────────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <label className="block text-xs font-medium text-[#666666] uppercase tracking-wider">
            Adresse email à analyser
          </label>

          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyze()}
              placeholder="ex: contact@paypa1.com"
              className="input flex-1 font-mono text-sm"
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={() => analyze()}
              disabled={loading || !email.trim()}
              className="btn-primary px-4 py-2 flex-shrink-0"
            >
              {loading
                ? <Loader2 size={15} className="animate-spin" />
                : <><Search size={15} /> Analyser</>}
            </button>
          </div>

          {/* Exemples */}
          <div>
            <p className="text-xs text-[#333333] mb-2">Tester avec un exemple :</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => handleExample(ex)}
                  className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[#444444] hover:text-[#FFD700] hover:border-[rgba(255,215,0,0.2)] transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Erreur ──────────────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/05 px-4 py-3 flex items-center gap-2">
            <Info size={14} className="text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* ── Résultat ────────────────────────────────────────────────────── */}
        {result && cfg && (
          <div
            className="rounded-2xl border p-5 space-y-4 animate-slide-up"
            style={{ background: cfg.bg, borderColor: cfg.border }}
          >
            {/* Header résultat */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <cfg.icon size={22} className={cfg.text} />
                <div>
                  <p className="font-bold text-white text-sm">{result.label}</p>
                  <p className="text-xs text-[#555555] font-mono">{result.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {result.aiPowered && (
                  <span className="flex items-center gap-1 text-[10px] text-[#444444]">
                    <Sparkles size={10} className="text-[#FFD700]" /> IA
                  </span>
                )}
                <span className={`badge border text-xs ${cfg.badge}`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${cfg.dot}`} />
                  {SCORE_CONFIG[result.score].label}
                </span>
              </div>
            </div>

            <div className="divider" />

            {/* Domaine */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#444444]">Domaine :</span>
              <code className="font-mono text-[#AAAAAA] bg-white/[0.04] px-2 py-0.5 rounded-md">
                {result.domain}
              </code>
            </div>

            {/* Résumé */}
            <p className="text-sm text-[#AAAAAA] leading-relaxed">{result.summary}</p>

            {/* Détails */}
            {result.details.length > 0 && (
              <ul className="space-y-1.5">
                {result.details.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#666666]">
                    <ChevronRight size={12} className={`${cfg.text} flex-shrink-0 mt-0.5`} />
                    {d}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Historique ──────────────────────────────────────────────────── */}
        {history.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#444444] uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={11} /> Historique de session
              </p>
              <button
                onClick={() => setHistory([])}
                className="text-xs text-[#333333] hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 size={11} /> Effacer
              </button>
            </div>

            <div className="space-y-1">
              {history.map((h, i) => {
                const hcfg = SCORE_CONFIG[h.score]
                return (
                  <button
                    key={i}
                    onClick={() => { setEmail(h.email); setResult(h) }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] hover:border-white/[0.07] transition-all text-left group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hcfg.dot}`} />
                      <span className="text-sm font-mono text-[#666666] group-hover:text-[#AAAAAA] truncate transition-colors">
                        {h.email}
                      </span>
                    </div>
                    <span className={`text-xs font-medium flex-shrink-0 ml-3 ${hcfg.text}`}>
                      {hcfg.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── État vide ────────────────────────────────────────────────────── */}
        {!result && !loading && !error && (
          <div className="text-center py-8 space-y-2">
            <ShieldAlert size={36} className="text-[#222222] mx-auto" />
            <p className="text-[#333333] text-sm">Entrez une adresse email pour lancer l'analyse.</p>
          </div>
        )}

      </div>
    </div>
  )
}
