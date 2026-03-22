'use client'

import { useState } from 'react'
import { X, MessageSquare, Bug, Lightbulb, Send, CheckCircle, Loader2 } from 'lucide-react'

interface Props {
  onClose: () => void
}

type FeedbackType = 'bug' | 'suggestion' | 'other'

export default function FeedbackModal({ onClose }: Props) {
  const [type, setType]       = useState<FeedbackType>('bug')
  const [message, setMessage] = useState('')
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message: message.trim(), email: email.trim() }),
      })

      if (!res.ok) throw new Error('Erreur serveur')

      setSent(true)
    } catch {
      setError('Erreur lors de l\'envoi. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const TYPES: { id: FeedbackType; label: string; icon: typeof Bug }[] = [
    { id: 'bug',        label: 'Bug',        icon: Bug },
    { id: 'suggestion', label: 'Suggestion', icon: Lightbulb },
    { id: 'other',      label: 'Autre',      icon: MessageSquare },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative card max-w-md w-full p-7 border-[rgba(255,215,0,0.2)] animate-slide-up">
        {/* Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,215,0,0.05),transparent_60%)] pointer-events-none rounded-xl" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#555555] hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {sent ? (
          /* ── État succès ── */
          <div className="relative text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-[rgba(255,215,0,0.08)] border border-[rgba(255,215,0,0.2)] rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle size={26} className="text-[#FFD700]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Merci !</h3>
              <p className="text-[#666666] text-sm">Votre retour a bien été envoyé. On en tiendra compte.</p>
            </div>
            <button onClick={onClose} className="btn-primary w-full justify-center py-2.5">
              Fermer
            </button>
          </div>
        ) : (
          /* ── Formulaire ── */
          <form onSubmit={handleSubmit} className="relative space-y-5">
            {/* En-tête */}
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Donner un avis</h3>
              <p className="text-[#666666] text-sm">Signalez un bug ou proposez une amélioration.</p>
            </div>

            {/* Type */}
            <div className="flex gap-2">
              {TYPES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setType(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border transition-all ${
                    type === id
                      ? 'bg-[rgba(255,215,0,0.1)] text-[#FFD700] border-[rgba(255,215,0,0.3)]'
                      : 'text-[#555555] border-[#222222] hover:border-[#333333] hover:text-[#888888]'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5 uppercase tracking-wide">
                Message <span className="text-[#FFD700]">*</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={4}
                placeholder={
                  type === 'bug'
                    ? 'Décrivez le bug : ce qui s\'est passé, les étapes pour le reproduire…'
                    : type === 'suggestion'
                    ? 'Quelle fonctionnalité aimeriez-vous voir ?'
                    : 'Votre message…'
                }
                className="w-full bg-[#0e0e0e] border border-[#222222] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333333] resize-none focus:outline-none focus:border-[rgba(255,215,0,0.3)] transition-colors"
              />
            </div>

            {/* Email (optionnel) */}
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5 uppercase tracking-wide">
                Email <span className="text-[#444444] normal-case font-normal">(optionnel — pour recevoir une réponse)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full bg-[#0e0e0e] border border-[#222222] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#333333] focus:outline-none focus:border-[rgba(255,215,0,0.3)] transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="btn-primary w-full justify-center py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Envoi…</>
                : <><Send size={15} /> Envoyer le retour</>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
