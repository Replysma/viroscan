'use client'

import { useState } from 'react'
import { Check, Zap, Loader2, Crown, X } from 'lucide-react'
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
  'Fichiers conservés 48h',
  'Historique étendu',
]

interface Props {
  currentPlan?: 'free' | 'premium'
  isLoggedIn?:  boolean
}

export default function PricingTable({ currentPlan = 'free', isLoggedIn = false }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [showAlreadyPremium, setShowAlreadyPremium] = useState(false)

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
    <>
    {showAlreadyPremium && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="relative bg-[#111111] border border-[rgba(225,173,1,0.3)] rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
          <button
            onClick={() => setShowAlreadyPremium(false)}
            className="absolute top-4 right-4 text-[#555555] hover:text-[#AAAAAA] transition-colors"
          >
            <X size={18} />
          </button>
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 bg-[rgba(225,173,1,0.1)] border border-[rgba(225,173,1,0.3)] rounded-2xl flex items-center justify-center">
              <Crown size={26} className="text-[#E1AD01]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Vous êtes déjà Premium</h3>
              <p className="text-[#555555] text-sm">Vous bénéficiez déjà de toutes les fonctionnalités Premium. Profitez-en !</p>
            </div>
            <button
              onClick={() => setShowAlreadyPremium(false)}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              Continuer
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">

      {/* ── Plan Gratuit ── */}
      <div className="card p-7 flex flex-col">
        <div className="mb-6">
          <p className="text-xs text-[#555555] uppercase tracking-widest font-medium mb-2">Gratuit</p>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-bold text-white">0 €</span>
            <span className="text-[#555555] mb-1">/mois</span>
          </div>
          <p className="text-sm text-[#555555] mt-2">Pour découvrir ZipView sans engagement</p>
        </div>

        <ul className="space-y-2.5 flex-1 mb-7">
          {FREE_FEATURES.map(f => (
            <li key={f} className="flex items-start gap-2 text-sm text-[#AAAAAA]">
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
          <Link href="/dashboard" className="btn-ghost w-full justify-center py-2.5 border border-[#1A1A1A]">
            Continuer en gratuit
          </Link>
        )}
      </div>

      {/* ── Plan Premium ── */}
      <div className="card p-7 flex flex-col border-[rgba(225,173,1,0.4)] relative overflow-hidden">
        {/* Badge populaire */}
        <div className="absolute top-0 right-0">
          <div className="bg-[#E1AD01] text-black text-xs font-bold px-4 py-1 rounded-bl-xl flex items-center gap-1">
            <Crown size={11} /> POPULAIRE
          </div>
        </div>

        {/* Glow subtil */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(225,173,1,0.06),transparent_60%)] pointer-events-none" />

        <div className="mb-6 relative">
          <p className="text-xs text-[#E1AD01] uppercase tracking-widest font-medium mb-2">Premium</p>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-bold text-white">9.99 €</span>
            <span className="text-[#555555] mb-1">/mois</span>
          </div>
          <p className="text-sm text-[#555555] mt-2">Analyses illimitées, détails complets</p>
        </div>

        <ul className="space-y-2.5 flex-1 mb-7 relative">
          {PREMIUM_FEATURES.map(f => (
            <li key={f} className="flex items-start gap-2 text-sm text-[#AAAAAA]">
              <Check size={15} className="text-[#E1AD01] mt-0.5 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <div className="relative">
          {currentPlan === 'premium' ? (
            <button
              onClick={() => setShowAlreadyPremium(true)}
              className="btn-primary w-full justify-center py-2.5 text-base glow-brand"
            >
              <span className="flex items-center gap-2"><Zap size={15} /> Commencer — 9,99€/mois</span>
            </button>
          ) : isLoggedIn ? (
            <button
              onClick={handleCheckout}
              disabled={isLoading}
              className="btn-primary w-full justify-center py-2.5 text-base glow-brand"
            >
              {isLoading
                ? <span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Redirection...</span>
                : <span className="flex items-center gap-2"><Zap size={15} /> Passer au Premium</span>}
            </button>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={isLoading}
              className="btn-primary w-full justify-center py-2.5 text-base glow-brand"
            >
              {isLoading
                ? <span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Redirection...</span>
                : <span className="flex items-center gap-2"><Zap size={15} /> Commencer — 9,99€/mois</span>}
            </button>
          )}
          <p className="text-xs text-[#444444] text-center mt-3">
            Paiement sécurisé · Annulation en un clic · Sans engagement
          </p>
        </div>
      </div>
    </div>
    </>
  )
}
