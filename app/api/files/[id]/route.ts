/**
 * GET    /api/files/[id]  → infos archive + arbre de fichiers
 * DELETE /api/files/[id]  → supprime l'archive (Blob + BDD)
 */

import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { archiveRepo } from '@/lib/db'
import { deleteArchive } from '@/lib/storage'

interface Params { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id }  = await params
    const archive = await archiveRepo.findById(id)

    if (!archive) {
      return NextResponse.json({ success: false, error: 'Archive introuvable' }, { status: 404 })
    }

    if (new Date(archive.expires_at) < new Date()) {
      await archiveRepo.delete(archive.id)
      await deleteArchive(archive.storage_path)
      return NextResponse.json({ success: false, error: 'Archive expirée' }, { status: 410 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id:         archive.id,
        name:       archive.name,
        type:       archive.type,
        size:       archive.size,
        fileCount:  archive.file_count,
        dirCount:   archive.dir_count,
        totalSize:  archive.size,
        uploadedAt: archive.uploaded_at,
        expiresAt:  archive.expires_at,
        tree:       JSON.parse(archive.tree_json),
      },
    })
  } catch (err) {
    console.error('[files/get]', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id }  = await params
    const archive = await archiveRepo.findById(id)

    if (!archive) {
      return NextResponse.json({ success: false, error: 'Archive introuvable' }, { status: 404 })
    }

    const auth      = await getAuth()
    const url       = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')

    const isOwner        = auth && archive.user_id === auth.userId
    const isSessionOwner = sessionId && archive.session_id === sessionId

    if (!isOwner && !isSessionOwner) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
    }

    // Supprimer en parallèle : Blob + BDD
    await Promise.all([
      deleteArchive(archive.storage_path),
      archiveRepo.delete(archive.id),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[files/delete]', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
