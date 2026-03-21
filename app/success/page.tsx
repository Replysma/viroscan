'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { ShieldCheck, Zap, ArrowRight, Loader2, AlertCircle } from 'lucide-react'

type ActivationState = 'verifying' | 'activated' | 'already_premium' | 'error'

function SuccessContent() {
  const params    = useSearchParams()
  const sessionId = params.get('session_id')

  const [state,   setState]   = useState<ActivationState>('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!sessionId) {
      // Pas de session_id → l'utilisateur est peut-être déjà premium
      setState('already_premium')
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const res  = await fetch('/api/billing/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        const data = await res.json()

        if (cancelled) return

        if (data.success) {
          setState('activated')
        } else {
          setMessage(data.reason ?? 'Paiement non confirmé par Stripe.')
          setState('error')
        }
      } catch {
        if (!cancelled) {
          setMessage('Erreur réseau lors de la vérification.')
          setState('error')
        }
      }
    })()

    return () => { cancelled = true }
  }, [sessionId])

  const features = [
    'Analyses antivirus illimitées',
    "Détails complets des menaces",
    "Archives jusqu'à 500 Mo",
    'Conservation des fichiers 48h',
    'Traitement prioritaire',
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-8">

          {/* ── État : vérification en cours ── */}
          {state === 'verifying' && (
            <>
              <div className="w-20 h-20 bg-[rgba(212,160,23,0.08)] border border-[rgba(212,160,23,0.2)] rounded-3xl flex items-center justify-center mx-auto">
                <Loader2 size={36} className="text-[#D4A017] animate-spin" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-white">Activation en cours…</h1>
                <p className="text-[#666666]">Vérification du paiement auprès de Stripe</p>
              </div>
            </>
          )}

          {/* ── État : Premium activé ── */}
          {(state === 'activated' || state === 'already_premium') && (
            <>
              <div className="w-20 h-20 bg-[rgba(212,160,23,0.1)] border border-[rgba(212,160,23,0.3)] rounded-3xl flex items-center justify-center mx-auto"
                   style={{ boxShadow: '0 0 32px rgba(212,160,23,0.25)' }}>
                <ShieldCheck size={36} className="text-[#D4A017]" />
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-white">
                  Bienvenue dans le Premium !
                </h1>
                <p className="text-[#666666] leading-relaxed">
                  Votre abonnement est actif. Vous avez maintenant accès aux analyses
                  illimitées, aux détails complets des menaces et aux archives jusqu'à 500 Mo.
                </p>
              </div>

              {/* Avantages activés */}
              <div className="card p-5 text-left space-y-3">
                <p className="text-xs text-[#666666] uppercase tracking-widest font-medium">Activé maintenant</p>
                {features.map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-[#B3B3B3]">
                    <Zap size={13} className="text-[#D4A017] flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              <Link
                href="/dashboard"
                className="btn-primary w-full justify-center py-3 text-base"
                style={{ boxShadow: '0 0 18px rgba(212,160,23,0.35)' }}
              >
                Accéder au tableau de bord <ArrowRight size={16} />
              </Link>

              <p className="text-xs text-[#444444]">
                Gérez votre abonnement depuis{' '}
                <button
                  onClick={async () => {
                    const res  = await fetch('/api/billing/portal', { method: 'POST' })
                    const data = await res.json()
                    if (data.url) window.location.assign(data.url)
                  }}
                  className="text-[#666666] hover:text-[#D4A017] underline transition-colors"
                >
                  votre portail client
                </button>
              </p>
            </>
          )}

          {/* ── État : erreur ── */}
          {state === 'error' && (
            <>
              <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mx-auto">
                <AlertCircle size={36} className="text-red-400" />
              </div>

              <div className="space-y-3">
                <h1 className="text-2xl font-bold text-white">Activation impossible</h1>
                <p className="text-[#666666]">{message}</p>
              </div>

              {/* Bouton de réactivation manuelle */}
              {sessionId && (
                <button
                  onClick={() => { setState('verifying'); setMessage('') }}
                  className="btn-secondary w-full justify-center py-3"
                >
                  Réessayer l'activation
                </button>
              )}

              <div className="card p-4 text-left space-y-2">
                <p className="text-sm text-[#B3B3B3] font-medium">Votre paiement a été enregistré ?</p>
                <p className="text-xs text-[#666666]">
                  Contactez le support en joignant votre session ID :{' '}
                  <span className="font-mono text-[#D4A017] text-xs break-all">{sessionId}</span>
                </p>
              </div>

              <Link href="/dashboard" className="btn-ghost w-full justify-center">
                Retour au tableau de bord
              </Link>
            </>
          )}

        </div>
      </main>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
