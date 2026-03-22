import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface FeedbackEntry {
  id:        string
  type:      'bug' | 'suggestion' | 'other'
  message:   string
  email:     string
  createdAt: string
}

const FEEDBACK_FILE = path.join(process.cwd(), 'data', 'feedback.json')

async function readFeedback(): Promise<FeedbackEntry[]> {
  try {
    const raw = await fs.readFile(FEEDBACK_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeFeedback(entries: FeedbackEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(FEEDBACK_FILE), { recursive: true })
  await fs.writeFile(FEEDBACK_FILE, JSON.stringify(entries, null, 2), 'utf-8')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, message, email } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    if (!['bug', 'suggestion', 'other'].includes(type)) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }

    const entry: FeedbackEntry = {
      id:        crypto.randomUUID(),
      type,
      message:   message.trim().slice(0, 2000),
      email:     typeof email === 'string' ? email.trim().slice(0, 200) : '',
      createdAt: new Date().toISOString(),
    }

    const entries = await readFeedback()
    entries.push(entry)
    await writeFeedback(entries)

    console.log('[Feedback]', entry.type, '-', entry.message.slice(0, 80))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Feedback] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const entries = await readFeedback()
    return NextResponse.json({ entries, count: entries.length })
  } catch {
    return NextResponse.json({ entries: [], count: 0 })
  }
}
