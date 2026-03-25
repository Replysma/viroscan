'use client'

import { useState } from 'react'
import { Check, Zap, Loader2, Crown, X } from 'lucide-react'
import Link from 'next/link'

const FREE_FEATURES = [
  '50 posts par mois',
  '1 compte connecté',
  'Scraping basique',
  'Planification manuelle',
  'Support communauté',
]

const PRO_FEATURES = [
  'Posts illimités',
  '5 comptes connectés',
  'Scraping avancé',
  'Export des leads',
  'Automatisations visuelles',
  'Support prioritaire',
]

const AGENCY_FEATURES = [
  'Tout illimité',
  'Comptes illimités',
  'Accès API',
  'Support dédié',
  'White-label',
  'Onboarding personnalisé',
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
      // Vérifie d'abord si l'utilisateur est déjà premium
      const meRes  = await fetch('/api/me', { cache: 'no-store' })
      const meData = await meRes.json()
      if (meData.isPremium) {
        setIsLoading(false)
        setShowAlreadyPremium(true)
        return
      }

      const res  = await fetch('/api/stripe/checkout', { method: 'POST' })
      if (!res.ok && res.headers.get('content-type')?.includes('text/html')) {
        alert(`Erreur serveur (${res.status}) — consultez les logs Vercel pour plus de détails.`)
        setIsLoading(false)
        return
      }
      const data = await res.json()
      if (data.url) {
        window.location.assign(data.url)
      } else {
        alert(data.error || 'Erreur lors de la redirection vers le paiement')
        setIsLoading(false)
      }
    } catch (err: any) {
      alert(`Erreur réseau : ${err?.message ?? 'veuillez réessayer.'}`)
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
    <div>
      {showAlreadyPremium && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="relative bg-[#000000] border border-[rgba(225,173,1,0.5)] rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <button
              onClick={() => setShowAlreadyPremium(false)}
              className="absolute top-4 right-4 text-[#555555] hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 bg-[rgba(225,173,1,0.1)] border border-[rgba(225,173,1,0.4)] rounded-2xl flex items-center justify-center">
                <Crown size={26} className="text-[#E1AD01]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Abonnement déjà actif.</h3>
                <p className="text-[#AAAAAA] text-sm leading-relaxed">Vous avez déjà un abonnement Pro actif. Profitez de votre automatisation illimitée !</p>
              </div>
              <button
                onClick={() => setShowAlreadyPremium(false)}
                className="btn-primary w-full justify-center py-2.5 mt-2"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">

        {/* ── Plan Free ── */}
        <div className="card p-7 flex flex-col">
          <div className="mb-6">
            <p className="text-xs text-[#555555] uppercase tracking-widest font-medium mb-2">Free</p>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold text-white">0 €</span>
              <span className="text-[#555555] mb-1">/mois</span>
            </div>
            <p className="text-sm text-[#555555] mt-2">Pour démarrer sans engagement</p>
          </div>

          <ul className="space-y-2.5 flex-1 mb-7">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-[#AAAAAA]">
                <Check size={15} className="text-[#555555] mt-0.5 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <Link href="/dashboard" className="btn-secondary w-full justify-center py-2.5 text-center">
            Commencer gratuitement
          </Link>
        </div>

        {/* ── Plan Pro ── */}
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
            <p className="text-xs text-[#E1AD01] uppercase tracking-widest font-medium mb-2">Pro</p>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold text-white">29 €</span>
              <span className="text-[#555555] mb-1">/mois</span>
            </div>
            <p className="text-sm text-[#555555] mt-2">Posts illimités, 5 comptes, leads export</p>
          </div>

          <ul className="space-y-2.5 flex-1 mb-7 relative">
            {PRO_FEATURES.map(f => (
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
                <span className="flex items-center gap-2"><Zap size={15} /> Plan actuel</span>
              </button>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="btn-primary w-full justify-center py-2.5 text-base glow-brand"
              >
                <span className="flex items-center gap-2">
                  {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                  <span translate="no">{isLoading ? 'Redirection...' : 'Passer au Pro — 29€/mois'}</span>
                </span>
              </button>
            )}
            <p className="text-xs text-[#444444] text-center mt-3">
              Paiement sécurisé · Annulation en un clic · Sans engagement
            </p>
          </div>
        </div>

        {/* ── Plan Agency ── */}
        <div className="card p-7 flex flex-col">
          <div className="mb-6">
            <p className="text-xs text-[#555555] uppercase tracking-widest font-medium mb-2">Agency</p>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold text-white">99 €</span>
              <span className="text-[#555555] mb-1">/mois</span>
            </div>
            <p className="text-sm text-[#555555] mt-2">Pour les agences et revendeurs</p>
          </div>

          <ul className="space-y-2.5 flex-1 mb-7">
            {AGENCY_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-[#AAAAAA]">
                <Check size={15} className="text-[#555555] mt-0.5 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <Link href="/dashboard" className="btn-secondary w-full justify-center py-2.5 text-center">
            Nous contacter
          </Link>
        </div>

      </div>
    </div>
  )
}
