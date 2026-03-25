'use client'

import Header from '@/components/Header'
import PricingTable from '@/components/PricingTable'
import TrustBanner from '@/components/TrustBanner'
import SocialProof from '@/components/SocialProof'
import { Zap, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { usePlan } from '@/hooks/usePlan'

function PricingContent() {
  const params    = useSearchParams()
  const success   = params.get('upgrade') === 'success'
  const cancelled = params.get('upgrade') === 'cancelled'
  const { isPremium, loaded } = usePlan()

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-16 space-y-16">

        {/* Bandeau succès/annulation */}
        {success && (
          <div className="rounded-xl border border-[rgba(225,173,1,0.35)] bg-[rgba(225,173,1,0.08)] px-6 py-4 flex items-center gap-3 animate-fade-in">
            <ShieldCheck size={20} className="text-[#E1AD01] flex-shrink-0" />
            <div>
              <p className="font-semibold text-[#E1AD01]">Abonnement Pro activé !</p>
              <p className="text-sm text-[#AAAAAA] mt-0.5">Vous avez maintenant accès aux posts illimités et à toutes les fonctionnalités avancées.</p>
            </div>
          </div>
        )}
        {cancelled && (
          <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] px-6 py-4 flex items-center gap-3 animate-fade-in">
            <p className="text-sm text-[#555555]">Paiement annulé. Vous restez sur le plan gratuit.</p>
            <Link href="/dashboard" className="ml-auto text-sm text-[#E1AD01] hover:text-[#FFCC00] transition-colors flex-shrink-0">
              Retour au tableau de bord →
            </Link>
          </div>
        )}

        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-[rgba(225,173,1,0.08)] border border-[rgba(225,173,1,0.25)] rounded-full px-4 py-1.5 text-sm text-[#E1AD01] mb-2">
            <Zap size={14} /> Tarifs simples et transparents
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Choisissez votre plan
          </h1>
          <p className="text-[#555555] text-lg max-w-xl mx-auto">
            Commencez gratuitement. Passez au Pro quand vous avez besoin de plus de puissance.
          </p>
          <SocialProof />
        </div>

        {/* Pricing table */}
        <PricingTable currentPlan={loaded && isPremium ? 'premium' : 'free'} isLoggedIn={loaded} />

        {/* Comparatif détaillé */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white text-center">Comparaison complète</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1A1A1A]">
                  <th className="text-left px-6 py-4 text-[#555555] font-medium w-1/2">Fonctionnalité</th>
                  <th className="text-center px-6 py-4 text-[#AAAAAA] font-medium">Free</th>
                  <th className="text-center px-6 py-4 text-[#E1AD01] font-medium">Pro</th>
                  <th className="text-center px-6 py-4 text-[#AAAAAA] font-medium">Agency</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-[#1E1E1E] ${i % 2 === 0 ? '' : 'bg-[#0D0D0D]'}`}>
                    <td className="px-6 py-3.5 text-[#AAAAAA]">{row.feature}</td>
                    <td className="px-6 py-3.5 text-center">{renderCell(row.free)}</td>
                    <td className="px-6 py-3.5 text-center">{renderCell(row.pro)}</td>
                    <td className="px-6 py-3.5 text-center">{renderCell(row.agency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-6 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center">Questions fréquentes</h2>
          <div className="space-y-3">
            {FAQ.map(q => (
              <details key={q.q} className="card px-5 py-4 group cursor-pointer">
                <summary className="font-medium text-white list-none flex items-center justify-between">
                  {q.q}
                  <span className="text-[#555555] group-open:rotate-45 transition-transform text-lg">+</span>
                </summary>
                <p className="text-[#555555] text-sm mt-3 leading-relaxed">{q.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Trust banner */}
        <TrustBanner />

      </main>

      <footer className="border-t border-[#1A1A1A] py-8 text-center text-[#444444] text-sm">
        <p>© 2025 FlowSync — Paiement sécurisé par <span className="text-[#555555]">Stripe</span></p>
      </footer>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  )
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const COMPARE_ROWS = [
  { feature: 'Posts par mois',             free: '50',           pro: 'Illimité',    agency: 'Illimité' },
  { feature: 'Comptes connectés',          free: '1',            pro: '5',           agency: 'Illimité' },
  { feature: 'Scraping de hashtags',       free: 'Basique',      pro: 'Avancé',      agency: 'Avancé' },
  { feature: 'Export des leads',           free: false,          pro: true,          agency: true },
  { feature: 'Automatisations visuelles',  free: false,          pro: true,          agency: true },
  { feature: 'Accès API',                  free: false,          pro: false,         agency: true },
  { feature: 'White-label',                free: false,          pro: false,         agency: true },
  { feature: 'Planification avancée',      free: false,          pro: true,          agency: true },
  { feature: 'Analytiques',               free: 'Basique',      pro: 'Avancé',      agency: 'Avancé' },
  { feature: 'Historique',                 free: '7 jours',      pro: '90 jours',    agency: 'Illimité' },
  { feature: 'Onboarding personnalisé',    free: false,          pro: false,         agency: true },
  { feature: 'Support',                    free: 'Communauté',   pro: 'Prioritaire', agency: 'Dédié' },
]

const FAQ = [
  { q: 'Puis-je annuler à tout moment ?',
    a: 'Oui. Vous pouvez annuler depuis votre portail client Stripe en un clic. Votre accès Pro reste actif jusqu\'à la fin de la période en cours.' },
  { q: 'FlowSync fonctionne-t-il sans installation ?',
    a: 'Oui, FlowSync est 100% cloud. Aucun logiciel à installer, tout se passe depuis votre navigateur.' },
  { q: 'Le plan Free est-il vraiment gratuit ?',
    a: 'Oui, sans carte de crédit requise. Vous bénéficiez de 50 posts par mois et d\'un compte connecté.' },
  { q: 'Comment fonctionne le scraping de tendances ?',
    a: 'FlowSync analyse en temps réel les hashtags viraux, les comptes influents et les contenus performants sur TikTok et Instagram pour vous donner une longueur d\'avance.' },
  { q: 'Puis-je connecter plusieurs comptes ?',
    a: 'Oui. Le plan Pro permet de connecter jusqu\'à 5 comptes, et le plan Agency offre des comptes illimités.' },
]

function renderCell(val: string | boolean) {
  if (val === true)  return <span className="text-[#E1AD01]">✓</span>
  if (val === false) return <span className="text-[#333333]">—</span>
  return <span className="text-[#AAAAAA]">{val}</span>
}
