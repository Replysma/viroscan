'use client'

import Header from '@/components/Header'
import PricingTable from '@/components/PricingTable'
import TrustBanner from '@/components/TrustBanner'
import SocialProof from '@/components/SocialProof'
import { Zap, ShieldCheck, Archive, Clock } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function PricingContent() {
  const params  = useSearchParams()
  const success  = params.get('upgrade') === 'success'
  const cancelled = params.get('upgrade') === 'cancelled'

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-16 space-y-16">

        {/* Bandeau succès/annulation */}
        {success && (
          <div className="rounded-xl border border-[rgba(212,160,23,0.35)] bg-[rgba(212,160,23,0.08)] px-6 py-4 flex items-center gap-3 animate-fade-in">
            <ShieldCheck size={20} className="text-[#D4A017] flex-shrink-0" />
            <div>
              <p className="font-semibold text-[#D4A017]">Abonnement Premium activé !</p>
              <p className="text-sm text-[#B3B3B3] mt-0.5">Vous avez maintenant accès aux analyses illimitées et aux détails complets.</p>
            </div>
          </div>
        )}
        {cancelled && (
          <div className="rounded-xl border border-[#2A2A2A] bg-[#121212] px-6 py-4 flex items-center gap-3 animate-fade-in">
            <p className="text-sm text-[#666666]">Paiement annulé. Vous restez sur le plan gratuit.</p>
            <Link href="/dashboard" className="ml-auto text-sm text-[#D4A017] hover:text-[#F2C94C] transition-colors flex-shrink-0">
              Retour au tableau de bord →
            </Link>
          </div>
        )}

        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-[rgba(212,160,23,0.08)] border border-[rgba(212,160,23,0.25)] rounded-full px-4 py-1.5 text-sm text-[#D4A017] mb-2">
            <Zap size={14} /> Tarifs simples et transparents
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Choisissez votre plan
          </h1>
          <p className="text-[#666666] text-lg max-w-xl mx-auto">
            Commencez gratuitement. Passez au Premium quand vous avez besoin de plus de puissance.
          </p>
          <SocialProof />
        </div>

        {/* Pricing table */}
        <PricingTable />

        {/* Comparatif détaillé */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white text-center">Comparaison complète</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#242424]">
                  <th className="text-left px-6 py-4 text-[#666666] font-medium w-1/2">Fonctionnalité</th>
                  <th className="text-center px-6 py-4 text-[#B3B3B3] font-medium">Gratuit</th>
                  <th className="text-center px-6 py-4 text-[#D4A017] font-medium">Premium</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-[#1E1E1E] ${i % 2 === 0 ? '' : 'bg-[#0D0D0D]'}`}>
                    <td className="px-6 py-3.5 text-[#B3B3B3]">{row.feature}</td>
                    <td className="px-6 py-3.5 text-center">{renderCell(row.free)}</td>
                    <td className="px-6 py-3.5 text-center">{renderCell(row.premium)}</td>
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
                <p className="text-[#666666] text-sm mt-3 leading-relaxed">{q.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Trust banner */}
        <TrustBanner />

      </main>

      <footer className="border-t border-[#242424] py-8 text-center text-[#444444] text-sm">
        <p>© 2025 ZipView — Paiement sécurisé par <span className="text-[#666666]">Stripe</span></p>
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
  { feature: 'Taille max archive',         free: '50 Mo',       premium: '500 Mo' },
  { feature: 'Analyses antivirus / jour',  free: '3',           premium: 'Illimité' },
  { feature: 'Statut de menace',           free: true,          premium: true },
  { feature: 'Noms de fichiers suspects',  free: false,         premium: true },
  { feature: 'Hashes et signatures',       free: false,         premium: true },
  { feature: 'Rapport VirusTotal',         free: false,         premium: true },
  { feature: 'Détection ZIP bomb',         free: true,          premium: true },
  { feature: 'Aperçu texte & images',      free: true,          premium: true },
  { feature: 'Aperçu PDF',                 free: false,         premium: true },
  { feature: 'Durée de conservation',      free: '2h',          premium: '48h' },
  { feature: 'Historique',                 free: 'Limité',      premium: 'Étendu' },
  { feature: 'Traitement prioritaire',     free: false,         premium: true },
  { feature: 'Support',                    free: 'Communauté',  premium: 'Prioritaire' },
]

const FAQ = [
  { q: 'Puis-je annuler à tout moment ?',
    a: 'Oui. Vous pouvez annuler depuis votre portail client Stripe en un clic. Votre accès Premium reste actif jusqu\'à la fin de la période en cours.' },
  { q: 'Mes fichiers sont-ils stockés après l\'analyse ?',
    a: 'Non. Les fichiers sont supprimés automatiquement (2h pour le plan gratuit, 48h pour le Premium). Aucune copie n\'est conservée au-delà.' },
  { q: 'Le plan gratuit est-il vraiment gratuit ?',
    a: 'Oui, sans carte de crédit requise. La limite est de 3 analyses par 24h et 50 Mo par archive.' },
  { q: 'Comment fonctionne la détection de menaces ?',
    a: 'ZipView utilise une analyse heuristique (magic bytes, extensions, MIME mismatch) et peut optionnellement interroger l\'API VirusTotal pour les abonnés Premium.' },
  { q: 'Quels formats sont acceptés ?',
    a: 'ZIP et RAR pour l\'explorateur d\'archives. L\'analyseur antivirus accepte tous les types de fichiers.' },
]

function renderCell(val: string | boolean) {
  if (val === true)  return <span className="text-[#D4A017]">✓</span>
  if (val === false) return <span className="text-[#333333]">—</span>
  return <span className="text-[#B3B3B3]">{val}</span>
}
