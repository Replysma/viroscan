import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const TO     = process.env.FEEDBACK_EMAIL!

export async function POST(req: NextRequest) {
  try {
    const { message, email } = await req.json()

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    await resend.emails.send({
      from:    'ViroScan Feedback <onboarding@resend.dev>',
      to:      TO,
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
