import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  try {
    const { message, email } = await req.json()

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    const to     = process.env.FEEDBACK_EMAIL

    if (!apiKey || !to) {
      console.warn('[Feedback] RESEND_API_KEY ou FEEDBACK_EMAIL non configuré')
      return NextResponse.json({ ok: true }) // silencieux côté client
    }

    const resend = new Resend(apiKey)

    await resend.emails.send({
      from:    'ViroScan Feedback <onboarding@resend.dev>',
      to,
      subject: `[ViroScan] Nouveau feedback`,
      text: [
        `Expéditeur : ${email?.trim() || 'Anonyme'}`,
        '',
        message.trim(),
      ].join('\n'),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Feedback]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
