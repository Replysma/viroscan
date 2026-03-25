'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, Search, Zap, ArrowRight, Check, MessageSquare } from 'lucide-react'
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import PricingTable from '@/components/PricingTable'
import FeedbackModal from '@/components/FeedbackModal'

const CLERK_ENABLED =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('XXXX')

const FEATURES = [
  {
    icon: Calendar,
    title: 'Bot de publication automatique',
    desc: 'Planifiez et publiez automatiquement sur TikTok et Instagram. Définissez vos horaires, FlowSync fait le reste.',
  },
  {
    icon: Search,
    title: 'Scraper de tendances & leads',
    desc: 'Extrayez les hashtags viraux, les comptes influents et les leads qualifiés en quelques clics.',
  },
  {
    icon: Zap,
    title: 'Alternative simple à Zapier',
    desc: 'Créez des automatisations puissantes avec une interface visuelle. Connectez vos apps sans une ligne de code.',
  },
]

export default function LandingPage() {
  const [showFeedback, setShowFeedback] = useState(false)

  return (
    <div className="min-h-screen text-white overflow-x-hidden">

      {/* ── Barre d'annonce top ──────────────────────────────────────────────── */}
      <div className="fixed top-0 inset-x-0 z-50 h-8 flex items-center justify-center bg-[#1A1500] border-b border-[rgba(180,140,0,0.15)]">
        <p className="text-xs font-semibold text-[#C9A800]">
          ⚡ FlowSync est en beta — Rejoignez la liste d&apos;attente · Obtenez 3 mois gratuits
        </p>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────────── */}
      <nav className="fixed top-8 inset-x-0 z-50 h-16">
        {/* Fond glass */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]" />
        <div className="relative max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-[#FFD000] flex items-center justify-center text-black font-extrabold text-base transition-opacity group-hover:opacity-80">
              ⚡
            </div>
            <span className="font-bold text-[17px] tracking-tight">FlowSync</span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFeedback(true)}
              className="flex items-center gap-1.5 text-sm text-[#888888] hover:text-white border border-[#222222] hover:border-[#333333] px-3 py-1.5 rounded-lg transition-colors"
            >
              <MessageSquare size={13} />
              Feedback
            </button>

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
                Ouvrir l&apos;app <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="pt-48 pb-28 px-6 text-center relative">
        {/* Halo central */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse,rgba(255,215,0,0.12)_0%,transparent_65%)] pointer-events-none" />

        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full text-sm font-medium text-[#FFD700] border border-[rgba(255,215,0,0.25)] bg-[rgba(255,215,0,0.06)] backdrop-blur-sm shadow-[0_0_20px_rgba(255,215,0,0.08)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700] shadow-[0_0_6px_#FFD700] animate-pulse" />
          Automatisation en temps réel
        </div>

        {/* Titre */}
        <h1 className="text-5xl md:text-[68px] font-extrabold leading-[1.1] tracking-tight mb-6 max-w-4xl mx-auto">
          Automatisez TikTok &amp; Instagram<br />
          <span className="text-gradient">sans effort</span>
        </h1>

        <p className="text-lg md:text-xl text-[#888888] max-w-xl mx-auto mb-10 leading-relaxed">
          Publiez automatiquement, scrapez les tendances, générez des leads — sans toucher à Zapier.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/dashboard" className="btn-primary text-base px-7 py-3 rounded-2xl">
            Commencer l&apos;automatisation <ArrowRight size={17} />
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
            { val: '10K+',  label: 'posts publiés' },
            { val: '100%',  label: 'no-code' },
            { val: '0',     label: 'installation requise' },
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
                  flowsync.app/dashboard
                </div>
              </div>
            </div>

            {/* Contenu */}
            <div className="grid grid-cols-[220px_1fr] divide-x divide-white/[0.04]">
              {/* Sidebar */}
              <div className="p-4 space-y-1">
                {[
                  { label: 'Publier',       active: false },
                  { label: 'Planification', active: true  },
                  { label: 'Tendances',     active: false },
                  { label: 'Leads',         active: false },
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
                  <p className="text-sm font-semibold text-white">Posts planifiés cette semaine</p>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    12 actifs
                  </span>
                </div>
                {[
                  { name: 'TikTok — Vidéo tendance #1',    status: 'Publié',    color: 'text-emerald-400' },
                  { name: 'Instagram — Reel promotionnel',  status: 'Planifié',  color: 'text-amber-400' },
                  { name: 'TikTok — Tutorial produit',      status: 'Planifié',  color: 'text-amber-400' },
                  { name: 'Instagram — Story engagement',   status: 'Brouillon', color: 'text-[#555555]' },
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
          <p className="text-[#666666] mt-4 max-w-lg mx-auto">L&apos;automatisation sociale, sans la complexité.</p>
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
          <p className="text-[#555555] mt-4">Commencez gratuitement, passez au Pro quand vous en avez besoin.</p>
        </div>
        <PricingTable />
      </section>

      {/* ── Trust ────────────────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6">
          <div className="rounded-3xl border border-white/[0.06] p-8 text-center"
               style={{ background: 'linear-gradient(135deg, #141414, #0e0e0e)' }}>
            <div className="flex flex-wrap justify-center gap-8 text-sm">
              {['Paiement sécurisé Stripe', 'Données chiffrées en transit', '100% no-code', 'Sans installation'].map(t => (
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
          <div className="w-6 h-6 rounded-lg bg-[#FFD700] flex items-center justify-center text-black text-xs font-bold">
            ⚡
          </div>
          <span className="font-semibold text-white text-sm">FlowSync</span>
        </div>
        <p className="text-[#333333] text-sm">© 2025 FlowSync · Paiement sécurisé par Stripe</p>
      </footer>

      {/* ── Bouton feedback flottant ──────────────────────────────────────────── */}
      <button
        onClick={() => setShowFeedback(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-black bg-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.35)] hover:bg-[#ffe033] hover:shadow-[0_0_28px_rgba(255,215,0,0.5)] transition-all active:scale-95"
      >
        <MessageSquare size={15} />
        Feedback
      </button>

      {/* ── Modal feedback ───────────────────────────────────────────────────── */}
      {showFeedback && (
        <FeedbackModal onClose={() => setShowFeedback(false)} />
      )}
    </div>
  )
}
