'use client'

import Link from 'next/link'
import { Archive, Eye, Download, Shield, Zap, ArrowRight } from 'lucide-react'
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import SocialProof from '@/components/SocialProof'
import TrustBanner from '@/components/TrustBanner'
import PricingTable from '@/components/PricingTable'

const CLERK_ENABLED =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('XXXX')

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Nav */}
      <nav className="border-b border-[#242424] sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#D4A017] rounded-lg flex items-center justify-center">
              <Archive size={18} className="text-black" />
            </div>
            <span className="font-bold text-lg text-white">ZipView</span>
          </div>
          <div className="flex items-center gap-3">
            {CLERK_ENABLED ? (
              <>
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="btn-ghost text-sm">Connexion</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="btn-primary text-sm">Commencer gratuitement</button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <Link href="/dashboard" className="btn-primary text-sm">
                    Tableau de bord <ArrowRight size={15} />
                  </Link>
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: 'w-8 h-8',
                        userButtonPopoverCard: 'bg-[#121212] border border-[#2A2A2A]',
                        userButtonPopoverFooter: 'hidden',
                      },
                    }}
                  />
                </Show>
              </>
            ) : (
              <Link href="/dashboard" className="btn-primary text-sm">
                Ouvrir le tableau de bord <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-[rgba(212,160,23,0.08)] border border-[rgba(212,160,23,0.25)] rounded-full px-4 py-1.5 text-sm text-[#D4A017] mb-8">
          <Zap size={14} />
          Aucun téléchargement — aperçu instantané
        </div>

        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Explorez vos fichiers ZIP & RAR<br />
          <span className="text-[#D4A017]">sans les télécharger</span>
        </h1>

        <p className="text-xl text-[#B3B3B3] max-w-2xl mx-auto mb-10">
          Importez votre archive, parcourez son contenu instantanément,
          prévisualisez les fichiers et extrayez uniquement ce dont vous avez besoin.
        </p>

        <SocialProof />

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/dashboard" className="btn-primary text-base px-6 py-3">
            Ouvrir le tableau de bord <ArrowRight size={18} />
          </Link>
          {CLERK_ENABLED && (
            <Show when="signed-out">
              <SignUpButton mode="modal">
                <button className="btn-secondary text-base px-6 py-3">
                  Créer un compte gratuit
                </button>
              </SignUpButton>
            </Show>
          )}
        </div>

        {/* Hero mockup */}
        <div className="mt-16 relative mx-auto max-w-4xl">
          <div className="absolute inset-0 bg-[rgba(212,160,23,0.06)] blur-3xl rounded-full" />
          <div className="relative card p-6 text-left">
            <div className="flex items-center gap-3 pb-4 border-b border-[#242424] mb-4">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <span className="text-sm text-[#555555]">project-v2.zip — 42 files</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                {[
                  { icon: '📁', name: 'src/', size: '' },
                  { icon: '📄', name: '  index.ts', size: '4.2 KB' },
                  { icon: '📄', name: '  app.tsx', size: '8.1 KB' },
                  { icon: '📁', name: 'public/', size: '' },
                  { icon: '🖼️', name: '  logo.png', size: '24 KB' },
                  { icon: '📄', name: 'README.md', size: '2.3 KB' },
                  { icon: '📄', name: 'package.json', size: '1.8 KB' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm ${i === 1 ? 'bg-[rgba(212,160,23,0.1)] text-[#D4A017]' : 'text-[#666666]'}`}
                  >
                    <span className="font-mono">{item.icon} {item.name}</span>
                    <span className="text-[#444444] text-xs">{item.size}</span>
                  </div>
                ))}
              </div>
              <div className="card p-4 bg-[#0D0D0D]">
                <div className="text-xs text-[#555555] mb-3 font-mono">index.ts — preview</div>
                <pre className="text-xs text-green-400 font-mono leading-relaxed overflow-hidden">
{`import express from 'express'
import { router } from './router'

const app = express()
app.use('/api', router)

app.listen(3000, () => {
  console.log('Server ready')
})`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-white">Tout ce dont vous avez besoin</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: <Eye className="text-[#D4A017]" size={24} />, title: 'Aperçu instantané', desc: 'Visualisez textes, images, JSON, code et PDF directement dans le navigateur.' },
            { icon: <Archive className="text-[#D4A017]" size={24} />, title: 'ZIP & RAR', desc: 'Support complet des archives ZIP et RAR, y compris les dossiers imbriqués.' },
            { icon: <Download className="text-[#D4A017]" size={24} />, title: 'Extraction sélective', desc: 'Téléchargez des fichiers individuels ou des dossiers entiers sans tout extraire.' },
            { icon: <Shield className="text-[#D4A017]" size={24} />, title: 'Suppression auto', desc: 'Fichiers supprimés après 2 h (gratuit) ou 48 h (premium).' },
            { icon: <Zap className="text-[#D4A017]" size={24} />, title: 'Rapide & léger', desc: 'Aucune installation requise. Fonctionne dans votre navigateur sur tous vos appareils.' },
            { icon: <Archive className="text-[#D4A017]" size={24} />, title: 'Historique', desc: 'Retrouvez toutes vos archives importées avec recherche et filtrage.' },
          ].map((f, i) => (
            <div key={i} className="card p-6">
              <div className="w-10 h-10 bg-[rgba(212,160,23,0.08)] rounded-lg flex items-center justify-center mb-4">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2 text-white">{f.title}</h3>
              <p className="text-[#666666] text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust banner */}
      <section className="max-w-4xl mx-auto px-4 pb-8">
        <TrustBanner />
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-4 py-20" id="pricing">
        <h2 className="text-3xl font-bold text-center mb-4 text-white">Tarifs simples</h2>
        <p className="text-[#666666] text-center mb-12">Commencez gratuitement, passez au premium quand vous en avez besoin</p>
        <PricingTable />
        <div className="text-center mt-8">
          <Link href="/pricing" className="text-sm text-[#666666] hover:text-[#D4A017] transition-colors">
            Voir la comparaison complète →
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#242424] py-8 text-center text-[#444444] text-sm">
        <p>© 2025 ZipView — Paiement sécurisé par <span className="text-[#666666]">Stripe</span></p>
      </footer>
    </div>
  )
}
