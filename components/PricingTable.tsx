'use client'

import { useState } from 'react'
import { Check, Zap, Loader2, Crown } from 'lucide-react'
import Link from 'next/link'

const FREE_FEATURES = [
  "Jusqu'à 50 Mo par archive",
  '3 analyses antivirus par 24h',
  'Statut menace (sain/infecté/suspect)',
  'Aperçu texte, images, JSON',
  'Extraction sélective',
  'Fichiers supprimés après 2h',
]

const PREMIUM_FEATURES = [
  "Jusqu'à 500 Mo par archive",
  'Analyses illimitées',
  'Détails complets des menaces',
  'Hash des fichiers suspects',
  'Rapport VirusTotal intégré',
  'Aperçu PDF + tous formats',
  'Fichiers conservés 48h',
  'Historique étendu',
  'Traitement prioritaire',
]

interface Props {
  currentPlan?: 'free' | 'premium'
  isLoggedIn?:  boolean
}

export default function PricingTable({ currentPlan = 'free', isLoggedIn = false }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const handleCheckout = async () => {
    setIsLoading(true)
    try {
      const res  = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.assign(data.url)
        // Ne pas reset isLoading : l'utilisateur quitte la page
      } else {
        alert(data.error || 'Erreur lors de la redirection vers le paiement')
        setIsLoading(false)
      }
    } catch {
      alert('Erreur réseau, veuillez réessayer.')
      setIsLoading(false)
    }
  }

  const handlePortal = async () => {
    setIsLoading(true)
    try {
      const res  = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.assign(data.url)
      } else {
        alert(data.error || 'Erreur portail')
        setIsLoading(false)
      }
    } catch {
      alert('Erreur réseau')
      setIsLoading(false)
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">

      {/* ── Plan Gratuit ── */}
      <div className="card p-7 flex flex-col">
        <div className="mb-6">
          <p className="text-xs text-[#666666] uppercase tracking-widest font-medium mb-2">Gratuit</p>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-bold text-white">0 €</span>
            <span className="text-[#666666] mb-1">/mois</span>
          </div>
          <p className="text-sm text-[#666666] mt-2">Pour découvrir ZipView sans engagement</p>
        </div>

        <ul className="space-y-2.5 flex-1 mb-7">
          {FREE_FEATURES.map(f => (
            <li key={f} className="flex items-start gap-2 text-sm text-[#B3B3B3]">
              <Check size={15} className="text-[#555555] mt-0.5 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {currentPlan === 'free' ? (
          <Link href="/dashboard" className="btn-secondary w-full justify-center py-2.5">
            Plan actuel
          </Link>
        ) : (
          <Link href="/dashboard" className="btn-ghost w-full justify-center py-2.5 border border-[#2A2A2A]">
            Continuer en gratuit
          </Link>
        )}
      </div>

      {/* ── Plan Premium ── */}
      <div className="card p-7 flex flex-col border-[rgba(212,160,23,0.4)] relative overflow-hidden">
        {/* Badge populaire */}
        <div className="absolute top-0 right-0">
          <div className="bg-[#D4A017] text-black text-xs font-bold px-4 py-1 rounded-bl-xl flex items-center gap-1">
            <Crown size={11} /> POPULAIRE
          </div>
        </div>

        {/* Glow subtil */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,160,23,0.06),transparent_60%)] pointer-events-none" />

        <div className="mb-6 relative">
          <p className="text-xs text-[#D4A017] uppercase tracking-widest font-medium mb-2">Premium</p>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-bold text-white">9.99 €</span>
            <span className="text-[#666666] mb-1">/mois</span>
          </div>
          <p className="text-sm text-[#666666] mt-2">Analyses illimitées, détails complets</p>
        </div>

        <ul className="space-y-2.5 flex-1 mb-7 relative">
          {PREMIUM_FEATURES.map(f => (
            <li key={f} className="flex items-start gap-2 text-sm text-[#B3B3B3]">
              <Check size={15} className="text-[#D4A017] mt-0.5 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <div className="relative">
          {currentPlan === 'premium' ? (
            <button
              onClick={handlePortal}
              disabled={isLoading}
              className="btn-secondary w-full justify-center py-2.5"
            >
              {isLoading ? <Loader2 size={15} className="animate-spin" /> : null}
              Gérer mon abonnement
            </button>
          ) : isLoggedIn ? (
            <button
              onClick={handleCheckout}
              disabled={isLoading}
              className="btn-primary w-full justify-center py-2.5 text-base glow-brand"
            >
              {isLoading
                ? <><Loader2 size={15} className="animate-spin" /> Redirection...</>
                : <><Zap size={15} /> Passer au Premium</>}
            </button>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={isLoading}
              className="btn-primary w-full justify-center py-2.5 text-base glow-brand"
            >
              {isLoading
                ? <><Loader2 size={15} className="animate-spin" /> Redirection...</>
                : <><Zap size={15} /> Commencer — 9.99€/mois</>}
            </button>
          )}
          <p className="text-xs text-[#444444] text-center mt-3">
            Paiement sécurisé · Annulation en un clic · Sans engagement
          </p>
        </div>
      </div>
    </div>
  )
}
