'use client'

import { useState } from 'react'
import { X, Send, CheckCircle, Loader2 } from 'lucide-react'

interface Props {
  onClose: () => void
}

export default function FeedbackModal({ onClose }: Props) {
  const [message, setMessage] = useState('')
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!message.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), email: email.trim() }),
      })
      if (!res.ok) throw new Error()
      setSent(true)
    } catch {
      setError('Erreur lors de l\'envoi. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-[#111111] border border-[#222222] rounded-2xl p-6 shadow-2xl animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#444444] hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        {sent ? (
          <div className="text-center py-4 space-y-3">
            <CheckCircle size={36} className="text-[#FFD700] mx-auto" />
            <p className="font-semibold text-white">Merci pour votre retour !</p>
            <p className="text-[#555555] text-sm">On en tiendra compte.</p>
            <button onClick={onClose} className="btn-primary w-full justify-center py-2 mt-2">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h3 className="font-bold text-white text-base">Votre avis</h3>
              <p className="text-[#555555] text-xs mt-0.5">Bug, suggestion ou autre — tout est utile.</p>
            </div>

            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              rows={4}
              placeholder="Décrivez votre retour…"
              className="w-full bg-[#0a0a0a] border border-[#222222] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#333333] resize-none focus:outline-none focus:border-[rgba(255,215,0,0.35)] transition-colors"
            />

            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Votre email (optionnel)"
              className="w-full bg-[#0a0a0a] border border-[#222222] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#333333] focus:outline-none focus:border-[rgba(255,215,0,0.35)] transition-colors"
            />

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="btn-primary w-full justify-center py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Envoi…</>
                : <><Send size={14} /> Envoyer</>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
