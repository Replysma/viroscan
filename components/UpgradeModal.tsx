'use client'

import { useState } from 'react'
import { X, Zap, ShieldCheck, Loader2, Lock } from 'lucide-react'

interface Props {
  reason:   'rate_limit' | 'paywall'
  onClose:  () => void
  remaining?: number
  limit?:     number
}

export default function UpgradeModal({ reason, onClose, remaining = 0, limit = 3 }: Props) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/stripe/checkout', { method: 'POST' })
      if (!res.ok && res.headers.get('content-type')?.includes('text/html')) {
        alert(`Erreur serveur (${res.status}) — consultez les logs Vercel.`)
        setLoading(false)
        return
      }
      const data = await res.json()
      if (data.url) {
        window.location.assign(data.url)
        // Ne pas reset loading : l'utilisateur quitte la page
      } else {
        alert(data.error || 'Erreur')
        setLoading(false)
      }
    } catch (err: any) {
      alert(`Erreur réseau : ${err?.message ?? 'veuillez réessayer.'}`)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative card max-w-md w-full p-7 border-[rgba(225,173,1,0.3)] animate-slide-up">
        {/* Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,173,1,0.07),transparent_60%)] pointer-events-none rounded-xl" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#555555] hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="relative text-center space-y-5">
          {/* Icon */}
          <div className="w-14 h-14 bg-[rgba(225,173,1,0.1)] border border-[rgba(225,173,1,0.25)] rounded-2xl flex items-center justify-center mx-auto">
            {reason === 'rate_limit'
              ? <Lock     size={24} className="text-[#E1AD01]" />
              : <ShieldCheck size={24} className="text-[#E1AD01]" />}
          </div>

          {/* Title */}
          <div>
            <h3 className="text-xl font-bold text-white mb-1">
              {reason === 'rate_limit'
                ? 'Limite journalière atteinte'
                : 'Détails masqués'}
            </h3>
            <p className="text-[#555555] text-sm">
              {reason === 'rate_limit'
                ? `Vous avez utilisé vos ${limit} analyses gratuites du jour. Revenez demain ou passez au Premium pour des analyses illimitées.`
                : 'Les noms de fichiers suspects et les signatures exactes sont réservés aux utilisateurs Premium.'}
            </p>
          </div>

          {reason === 'rate_limit' && (
            <div className="bg-[#131313] rounded-lg px-4 py-2 text-sm">
              <span className="text-[#555555]">Quota aujourd'hui : </span>
              <span className="text-white font-medium">{limit - remaining}/{limit} analyses utilisées</span>
            </div>
          )}

          {/* Avantages */}
          <ul className="text-left space-y-2">
            {[
              'Analyses illimitées chaque jour',
              'Noms de fichiers et hashes complets',
              'Rapport VirusTotal détaillé',
              'Archives jusqu\'à 500 Mo',
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-[#AAAAAA]">
                <ShieldCheck size={14} className="text-[#E1AD01] flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="btn-primary w-full justify-center py-3 text-base glow-brand"
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Redirection...</>
              : <><Zap size={15} /> Passer au Premium — 9.99€/mois</>}
          </button>

          <p className="text-xs text-[#444444]">
            Paiement sécurisé · Annulation en un clic
          </p>
        </div>
      </div>
    </div>
  )
}
