'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Archive, Eye, Download, Shield, Zap, ArrowRight, Check, Star } from 'lucide-react'
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import PricingTable from '@/components/PricingTable'

const CLERK_ENABLED =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('XXXX')

const FEATURES = [
  { icon: Shield,   title: 'Analyse antivirus',    desc: 'Scannez chaque fichier de l\'archive avec un moteur de détection de menaces en temps réel.' },
  { icon: Eye,      title: 'Aperçu universel',      desc: 'Prévisualisez PDF, Word, Excel, images et code directement dans le navigateur.' },
  { icon: Archive,  title: 'ZIP & RAR natif',       desc: 'Support complet des archives ZIP et RAR, y compris les structures imbriquées complexes.' },
  { icon: Download, title: 'Extraction sélective',  desc: 'Téléchargez uniquement les fichiers dont vous avez besoin, sans extraire toute l\'archive.' },
  { icon: Zap,      title: 'Lecture seule sécurisée', desc: 'Tout contenu est converti côté serveur — aucun script ne s\'exécute sur votre machine.' },
  { icon: Star,     title: 'Historique complet',    desc: 'Retrouvez toutes vos archives récentes, filtrez et rechargez en un clic.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen text-white overflow-x-hidden">

      {/* ── Navigation ───────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 h-16">
        {/* Fond glass */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]" />
        <div className="relative max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image src="/logo.png" alt="ViroScan" width={56} height={56} unoptimized className="transition-opacity group-hover:opacity-80" />
            <span className="font-bold text-[17px] tracking-tight">ViroScan</span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {CLERK_ENABLED ? (
              <>
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="btn-ghost text-sm">Connexion</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="btn-primary text-sm px-5 py-2">Commencer gratuitement</button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <Link href="/dashboard" className="btn-primary text-sm px-5 py-2">
                    Tableau de bord <ArrowRight size={14} />
                  </Link>
                  <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
                </Show>
              </>
            ) : (
              <Link href="/dashboard" className="btn-primary text-sm px-5 py-2">
                Ouvrir l'app <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="pt-40 pb-28 px-6 text-center relative">
        {/* Halo central */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse,rgba(255,215,0,0.12)_0%,transparent_65%)] pointer-events-none" />

        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full text-sm font-medium text-[#FFD700] border border-[rgba(255,215,0,0.25)] bg-[rgba(255,215,0,0.06)] backdrop-blur-sm shadow-[0_0_20px_rgba(255,215,0,0.08)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700] shadow-[0_0_6px_#FFD700] animate-pulse" />
          Analyse antivirus en temps réel
        </div>

        {/* Titre */}
        <h1 className="text-5xl md:text-[68px] font-extrabold leading-[1.1] tracking-tight mb-6 max-w-4xl mx-auto">
          Explorez & analysez<br />
          vos archives en{' '}
          <span className="text-gradient">toute sécurité</span>
        </h1>

        <p className="text-lg md:text-xl text-[#888888] max-w-xl mx-auto mb-10 leading-relaxed">
          Importez un ZIP ou RAR, scannez son contenu pour les virus,
          prévisualisez chaque fichier — sans jamais rien télécharger.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/dashboard" className="btn-primary text-base px-7 py-3 rounded-2xl">
            Analyser une archive <ArrowRight size={17} />
          </Link>
          {CLERK_ENABLED && (
            <Show when="signed-out">
              <SignUpButton mode="modal">
                <button className="btn-secondary text-base px-7 py-3 rounded-2xl">
                  Créer un compte gratuit
                </button>
              </SignUpButton>
            </Show>
          )}
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-[#555555]">
          {[
            { val: '50+',    label: 'formats prévisualisés' },
            { val: '100%',   label: 'côté serveur' },
            { val: '0',      label: 'installation requise' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-white">{s.val}</p>
              <p className="text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Mockup ───────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-28">
        <div className="relative">
          {/* Glow derrière le mockup */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(255,215,0,0.07),transparent)] blur-xl" />

          <div className="relative rounded-3xl border border-white/[0.07] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_80px_rgba(0,0,0,0.8)]"
               style={{ background: 'linear-gradient(160deg, #161616 0%, #0e0e0e 100%)' }}>
            {/* Barre de titre */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-black/40 rounded-lg px-4 py-1.5 text-xs text-[#444444] font-mono w-fit mx-auto">
                  viroscan.app/dashboard
                </div>
              </div>
            </div>

            {/* Contenu */}
            <div className="grid grid-cols-[220px_1fr] divide-x divide-white/[0.04]">
              {/* Sidebar */}
              <div className="p-4 space-y-1">
                {[
                  { label: 'Importer',         active: false },
                  { label: 'Analyse Virus',     active: true  },
                  { label: 'Aperçu Sécurisé',  active: false },
                  { label: 'Historique',        active: false },
                ].map(item => (
                  <div key={item.label}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      item.active
                        ? 'bg-[rgba(255,215,0,0.1)] text-[#FFD700] border border-[rgba(255,215,0,0.15)]'
                        : 'text-[#444444]'
                    }`}>
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Main */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-white">malware-sample.zip</p>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                    2 menaces détectées
                  </span>
                </div>
                {[
                  { name: 'document.pdf',      status: 'clean',    color: 'text-emerald-400' },
                  { name: 'invoice.exe',        status: 'infecté',  color: 'text-red-400' },
                  { name: 'readme.txt',         status: 'clean',    color: 'text-emerald-400' },
                  { name: 'update_patch.dll',   status: 'suspect',  color: 'text-amber-400' },
                ].map(f => (
                  <div key={f.name} className="flex items-center justify-between px-4 py-3 rounded-xl bg-black/30 border border-white/[0.04]">
                    <span className="text-sm font-mono text-[#AAAAAA]">{f.name}</span>
                    <span className={`text-xs font-semibold ${f.color}`}>{f.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-[#FFD700] uppercase tracking-widest mb-4">Fonctionnalités</p>
          <h2 className="text-4xl font-bold tracking-tight">Tout ce dont vous avez besoin</h2>
          <p className="text-[#666666] mt-4 max-w-lg mx-auto">Un outil complet pour explorer, analyser et prévisualiser vos archives en toute sécurité.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div key={i} className="card p-6 group cursor-default">
              <div className="w-11 h-11 rounded-2xl bg-[rgba(255,215,0,0.07)] border border-[rgba(255,215,0,0.1)] flex items-center justify-center mb-5 text-[#FFD700] transition-all group-hover:bg-[rgba(255,215,0,0.12)] group-hover:shadow-[0_0_16px_rgba(255,215,0,0.2)] group-hover:border-[rgba(255,215,0,0.25)]">
                <f.icon size={20} />
              </div>
              <h3 className="font-semibold text-base mb-2 text-white">{f.title}</h3>
              <p className="text-[#555555] text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="divider" />
      </div>

      {/* ── Pricing ──────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24" id="pricing">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-[#FFD700] uppercase tracking-widest mb-4">Tarifs</p>
          <h2 className="text-4xl font-bold tracking-tight">Simple et transparent</h2>
          <p className="text-[#555555] mt-4">Commencez gratuitement, passez au premium quand vous en avez besoin.</p>
        </div>
        <PricingTable />
      </section>

      {/* ── Trust ────────────────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6">
          <div className="rounded-3xl border border-white/[0.06] p-8 text-center"
               style={{ background: 'linear-gradient(135deg, #141414, #0e0e0e)' }}>
            <div className="flex flex-wrap justify-center gap-8 text-sm">
              {['Paiement sécurisé Stripe', 'Aucun fichier conservé au-delà de 48h', 'Analyse 100% côté serveur', 'HTTPS uniquement'].map(t => (
                <div key={t} className="flex items-center gap-2 text-[#666666]">
                  <Check size={14} className="text-[#FFD700]" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-[#FFD700] flex items-center justify-center">
            <Shield size={12} className="text-black" />
          </div>
          <span className="font-semibold text-white text-sm">ViroScan</span>
        </div>
        <p className="text-[#333333] text-sm">© 2025 ViroScan · Paiement sécurisé par Stripe</p>
      </footer>
    </div>
  )
}
