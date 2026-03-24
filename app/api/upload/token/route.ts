/**
 * POST /api/upload/token
 * Génère un token d'upload client-side Vercel Blob.
 * Contourne la limite 4.5 MB des fonctions serverless Vercel
 * en permettant l'upload direct depuis le navigateur vers le Blob.
 */

import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { getAuth } from '@/lib/auth'

export const runtime = 'nodejs'

const FREE_LIMIT    = parseInt(process.env.NEXT_PUBLIC_MAX_FREE_SIZE_MB    || '50')  * 1024 * 1024
const PREMIUM_LIMIT = parseInt(process.env.NEXT_PUBLIC_MAX_PREMIUM_SIZE_MB || '500') * 1024 * 1024

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody

  const auth = await getAuth()
  const plan = auth?.plan ?? 'free'
  const maxSize = plan === 'premium' ? PREMIUM_LIMIT : FREE_LIMIT

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          'application/zip',
          'application/x-rar-compressed',
          'application/x-rar',
          'application/octet-stream',
        ],
        maximumSizeInBytes: maxSize,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // Le traitement est déclenché manuellement depuis le client
        // via POST /api/upload/process après cette étape
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (err) {
    console.error('[upload/token]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur génération token' },
      { status: 400 }
    )
  }
}
