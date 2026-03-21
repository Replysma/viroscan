/**
 * GET /api/files?sessionId=xxx
 */

import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { archiveRepo } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const auth      = await getAuth()
    const url       = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')

    let archives
    if (auth) {
      archives = await archiveRepo.findByUser(auth.userId)
    } else if (sessionId) {
      archives = await archiveRepo.findBySession(sessionId)
    } else {
      return NextResponse.json({ success: true, data: [] })
    }

    return NextResponse.json({
      success: true,
      data: archives.map(a => ({
        id:         a.id,
        name:       a.name,
        type:       a.type,
        size:       a.size,
        fileCount:  a.file_count,
        uploadedAt: a.uploaded_at,
        expiresAt:  a.expires_at,
      })),
    })
  } catch (err) {
    console.error('[files/list]', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
