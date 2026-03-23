import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  const to     = process.env.FEEDBACK_EMAIL

  // Fail fast : erreur 500 explicite si la config est absente (plus de silence)
  if (!apiKey || !to) {
    console.error('[Feedback] Configuration manquante — RESEND_API_KEY:', !!apiKey, '| FEEDBACK_EMAIL:', !!to)
    return NextResponse.json(
      { error: 'Service email non configuré' },
      { status: 500 },
    )
  }

  try {
    const { message, email } = await req.json()

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    const resend = new Resend(apiKey)

    const { data, error } = await resend.emails.send({
      // onboarding@resend.dev est limité à l'email du propriétaire du compte Resend.
      // Utilise ton domaine vérifié (ex: feedback@votredomaine.com) dès qu'il est prêt.
      from:    'ViroScan Feedback <onboarding@resend.dev>',
      to,
      subject: '[ViroScan] Nouveau feedback',
      text: [
        `Expéditeur : ${email?.trim() || 'Anonyme'}`,
        '',
        message.trim(),
      ].join('\n'),
    })

    if (error) {
      console.error('[Feedback] Resend error:', error)
      return NextResponse.json({ error: 'Échec de l\'envoi' }, { status: 500 })
    }

    console.log('[Feedback] Email envoyé — id:', data?.id, '| to:', to)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Feedback] Exception:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
