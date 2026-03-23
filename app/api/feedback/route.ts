import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

function getConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    to:     process.env.FEEDBACK_EMAIL,
    // Par défaut : onboarding@resend.dev (sandbox Resend).
    // ⚠️  Ce domaine n'autorise l'envoi QUE vers l'email du compte Resend.
    // Dès que tu vérifies un domaine sur resend.com/domains, remplace par :
    //   RESEND_FROM_EMAIL=feedback@tondomaine.com
    from:   process.env.RESEND_FROM_EMAIL ?? 'ViroScan Feedback <onboarding@resend.dev>',
  }
}

// GET /api/feedback — diagnostic : vérifie la config sans envoyer d'email
export async function GET() {
  const { apiKey, to, from } = getConfig()

  if (!apiKey || !to) {
    return NextResponse.json({
      ok:     false,
      reason: 'Variables manquantes',
      RESEND_API_KEY:   !!apiKey,
      FEEDBACK_EMAIL:   !!to,
      RESEND_FROM_EMAIL: from,
    }, { status: 500 })
  }

  try {
    const resend  = new Resend(apiKey)
    const domains = await resend.domains.list()

    const verifiedDomains = (domains.data?.data ?? [])
      .filter((d: { status: string }) => d.status === 'verified')
      .map((d: { name: string }) => d.name)

    const usingDefault = from.includes('onboarding@resend.dev')
    const warning = usingDefault
      ? `onboarding@resend.dev ne peut envoyer QU'à l'email du compte Resend. ` +
        `Vérifie un domaine sur resend.com/domains puis set RESEND_FROM_EMAIL.`
      : null

    return NextResponse.json({
      ok:               true,
      from,
      to,
      verifiedDomains,
      warning,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, reason: message }, { status: 500 })
  }
}

// POST /api/feedback — envoi du feedback
export async function POST(req: NextRequest) {
  const { apiKey, to, from } = getConfig()

  if (!apiKey || !to) {
    console.error('[Feedback] Config manquante — RESEND_API_KEY:', !!apiKey, '| FEEDBACK_EMAIL:', !!to)
    return NextResponse.json({ error: 'Service email non configuré' }, { status: 500 })
  }

  let message: string, email: string | undefined
  try {
    ;({ message, email } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Message requis' }, { status: 400 })
  }

  try {
    const resend = new Resend(apiKey)

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: '[ViroScan] Nouveau feedback',
      text: [
        `Expéditeur : ${email?.trim() || 'Anonyme'}`,
        '',
        message.trim(),
      ].join('\n'),
    })

    if (error) {
      console.error('[Feedback] Resend error:', JSON.stringify(error))
      return NextResponse.json({ error: 'Échec de l\'envoi', detail: error }, { status: 500 })
    }

    console.log('[Feedback] Email envoyé — id:', data?.id, '| from:', from, '| to:', to)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Feedback] Exception:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
